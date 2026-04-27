# Serva Gateway Plan

Ziel: GitBuck bleibt eine statische GitHub-Pages-Seite. Dynamische Site- und Asset-Generierung laeuft optional ueber Serva auf dem lokalen AI-PC, sicher erreichbar ueber einen Cloudflare Worker plus Tunnel.

## Aktueller Serva-Stand

Serva ist bereits ein passender lokaler Gateway-Kern. Im lokalen Checkout
`C:\Users\latentspace\serva` gibt es schon:

- `serva.server`: HTTP-Server mit Status, OpenAI-kompatibler Chat-Route, Anthropic-Adapter, Skills, Jobs und Generierung.
- `serva.skills`: Skill-Broker fuer lokale/private Modell-Apps.
- `POST /v1/serva/generate/{modality}`: standardisierte Skill-Generierung.
- `POST /v1/serva/jobs/generate/{modality}`: asynchrone Generation.
- ERNIE-Image-Beispiele: `examples/ernie_image_skill.py`, `examples/ernie-image.skill.json`, `examples/ernie-image-turbo.skill.json`.

Das heisst: Serva muss nicht neu erfunden werden. Es braucht einen kleinen
GitBuck-spezifischen Site-Rewrite-Adapter, einen sicheren Worker-Zugang und eine
saubere Asset-Normalisierung fuer die bestehende Image-Skill-Pipeline.

## Zielbild

- Browser ruft `POST /rewire` beim Cloudflare Worker auf.
- Worker authentifiziert Origin, limitiert Rate, normalisiert Prompt und leitet nur ein enges JSON an Serva weiter.
- Serva ist das zentrale Gateway auf dem AI-PC und bietet zusaetzlich zu seinen bestehenden `/v1/serva/*` Routen:
  - `GET /v1/serva/capabilities`
  - `POST /v1/serva/sites/gitbuck/rewire`
  - `POST /v1/serva/sites/gitbuck/assets`
- Lokales Code/Textmodell erzeugt nur ein erlaubtes Rewire-Schema, kein HTML/CSS/JS.
- ERNIE oder ein lokales Bildmodell erzeugt optionale Bitmap-Assets aus `assetPrompt`.
- Worker validiert die Antwort erneut, speichert die letzten 7 Versionen in KV und Assets optional in R2.

## Konkrete Serva-Aenderungen

1. Neues Modul `serva/site_rewrite.py`
   - Definiert das GitBuck-Rewire-Schema.
   - Validiert/kuerzt alle Textfelder.
   - Whitelistet `mode`, `palette`, `scene`, `layout`, `energy`.
   - Implementiert `score_prompt_fit(prompt, generation)` und `repair_generation(...)`.
   - Gibt nie HTML, CSS, JavaScript, Shell-Befehle, URLs oder Secrets aus.

2. Neue Server-Routen in `serva/server.py`
   - `GET /v1/serva/capabilities`: meldet vorhandene Modelle, aktive Image-Skills, Job-Support und Site-Rewrite-Support.
   - `POST /v1/serva/sites/gitbuck/rewire`: nimmt `{ prompt, mode, world, schemaVersion }`, ruft das lokale LLM ueber Servas bestehenden Scheduler/Chat-Backend, validiert und repariert die Antwort.
   - `POST /v1/serva/sites/gitbuck/assets`: nimmt `{ generationId, assetPrompt, width, height, style }`, ruft intern `execute_generation("image", ...)` oder den Job-Pfad und normalisiert das Ergebnis.

3. Auth fuer Site-Routen
   - Neue Env/Config: `SERVA_SITE_TOKEN`.
   - Worker sendet `Authorization: Bearer <token>` oder `X-Serva-Site-Token`.
   - Serva lehnt Site-Routen ohne Token ab.
   - Kein Browser-CORS noetig, weil nur der Worker Serva serverseitig aufruft.

4. Image-Asset-Normalisierung
   - Bestehende ERNIE-Image-Skills weiterverwenden.
   - Rueckgabe vereinheitlichen auf `{ ok, contentType, bytesBase64? , assetPath?, width?, height?, seed?, route }`.
   - Nur `image/png`, `image/jpeg`, `image/webp` akzeptieren.
   - Groessenlimit setzen, z. B. 8 MB fuer direkte Rueckgabe; groessere Assets nur per Datei/R2-kompatiblem Upload.

