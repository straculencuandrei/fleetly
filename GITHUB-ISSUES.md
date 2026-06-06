# Parc Auto SmartFleet — Cerințe & GitHub Issues

## Roluri utilizatori
- **Admin**: gestionează flota, angajații, vede toate rezervările și rapoartele
- **Angajat**: procesează rezervări, verifică disponibilitate, gestionează clienți
- **Client**: se înregistrează, caută mașini, face rezervări

## 🔐 Autentificare & Roluri

### Issue #1 — Înregistrare cont client
- Câmpuri: Nume (max 50 char), Prenume (max 50 char), Email (unic, max 100 char), Parolă (min 8 char, cel puțin o cifră), Telefon (format RO: 07xxxxxxxx)
- La submit: validare client-side + server-side
- Email de confirmare trimis după înregistrare
- Dacă emailul există deja → mesaj de eroare: `Adresa de email este deja folosită.`

### Issue #2 — Autentificare (Login)
- Câmpuri: Email + Parolă
- După login, redirecționare în funcție de rol:
  - Admin → Dashboard Admin
  - Angajat → Dashboard Angajat
  - Client → Pagina principală
- La credențiale greșite → mesaj: `Email sau parolă incorectă.`
- Buton `Am uitat parola` → flow de resetare prin email

### Issue #3 — Gestionare roluri (Admin)
- Adminul poate schimba rolul unui utilizator (client → angajat sau invers)
- Adminul poate dezactiva/reactiva un cont
- Un cont dezactivat nu mai poate face login → mesaj: `Contul tău a fost dezactivat. Contactează-ne.`

## 🚘 Gestionare Flotă (Admin & Angajat)

### Issue #4 — Adăugare mașină în flotă
- Câmpuri: Marcă (max 30 char), Model (max 30 char), An fabricație (4 cifre, min 2000), Nr. înmatriculare (format RO, unic), Categorie (Economică / Standard / SUV / Premium), Preț/zi (număr pozitiv, max 9999 RON), Număr locuri (2–9), Transmisie (Manuală / Automată), Combustibil (Benzină / Diesel / Electric / Hibrid), Poze (min 1, max 5 imagini, max 5MB/poză)
- Mașina nou adăugată are statusul `Disponibilă` by default

### Issue #5 — Editare / Ștergere mașină
- Orice câmp din Issue #4 poate fi editat
- O mașină nu poate fi ștearsă dacă are rezervări active → mesaj de eroare
- Ștergerea este logică (soft delete); mașina nu apare în liste dar datele se păstrează

### Issue #6 — Listă mașini (Admin/Angajat)
- Tabel cu toate mașinile: marcă, model, nr. înmatriculare, categorie, status, preț/zi
- Filtrare după: categorie, status (Disponibilă / Închiriată / În mentenanță)
- Căutare după nr. înmatriculare sau model

## 📅 Rezervări

### Issue #7 — Căutare mașini disponibile (Client)
- Clientul selectează: Dată început, Dată sfârșit, Categorie (opțional)
- Data început ≥ ziua de mâine
- Data sfârșit > Data început
- Durata maximă a unei rezervări: 30 de zile
- Se afișează doar mașinile disponibile în intervalul ales

### Issue #8 — Creare rezervare (Client)
- Clientul selectează o mașină din rezultate și apasă `Rezervă`
- Se afișează sumar: mașină, interval, preț total calculat automat (nr. zile × preț/zi)
- Clientul confirmă → rezervarea primește statusul `În așteptare`
- Clientul primește email de confirmare cu detaliile rezervării

### Issue #9 — Aprobare / Respingere rezervare (Angajat)
- Angajatul vede toate rezervările cu statusul `În așteptare`
- Poate `Aprobă` → status devine `Confirmată`, clientul primește email
- Poate `Respinge` (cu motiv obligatoriu, max 200 char) → status `Anulată`, clientul primește email cu motivul

### Issue #10 — Anulare rezervare (Client)
- Clientul poate anula o rezervare `În așteptare` sau `Confirmată`
- Anularea este posibilă doar cu cel puțin 24h înainte de data de start
- După anulare → status `Anulată de client`

### Issue #11 — Finalizare rezervare (Angajat)
- Angajatul marchează o rezervare ca `Finalizată` după returnarea mașinii
- Se poate adăuga o notă opțională (max 300 char), ex: daune constatate

## 📊 Dashboard & Rapoarte (Admin)

### Issue #12 — Dashboard Admin
- Carduri de sumar: Total mașini, Mașini disponibile azi, Rezervări active, Venit luna curentă
- Grafic rezervări pe ultimele 30 de zile

### Issue #13 — Istoric rezervări
- Admin și Angajat văd toate rezervările, cu filtre după: status, perioadă, mașină
- Clientul vede doar propriile rezervări

## ✅ Reguli generale de comportament (non-funcționale)
- Toate câmpurile obligatorii afișează `*` și mesaj de eroare clar dacă sunt lăsate goale
- Sesiunea expiră după 60 de minute de inactivitate
- Aplicația trebuie să fie responsivă (funcționează pe mobil și desktop)
- Mesajele de eroare sunt întotdeauna în limba română
