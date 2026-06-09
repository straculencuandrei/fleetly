# Fleetly — Aplicație de Management Parc Auto

**Fleetly** este o aplicație web full-stack pentru gestionarea unui parc auto, cu portal public pentru clienți (dealership) și panou intern pentru administratori și șoferi.

---

## 🛠️ Tehnologii folosite

| Strat | Tehnologie |
|---|---|
| **Frontend** | HTML5, CSS3 Vanilla, JavaScript ES6+ |
| **Backend** | Cloudflare Workers (Edge Runtime) |
| **Bază de date** | PostgreSQL (Render) via Cloudflare Hyperdrive |
| **Deploy** | Cloudflare Workers + Static Assets |
| **Runtime local** | Wrangler CLI |

---

## 📁 Structura proiectului

```
fleetly-main/
├── index.html              # Homepage public (flotă, filtrare, formular solicitare)
├── flota.html              # Pagina publică de flotă
├── servicii.html           # Pagina servicii oferite
├── avantaje.html           # Pagina avantaje dealership
├── noutati.html            # Blog / Noutăți
├── login.html              # Autentificare (admin, angajat, client)
├── clientpanel.html        # Panou management flotă (admin + angajat + client)
├── adminpanellogpage.html  # Log-uri admin
├── taskuri.html            # Panou taskuri interne
│
├── worker.js               # Cloudflare Worker — toate rutele /api/*
├── app.js                  # Logica SPA panoul de management
├── api.js                  # Configurare fetch base URL
├── public-cars.js          # Încărcare & afișare mașini publice
├── public-fallback.js      # Date fallback pentru pagina publică
├── mockData.js             # Date mock pentru dezvoltare locală
├── sync-public.js          # Script sincronizare fișiere în /public
│
├── style.css               # Stiluri pentru panoul intern
├── presentation.css        # Stiluri pentru paginile publice
│
├── scratch-init-db.js      # Script inițializare bază de date (schema)
├── scratch-init-db-all.js  # Script populare date inițiale
│
├── wrangler.jsonc          # Configurare Cloudflare Workers + Hyperdrive
├── package.json            # Dependențe Node.js
└── .gitignore
```

---

## 🔌 API Endpoints (`worker.js`)

Toate rutele sunt servite la `/api/*` de Cloudflare Worker și accesează PostgreSQL prin Hyperdrive.

### Autentificare
| Metodă | Rută | Descriere |
|---|---|---|
| `POST` | `/api/login` | Autentificare utilizator |
| `POST` | `/api/register` | Înregistrare cont nou (rol: client) |

### Mașini
| Metodă | Rută | Descriere |
|---|---|---|
| `GET` | `/api/cars/public` | Mașini listate public pe site |
| `GET` | `/api/cars/all` | Toate mașinile (panou admin) |
| `POST` | `/api/cars/register` | Adaugă mașină nouă |
| `POST` | `/api/cars/update` | Actualizează datele unei mașini |
| `POST` | `/api/cars/delete` | Șterge o mașină |

### Șoferi
| Metodă | Rută | Descriere |
|---|---|---|
| `GET` | `/api/drivers/all` | Listă șoferi |
| `POST` | `/api/drivers/add` | Adaugă șofer |
| `POST` | `/api/drivers/update` | Actualizează șofer |
| `POST` | `/api/drivers/delete` | Șterge șofer |

### Service
| Metodă | Rută | Descriere |
|---|---|---|
| `GET` | `/api/service/all` | Istoric service |
| `POST` | `/api/service/add` | Adaugă fișă service |
| `POST` | `/api/service/update` | Actualizează fișă service |
| `POST` | `/api/service/delete` | Șterge fișă service |

### Asigurări, Viniete, Anvelope
Aceleași operații CRUD la `/api/insurances/*`, `/api/vignettes/*`, `/api/tires/*`.

---

## 👤 Roluri utilizatori

| Rol | Acces |
|---|---|
| **admin** | Acces complet la toate datele parcului auto |
| **angajat** | Acces la date parc auto, fără gestiunea utilizatorilor |
| **client** | Vede doar mașina alocată lui, asigurările, vinietele și anvelopele proprii |

Rolul este stocat în `localStorage` după login și verificat în `app.js` la inițializare.

---

## ⚡ Instalare și rulare locală

### Cerințe
- [Node.js](https://nodejs.org/) v18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) v4+
- Cont Cloudflare cu Hyperdrive configurat

### Pași

```bash
# 1. Instalare dependențe
npm install

# 2. Configurare variabile de mediu locale
# Copiază .dev.vars.example în .dev.vars și completează valorile

# 3. Pornire server local (Worker + sync fișiere publice)
npm start

# Sau doar Worker-ul fără sync:
npm run dev
```

Aplicația rulează local la: **http://localhost:8787**

### Deploy în producție

```bash
npm run deploy
```

---

## 🗄️ Inițializare bază de date

Pentru a crea schema și a popula date inițiale în PostgreSQL:

```bash
# Creare tabele
node scratch-init-db.js

# Populare date de test
node scratch-init-db-all.js
```

---

## 📋 Tabele PostgreSQL

| Tabel | Descriere |
|---|---|
| `fleet_users` | Utilizatori autentificați (username, password_hash, rol, driver_id) |
| `masini` | Mașinile parcului auto |
| `soferi` | Șoferi și permisele lor |
| `service` | Istoricul intervențiilor service |
| `asigurari` | Polițe RCA / CASCO per mașină |
| `viniete` | Viniete per mașină și țară |
| `anvelope` | Seturi de anvelope per mașină |

---

## 🌐 Pagini publice

| Pagină | Descriere |
|---|---|
| `index.html` | Homepage cu flotă filtrabilă și formular solicitare test drive / finanțare |
| `flota.html` | Pagina dedicată flotei de mașini |
| `servicii.html` | Servicii oferite de dealership |
| `avantaje.html` | Avantajele colaborării cu Fleetly |
| `noutati.html` | Noutăți și articole |
| `login.html` | Autentificare / înregistrare cont |

---

## 🔒 Securitate

- Sesiunea este gestionată prin `localStorage` (statusLogat, rolUtilizator)
- Paginile protejate verifică sesiunea la inițializare și redirecționează la `login.html` dacă nu există
- Parolele sunt stocate ca hash în coloana `password_hash`
- Conexiunea la baza de date se face exclusiv prin Cloudflare Hyperdrive (nu există expunere directă a credențialelor)

---

## 📄 Licență

Proiect realizat pentru uz educațional și demonstrativ.