5. Optionaler Cloudflare-Helfer
   - Serva sollte Cloudflare nicht blind veraendern.
   - Besser: `serva cloudflare gitbuck --print-worker-env` oder Doku/Script, das die benoetigten Worker-Variablen und Tunnel-Schritte ausgibt.
   - Echter Deploy bleibt expliziter Operator-Schritt mit Wrangler.

6. Tests/Smokes
   - Unit-Tests fuer Schema, Prompt-Scoring, Repair-Entscheidung und Token-Auth.
   - Server-Smoke fuer `POST /v1/serva/sites/gitbuck/rewire`.
   - Skill-Smoke fuer `POST /v1/serva/sites/gitbuck/assets` mit ERNIE oder Mock-Skill.
   - Worker-Smoke: Serva-First, OpenRouter-Fallback, KV-Library bleibt bei 7 Eintraegen.

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

1. In Serva `serva/site_rewrite.py` anlegen und in `serva/server.py` verdrahten.
2. `GET /v1/serva/capabilities`, `POST /v1/serva/sites/gitbuck/rewire`, `POST /v1/serva/sites/gitbuck/assets` implementieren.
3. ERNIE-Image-Skill nicht neu bauen, sondern ueber bestehende Skill-/Generate-Pipeline nutzen.
4. Cloudflare Tunnel fuer Serva-Endpoint einrichten; Endpoint nicht direkt public listen.
5. Worker auf Serva-First umstellen, OpenRouter nur als optionalen Fallback behalten.
6. R2 fuer Assets anbinden und `assetUrl` als optionales validiertes Feld einfuehren.
7. Playwright-Tests: promptnahe Texte, Library mit 7 Eintraegen, Asset sichtbar, mobile kein Overflow.

## Agenten-Prompt

Du arbeitest an zwei lokalen Checkouts:

- GitBuck static site: `C:\Users\latentspace\starbuck100.github.io`
- Serva gateway: `C:\Users\latentspace\serva`

Ziel: GitBuck bleibt eine statische GitHub-Pages-Seite. Die dynamische Text- und Asset-Generierung soll optional ueber Serva auf dem lokalen AI-PC laufen. Public Entry bleibt nur der Cloudflare Worker. Keine Secrets committen.

Lies zuerst diese Dateien:

- `C:\Users\latentspace\starbuck100.github.io\worker\src\worker.js`
- `C:\Users\latentspace\starbuck100.github.io\script.js`
- `C:\Users\latentspace\starbuck100.github.io\SERVA_GATEWAY_PLAN.md`
- `C:\Users\latentspace\serva\README.md`
- `C:\Users\latentspace\serva\serva\server.py`
- `C:\Users\latentspace\serva\serva\skills.py`
- `C:\Users\latentspace\serva\docs\SKILL_PROTOCOL.md`
- `C:\Users\latentspace\serva\examples\ernie-image-turbo.skill.json`

Arbeitsumfang Serva:

1. Lege in Serva ein neues Modul `serva/site_rewrite.py` an.
   - Exportiere Funktionen fuer GitBuck-Schema, Text-Cleaning, Whitelists, Prompt-Term-Extraction, Prompt-Fit-Scoring, JSON-Parsing und Repair-Entscheidung.
   - Das Schema muss kompatibel zu GitBucks Worker-Schema bleiben: `mode`, `versionTitle`, `palette`, `scene`, `layout`, `energy`, `artDirection`, `assetPrompt`, `headline`, `lede`, `hudTitle`, `hudCopy`, `playTitle`, `playCopy`, `worldTitle`, `worldCopy`, `workKicker`, `workTitle`, vier `cards`, `systemsTitle`, `systemsCopy`, `proofTitle`, `proofCopy`, `manifesto`.
   - Erlaube keine vom Modell erzeugten HTML/CSS/JS/URLs/Shell-Befehle.

