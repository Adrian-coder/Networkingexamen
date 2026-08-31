# Networking Certiport Practice

Site Vercel-ready pentru practica Networking. Banca inclusă în această versiune conține **328 de întrebări unice** obținute din cele două materiale furnizate (DOCX + PDF), împărțite în 5 capitole. Întrebările repetate identic între fișiere sau în interiorul aceleiași surse au fost eliminate. Întrebările și răspunsurile nu sunt incluse în JavaScript-ul public; sunt servite numai prin API după autentificare.

## Banca de întrebări

- total după deduplicare: **328**;
- din banca DOCX păstrate: **296**;
- întrebări noi păstrate din PDF după comparația cu DOCX: **32**;
- distribuție: Cap. 1 = 27, Cap. 2 = 87, Cap. 3 = 52, Cap. 4 = 124, Cap. 5 = 38.

Au fost excluse din adăugarea PDF itemii care erau deja prezenți în DOCX și câțiva itemi PDF cu răspuns neclar/incomplet. Au fost reparate și enunțurile care, în prima versiune a parserului, apăreau goale deoarece enunțul și variantele erau în același paragraf în DOCX.

## Funcții

- autentificare cu parolă prin cookie HttpOnly;
- 5 capitole și selectarea numărului de întrebări;
- mod examen cu 40 întrebări amestecate;
- single choice, multiple choice, Yes/No / True/False, matching, dropdown;
- imagini din întrebările originale;
- buton „Sari peste”, navigare pe numere și finalizare;
- procent final, punctaj pe subitemi, filtru pentru greșeli;
- răspunsul corect și explicația se afișează doar după trimiterea testului;
- responsive pentru telefon și laptop.

## Deploy pe Vercel

1. Urcă folderul într-un repository GitHub **PRIVATE**. Banca de întrebări este un fișier din proiect, deci un repository public ar face conținutul vizibil pe GitHub.
2. Importă repository-ul în Vercel.
3. În **Project → Settings → Environment Variables** adaugă:
   - `TEST_PASSWORD` = `teste123`;
   - `SESSION_SECRET` = un șir lung aleatoriu (minimum 32 caractere).
4. Redeploy.

Parola nu este scrisă în codul public al site-ului; este verificată server-side prin variabila `TEST_PASSWORD`.

## Observație de securitate

O parolă verificată doar în JavaScript nu protejează banca de întrebări: oricine ar putea vedea datele din sursa paginii. În această versiune, întrebările și cheia de răspuns sunt ținute în partea serverless (`data/` + `api/`), iar browserul primește cheia de răspuns numai după finalizarea testului.
