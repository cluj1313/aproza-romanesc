# 🧺 Aprozar Românesc

Aplicație web (interfață mobilă) care conectează **producătorii locali români** cu **clienții** care vor produse 100% naturale românești.

## Funcționalități

- 🏪 **Card Dor de Casă** — lanț de magazine cu 300+ locații; găsește magazinul cel mai apropiat după locația ta (geolocație + distanță reală)
- 🌾 **Carduri de producători** — imagine de fundal cu ferma, avatar, distanță până la producător, mini-produse cu preț, butoane WhatsApp / telefon distincte, rating
- 📋 **Meniuri** — Acasă, Categorii, Cumpărături, Contul meu
- 🔍 **Căutare și filtre** — după termen liber, categorie, județ; calcul distanță (Haversine) bazat pe locație
- 🛒 **Coș de cumpărături** — adaugă rapid produse (+), modifică cantități (kg, L, buc…), total live
- 👤 **Conturi producător & client** — înregistrare, autentificare, roluri separate
- 📦 **Dashboard producător** — adaugă/editează/șterge produse cu poză din galerie, profil cu avatar + imagine de fundal
- 🌱 **Notificare „recoltare proaspătă”** — producătorul anunță clienții (nume produs, cantitate, preț); clienții văd în clopoțel 🔔
- 📢 **Anunțuri producător** — reduceri %, oferte, transport gratuit, concediu, altele (apar pe pagina fermei + notificare)
- ⭐ **Rating și recenzii** — clienții lasă review-uri (1–5 stele), producătorul poate răspunde
- 📷 **Poze din galerie** — upload de imagini (avatar, copertă, produse)
- 🗂️ **Categorii** — legume, fructe, lactate, cereale, panificație, miere și dulciuri, conserve, băuturi naturale, plante și ceaiuri ș.a.

## Rulare locală

Cerințe: **Node.js 18+**

```bash
npm install        # instalează dependențele
npm run seed       # date demonstrative (prima dată)
npm start          # http://localhost:3000
# sau: npm run dev  (repornește automat la modificări)
```

### Conturi demo

| Rol | Email | Parolă |
|---|---|---|
| Producător | `ferma1@exemplu.ro` | `parola123` |
| Client | `client@exemplu.ro` | `parola123` |

## Structură

```
├── server.js                 # Aplicația Express
├── db.js                     # SQLite + schema (producători, produse, magazine, recenzii, anunțuri, notificări)
├── seed.js                   # Date demonstrative
├── routes/
│   ├── auth.js               # Login / înregistrare
│   ├── catalog.js            # Acasă, categorii, căutare, pagina producătorului, recenzii
│   ├── producer.js           # Dashboard: produse, profil, anunțuri, notificări, răspuns recenzii
│   ├── stores.js             # Magazine Dor de Casă + API locație
│   ├── cart.js               # Coș de cumpărături (sesiune)
│   └── notifications.js      # Notificări clienți
├── middleware/               # Auth pe roluri, upload imagini (multer)
├── lib/                      # Constante (categorii, județe) + calcul distanță
├── views/                    # Șabloane EJS
└── public/                   # CSS, JS, uploads/
```

## Despre notificări

Notificările „recoltare proaspătă” și cele de anunț funcționează **în aplicație** (clopoțelul 🔔 cu număr necitit).
Pentru **push-uri reale pe telefon** (chiar și cu aplicația închisă) este necesar un serviciu de push (ex. Web Push + VAPID, sau FCM pentru mobile). Îți pot adăuga integrarea cu un astfel de serviciu când vrei să publici aplicația.

## Publicare pe web

1. Pune proiectul într-un repo Git (GitHub).
2. **Render.com** (recomandat, gratuit): New → Web Service → `Build: npm install`, `Start: npm start`.
   Sau **Railway**: New Project → Deploy from GitHub.
3. Setează variabila de mediu `SESSION_SECRET` cu o cheie lungă aleatorie.
4. Pentru scale reală multi-utilizator, migrarea bazei de date la PostgreSQL este recomandată.

## Note

- Pozele se încarcă din galeria telefonului și se salvează în `public/uploads/`.
- Distanțele afișate (producători, magazine) se calculează față de locația utilizatorului (browser → geolocație).
- Contrast corect: text închis pe fundal deschis, în toate ecranele.