2. Erweitere `serva/server.py`.
   - `GET /v1/serva/capabilities`: Rueckgabe mit `site_rewrite: true`, verfuegbaren LLM-Modellen, Image-Skills und Job-Support.
   - `POST /v1/serva/sites/gitbuck/rewire`: nimmt `{ prompt, mode, world, schemaVersion }`.
   - Diese Route nutzt Servas vorhandenen LLM/Scheduler-Pfad, nicht einen separaten ungeplanten HTTP-Client.
   - Wenn die erste Modellantwort ungueltig oder zu generisch ist, fuehre einen lokalen Repair-Pass aus.
   - Rueckgabe: `{ ok: true, generation, model, repaired, promptScore }`.
   - Fehler: strukturierte JSON-Errors mit `type`, `message`, `retryable`.

3. Erweitere Serva fuer GitBuck-Assets.
   - `POST /v1/serva/sites/gitbuck/assets`: nimmt `{ generationId, assetPrompt, width, height, style }`.
   - Intern vorhandene Image-Skill-Pipeline verwenden: `execute_generation("image", payload)` oder Jobs, wenn die Generierung laenger dauern kann.
   - ERNIE-Image/Turbo-Skills aus den bestehenden Beispielen nutzen, nicht neu erfinden.
   - Rueckgabe normalisieren: `{ ok, contentType, assetUrl?, bytesBase64?, width?, height?, seed?, route }`.
   - Nur PNG/JPEG/WebP erlauben; Groesse begrenzen.

4. Auth/Sicherheit.
   - Fuege fuer die neuen Site-Routen `SERVA_SITE_TOKEN` oder passende Config hinzu.
   - Worker muss diesen Token serverseitig mitschicken.
   - Ohne Token: 401.
   - Keine Browser-CORS-Freigabe fuer Serva noetig; Browser spricht nie direkt mit Serva.
   - Serva bleibt lokal/private, Zugriff per Cloudflare Tunnel oder Cloudflare Access.

Arbeitsumfang GitBuck Worker:

5. Erweitere `worker/src/worker.js`.
   - Neue Env Vars: `SERVA_BASE_URL`, `SERVA_SITE_TOKEN`, optional `SERVA_TIMEOUT_MS`.
   - In `/rewire`: zuerst Serva `POST /v1/serva/sites/gitbuck/rewire` versuchen.
   - Wenn Serva nicht erreichbar oder ungueltig antwortet: OpenRouter-Fallback behalten.
   - Danach immer vorhandene Worker-Validierung, KV-Persistenz und Library-Antwort verwenden.
   - Keine Secrets ins Frontend.

6. Optional Asset-Pfad.
   - Nach erfolgreicher Rewire-Generation optional Serva Asset-Route callen.
   - Wenn ein Asset entsteht, in R2 speichern oder nur `assetPrompt` behalten, falls R2 nicht konfiguriert ist.
   - Fuege `assetUrl` nur als validiertes optionales Feld hinzu.

Cloudflare:

7. Richte den sicheren Zugang als dokumentierten Operator-Schritt ein.
   - Cloudflare Tunnel oder Access-Service-Token.
   - Worker-Env setzen, keine Secrets committen.
   - Serva soll Cloudflare nicht automatisch veraendern. Falls du einen Helfer baust, dann nur ein explizites Script oder eine CLI-Ausgabe, die die noetigen Wrangler-Kommandos zeigt.

Tests und Abnahme:

8. Serva pruefen:
   - `python -m py_compile serva/server.py serva/skills.py serva/site_rewrite.py`
   - Unit-Smokes fuer Schema/Scoring/Repair/Auth.
   - `GET /v1/serva/capabilities`
   - `POST /v1/serva/sites/gitbuck/rewire` mit einem Prompt wie `submarine OCR casino terminal sonar`.
   - Falls ERNIE laeuft: `POST /v1/serva/sites/gitbuck/assets`.

9. GitBuck pruefen:
   - `node --check script.js`
   - `node --check worker/src/worker.js`
   - `npx wrangler deploy` fuer den Worker.
   - Playwright Desktop und Mobile gegen lokal und live:
     - promptnahe Inhalte sichtbar,
     - Library zeigt maximal 7 Generationen,
     - gespeicherte Version laesst sich wieder anwenden,
     - kein horizontaler Overflow,
     - keine Console-Errors.

Lieferung:

- Commits getrennt nach Serva und GitBuck.
- Kurze Doku der neuen Env Vars, Tunnel-Setup, Start-Kommandos und Rollback.
- Klar markieren, ob Asset-Generierung live mit ERNIE getestet wurde oder nur strukturell/Mit Mock.
