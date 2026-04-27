# Serva Gateway Plan

Ziel: GitBuck bleibt eine statische GitHub-Pages-Seite. Dynamische Site- und Asset-Generierung laeuft optional ueber Serva auf dem lokalen AI-PC, sicher erreichbar ueber einen Cloudflare Worker plus Tunnel.

## Zielbild

- Browser ruft `POST /rewire` beim Cloudflare Worker auf.
- Worker authentifiziert Origin, limitiert Rate, normalisiert Prompt und leitet nur ein enges JSON an Serva weiter.
- Serva ist das zentrale Gateway auf dem AI-PC und bietet:
  - `GET /health`
  - `GET /capabilities`
  - `POST /generate/site`
  - `POST /generate/image`
- Lokales Code/Textmodell erzeugt nur ein erlaubtes Rewire-Schema, kein HTML/CSS/JS.
- ERNIE oder ein lokales Bildmodell erzeugt optionale Bitmap-Assets aus `assetPrompt`.
- Worker validiert die Antwort erneut, speichert die letzten 7 Versionen in KV und Assets optional in R2.

## Sicherheitsgrenzen

- Kein Public-Zugriff direkt auf Serva; nur Cloudflare Tunnel oder Access-Service-Token.
- Worker nutzt HMAC- oder mTLS-aehnliches Shared-Secret zum Serva-Gateway.
- Prompts werden vor Weiterleitung gekuerzt und als Daten behandelt.
- Serva darf keine Shell-Kommandos aus User-Prompts ausfuehren.
- Antwortformat ist feste JSON-Schema-Ausgabe mit Whitelists fuer Mode, Palette, Layout, Energy und Scene.
- Zweiter Pass: Wenn Pflichtfelder fehlen, Prompt-Begriffe nicht auftauchen oder Text zu generisch ist, wird lokal ein Repair-Call gestartet.
- Browser akzeptiert weiterhin nur textContent, CSS-Variablen und bekannte Three.js-Presets.
- Assets werden auf Format, Groesse und MIME geprueft; kein SVG aus Modellen, keine aktiven Inhalte.
- Timeouts, Tageslimit, IP/Origin-Limits und Audit-Log in Serva.

## Persistenz

- Worker KV: letzte 7 Rewire-Versionen je Site.
- Optional R2: generierte Raster-Assets mit `generationId`.
- Frontend: Library zeigt Versionstitel, Prompt, Zeit, Presets und kann jede Version wieder in den offenen Tab laden.

## Minimaler Implementierungsplan

1. Serva lokal um `site_rewire` und `image_asset` Provider erweitern.
2. JSON-Schema in Serva und Worker spiegeln; Worker bleibt letzte Validierungsinstanz.
3. Cloudflare Tunnel fuer Serva-Endpoint einrichten; Endpoint nicht oeffentlich listen.
4. Worker auf Serva-First umstellen, OpenRouter nur als optionalen Fallback behalten.
5. R2 fuer Assets anbinden und `assetUrl` als optionales validiertes Feld einfuehren.
6. Playwright-Tests: promptnahe Texte, Library mit 7 Eintraegen, Asset sichtbar, mobile kein Overflow.

## Agenten-Prompt

Du arbeitest in `C:\Users\latentspace\starbuck100.github.io` und am lokalen Serva-Projekt. Baue Serva als zentrales lokales Gateway fuer die GitBuck-Rewrite-Funktion, aber halte GitBuck selbst statisch.

Anforderungen:
- Finde zuerst das lokale Serva-Repo, lies README/Konfiguration und identifiziere die existierenden Provider fuer lokale Text- und Bildmodelle.
- Implementiere in Serva `GET /health`, `GET /capabilities`, `POST /generate/site`, `POST /generate/image`.
- `POST /generate/site` nimmt `{ prompt, mode, world, schemaVersion }` an und gibt nur das bestehende GitBuck-Rewire-Schema zurueck. Kein HTML, CSS, JS, URLs oder Toolbefehle.
- `POST /generate/image` nimmt den validierten `assetPrompt` an und gibt ein geprueftes Raster-Asset zurueck oder speichert es lokal/R2-kompatibel.
- Sichere Serva hinter Cloudflare Tunnel oder Access ab. Der Worker darf der einzige Public Entry sein.
- Erweitere den Worker so, dass er Serva bevorzugt, OpenRouter optional fallbackt, alle Antworten validiert, generische Antworten repariert und die letzten 7 Generationen in KV speichert.
- Fuege Tests hinzu: Worker-Schema, Prompt-Nahe-Scoring, Repair-Pass, KV-Library, Browser-Flow Desktop/Mobile.
- Keine Secrets committen. Dokumentiere Setup, Env Vars, Tunnel und Rollback knapp.
