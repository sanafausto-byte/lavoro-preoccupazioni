# Lavoro, cosa ti preoccupa? — sito per studenti e formatore

Sito autonomo per condurre una sessione di orientamento: i partecipanti rispondono anonimamente, i temi ricorrenti vengono conteggiati e proiettati; i testi integrali sono visibili soltanto al formatore finché non approva singole citazioni.

## Contatti nel footer
- Email: info@faustosana.it
- Web: https://www.faustosana.it/
- LinkedIn: https://www.linkedin.com/in/fausto-sana/

## Installazione GitHub + Cloudflare Workers + D1

1. Crea un repository GitHub, ad esempio `lavoro-preoccupazioni`, carica **tutti i file** del progetto mantenendo le cartelle `public/` e `migrations/`.
2. Su Cloudflare accedi all'account. Installa Node.js sul computer se necessario. Nel terminale della cartella esegui `npm install` e `npx wrangler login`.
3. Crea il database D1 da terminale con `npx wrangler d1 create lavoro-preoccupazioni`. Copia il `database_id` restituito e sostituisci `INSERISCI_QUI_DATABASE_ID` nel file `wrangler.toml`.
4. Applica la migrazione al database remoto: `npm run db:remote`.
5. Scegli una password lunga e univoca per il formatore. Impostala come segreto Cloudflare con `npx wrangler secret put ADMIN_PASSWORD`. **Non inserirla mai in GitHub né in un file pubblico.** L'email formatore è configurata in `wrangler.toml` (`ADMIN_EMAIL`), inizialmente `info@faustosana.it`; cambia il valore se necessario.
6. Imposta un secondo segreto casuale non pubblicato: `npx wrangler secret put DEVICE_SALT`. Serve a pseudonimizzare il dispositivo per limitare a tre le risposte per sessione.
7. Pubblica il Worker con `npm run deploy`. Wrangler restituisce l'indirizzo pubblico `https://...workers.dev`.
8. Accedi all'area Formatore con l'email configurata e la password segreta; crea la sessione, mostra il QR, raccogli le risposte e apri la Proiezione. Per ogni nuova classe, clicca **Avvia una nuova sessione**.

### Test locale
- `npm run db:local` e `npm run dev` dopo aver creato/configurato il database in `wrangler.toml`.
- I segreti per il test locale possono essere in un file `.dev.vars` **non caricato su GitHub**. Esempio: `ADMIN_PASSWORD=...`, `DEVICE_SALT=...`. Non sono inclusi nel progetto.

### Che cosa fa
- Risposte di 20–300 caratteri, senza nome o email; fino a tre risposte per identificatore locale del browser per sessione; prevenzione duplicati per dispositivo.
- Classificazione deterministica per espressioni/parole chiave in 10 temi + Altri temi, modificabile dal formatore. Non richiede servizi AI esterni e non interpreta tutte le sfumature del linguaggio.
- Grafici, percentuali sulle risposte visibili, nuvola di temi e proiezione aggiornati tramite polling ogni 5 secondi.
- Il formatore può nascondere le risposte, approvare singole citazioni per la proiezione, correggere i temi, chiudere/riaprire la sessione, esportare CSV, cancellare una sessione.
- Backend: Cloudflare Worker; persistenza reale: Cloudflare D1; login protetto da segreto server-side e cookie HttpOnly.

### Privacy, sicurezza e limiti da conoscere
- Le risposte possono contenere dati personali inseriti spontaneamente; il form invita a non farlo e blocca email/telefoni comuni, ma questo filtro non è infallibile. Prima di usare lo strumento con studenti, predisponi informativa privacy e definisci tempi di conservazione; cancella le sessioni quando non necessarie.
- D1 conserva un hash pseudonimo del dispositivo **per singola sessione**, non nomi o email degli studenti. Infrastrutture e access log tecnici possono comunque trattare IP secondo le loro condizioni.
- Le citazioni approvate appaiono pubblicamente a chi conosce il codice della sessione: non approvare contenuti riconoscibili o sensibili.
- Il codice della stanza è un link di accesso, non un'identità verificata; chi lo conosce può inviare risposte finché la sessione è aperta.
- Il limite di tre risposte è per identificatore browser: cancellando i dati locali o usando un altro browser si può aggirare. Non è un sistema anti-abuso forte.
- L'endpoint di login ha bisogno di rate limiting a livello Cloudflare WAF prima di un impiego esteso su Internet; la versione fornita non include protezione bruteforce completa.
- Il servizio QR utilizza `api.qrserver.com` per generare l'immagine: il link di accesso alla stanza viene comunicato a questo fornitore. Per ambienti con requisiti elevati di riservatezza, sostituiscilo con generazione QR locale.
- Il sito usa Google Fonts per Lato: la pagina contatta Google Fonts; per evitare richieste esterne, usa una versione Lato caricata in locale con relativa licenza.
- Questo progetto non è stato distribuito sull'account Cloudflare: sono necessari gli step di installazione indicati sopra. Non è ancora verificato in ambiente di produzione.
