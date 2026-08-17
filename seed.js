const bcrypt = require('bcryptjs');
const db = require('./db');
const { CATEGORIES, CATEGORY_NAMES } = require('./lib/constants');

const PASSWORD = bcrypt.hashSync('parola123', 10);
const ADMIN_PHONE = '0770148119';

const PRODUCERS = [
  {
    name: 'Ferma Bio Vâlcele', owner_name: 'Gheorghe Ionescu', county: 'Argeș', locality: 'com. Vâlcele',
    phone: '0721 234 567', whatsapp: '0721234567', lat: 44.9667, lng: 24.7667,
    avatar_url: '/images/farmer1.jpg',
    cover_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=60',
    description: 'Fermă de familie din Argeș. Cultivăm legume bio în sere naturale, fără pesticide și fără compromisuri — gustul copilăriei de la țară.',
    products: [
      ['Roșii cherry de grădină', 'Culese azi dimineață, coapte la soare.', 9.00, 'kg', 'Legume', 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&q=60'],
      ['Castraveți proaspeți', 'Crocant și aromat, fără tratamente chimice.', 6.50, 'kg', 'Legume', 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=400&q=60'],
      ['Salată verde', 'Salată de casă, crocantă și proaspătă.', 3.00, 'căpățână', 'Legume', 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&q=60'],
      ['Cartofi noi', 'Cartofi de Vâlcele, recolta proaspătă.', 3.50, 'kg', 'Legume', 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=60']
    ]
  },
  {
    name: 'Stupina Haiducilor', owner_name: 'Maria Trif', county: 'Alba', locality: 'Munții Apuseni',
    phone: '0745 111 222', whatsapp: '0745111222', lat: 46.4000, lng: 23.2000,
    avatar_url: '/images/farmer2.jpg',
    cover_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=60',
    description: 'Apicultură tradițională la peste 800 m altitudine în Munții Apuseni. Miere polifloră, de salcâm, propolis — naturale 100%.',
    products: [
      ['Miere de salcâm', 'Miere de salcâm 100% naturală, dulce și fină.', 28.00, 'kg', 'Miere și dulciuri', 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&q=60'],
      ['Miere polifloră', 'Amestec de flori de munte, aromă intensă.', 24.00, 'kg', 'Miere și dulciuri', 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=400&q=60'],
      ['Polen proaspăt', 'Polen de albine cules de curând, 250g.', 35.00, 'g', 'Miere și dulciuri', 'https://images.unsplash.com/photo-1587049352929-cc741d2d2c7c?w=400&q=60']
    ]
  },
  {
    name: 'Lăptăria din Sadu', owner_name: 'Andrei Munteanu', county: 'Sibiu', locality: 'Sadu',
    phone: '0733 444 555', whatsapp: '0733444555', lat: 45.6667, lng: 24.1833,
    avatar_url: '/images/farmer3.jpg',
    cover_url: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=800&q=60',
    description: 'Produse lactate de la vaci crescute în curte, hrănite cu fân de munte. Brânzeturi maturate în peșteră, la tradiție.',
    products: [
      ['Caș de casă', 'Caș dulce proaspăt, din laptele de dimineață.', 25.00, 'kg', 'Lactate', 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&q=60'],
      ['Telemea de oaie', 'Telemea maturată, din lapte de oaie.', 38.00, 'kg', 'Lactate', 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&q=60'],
      ['Smântână fermentată', 'Smântână groasă și gustoasă.', 15.00, '500g', 'Lactate', 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=60']
    ]
  },
  {
    name: 'Moara de Piatră', owner_name: 'Vasile Preda', county: 'Tulcea', locality: 'Babadag',
    phone: '0722 333 444', whatsapp: '0722333444', lat: 44.9000, lng: 28.7167,
    avatar_url: '/images/farmer4.jpg',
    cover_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=60',
    description: 'Pâine și cozonaci copți pe piatră, cu făină de la mori locale din Dobrogea. Rețete vechi de familie.',
    products: [
      ['Pâine de casă', 'Pâine cu maia, coaptă în cuptor pe piatră.', 7.00, 'kg', 'Panificație', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=60'],
      ['Cozonac cu nucă', 'Cozonac pufos cu nucă și cacao.', 35.00, 'buc', 'Panificație', 'https://images.unsplash.com/photo-1539294911531-1f9d47c02a39?w=400&q=60'],
      ['Plăcintă cu brânză', 'Plăcintă fragedă cu brânză de vaci și mărar.', 12.00, 'buc', 'Panificație', 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=400&q=60']
    ]
  },
  {
    name: 'Gospodăria lui Mitu', owner_name: 'Mitu Dragomir', county: 'Ialomița', locality: 'Fetești',
    phone: '0766 555 666', whatsapp: '0766555666', lat: 44.4121, lng: 27.8311,
    avatar_url: '/images/farmer5.jpg',
    cover_url: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=800&q=60',
    description: 'Ouă de țară și pui crescuți în aer liber în câmpia Bărăganului. Hrană naturală, fără acceleratori de creștere.',
    products: [
      ['Ouă de țară', 'Ouă de găini crescute în aer liber, coajă rezistentă.', 1.20, 'buc', 'Carne și ouă', 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&q=60'],
      ['Pui de casă', 'Pui crescuți natural, gust autentic de țară.', 18.00, 'kg', 'Carne și ouă', 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&q=60']
    ]
  },
  {
    name: 'Raiul Plantei', owner_name: 'Elena Dobre', county: 'Cluj', locality: 'Gârbău',
    phone: '0777 888 999', whatsapp: '0777888999', lat: 46.8333, lng: 23.3333,
    avatar_url: '/images/farmer6.jpg',
    cover_url: 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&q=60',
    description: 'Cultivăm plante aromatice și ceaiuri în județul Cluj, recoltate manual și uscate natural, la soare.',
    products: [
      ['Ceai de tei', 'Floare de tei uscată, recoltată manual.', 12.00, '100g', 'Plante și ceaiuri', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&q=60'],
      ['Levănțică uscată', 'Levănțică de Gârbău, parfumată și curată.', 15.00, '100g', 'Plante și ceaiuri', 'https://images.unsplash.com/photo-1564540586988-aa4e53c7a87f?w=400&q=60'],
      ['Gemm de zmeură', 'Gem natural de zmeură, fără conservanți.', 18.00, 'borcan', 'Conserve și murături', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=60']
    ]
  },
  {
    name: 'Livezile Voinești', owner_name: 'Ion Dinu', county: 'Dâmbovița', locality: 'Voinești',
    phone: '0788 222 111', whatsapp: '0788222111', lat: 45.0833, lng: 25.2500,
    avatar_url: '/images/farmer7.jpg',
    cover_url: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&q=60',
    description: 'Livezi tradiționale de mere Jonathan și pere la Voinești, județul Dâmbovița. Fructe culese copt în pom.',
    products: [
      ['Mere Jonathan de Voinești', 'Mere aromate, culese copt în pom.', 8.50, 'kg', 'Fructe', 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&q=60'],
      ['Pere de Voinești', 'Pere zemoase, de sezon.', 9.00, 'kg', 'Fructe', 'https://images.unsplash.com/photo-1512805149297-27931adc64e3?w=400&q=60'],
      ['Suc natural de mere', 'Suc de mere 100% natural, nepasteurizat.', 12.00, 'L', 'Băuturi naturale', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=60']
    ]
  }
];

const STORES = [
  ['Dor de Casă', 'București', 'București', 'Calea Victoriei nr. 34', '0213 100 100', 44.4325, 26.0980],
  ['Dor de Casă', 'Cluj', 'Cluj-Napoca', 'Bd. Eroilor nr. 12', '0264 111 111', 46.7712, 23.6236],
  ['Dor de Casă', 'Brașov', 'Brașov', 'Str. Republicii nr. 20', '0268 222 222', 45.6576, 25.6010],
  ['Dor de Casă', 'Iași', 'Iași', 'Bd. Ștefan cel Mare nr. 8', '0232 333 333', 47.1585, 27.6014],
  ['Dor de Casă', 'Timiș', 'Timișoara', 'Piața Victoriei nr. 5', '0256 444 444', 45.7489, 21.2087],
  ['Dor de Casă', 'Constanța', 'Constanța', 'Bd. Tomis nr. 61', '0241 555 555', 44.1598, 28.6348],
  ['Dor de Casă', 'Sibiu', 'Sibiu', 'Piața Mare nr. 3', '0269 666 666', 45.7983, 24.1256],
  ['Dor de Casă', 'Prahova', 'Ploiești', 'Bd. Independenței nr. 27', '0244 777 777', 44.9367, 26.0157],
  ['Dor de Casă', 'Argeș', 'Pitești', 'Bd. Republicii nr. 14', '0248 888 888', 44.8565, 24.8692],
  ['Dor de Casă', 'Iași', 'Pașcani', 'Str. Ștefan cel Mare nr. 41', '0232 999 999', 47.2470, 26.7224],
  ['Dor de Casă', 'Bihor', 'Oradea', 'Str. Republicii nr. 22', '0259 100 100', 47.0465, 21.9189],
  ['Dor de Casă', 'Suceava', 'Suceava', 'Str. Ștefan cel Mare nr. 55', '0230 200 200', 47.6514, 26.2557]
];

async function seed() {
  const existing = await db.prepare('SELECT COUNT(*) AS c FROM producers').get();
  if (existing.c > 0) {
    console.log('Baza de date conține deja date. Seed sărit.');
    return;
  }

  const customerResult = await db.prepare('INSERT INTO users (role, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)')
    .run('customer', 'Ion Popescu', 'client@exemplu.ro', '0720123123', PASSWORD);
  const customerId = customerResult.lastInsertRowid;

  const customer2Result = await db.prepare('INSERT INTO users (role, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)')
    .run('customer', 'Ana Vasilescu', 'ana@exemplu.ro', '0740123123', PASSWORD);
  const customer2Id = customer2Result.lastInsertRowid;

  for (const s of STORES) {
    await db.prepare('INSERT INTO stores (name, county, city, address, phone, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?)').run(...s);
  }

  for (let i = 0; i < PRODUCERS.length; i++) {
    const p = PRODUCERS[i];
    const userResult = await db.prepare('INSERT INTO users (role, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)')
      .run('producer', p.name, `ferma${i + 1}@exemplu.ro`, p.phone.replace(/\s/g, ''), PASSWORD);
    const userId = userResult.lastInsertRowid;

    const producerResult = await db.prepare(`
      INSERT INTO producers (user_id, name, owner_name, description, county, locality, phone, whatsapp, lat, lng, avatar_url, cover_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, p.name, p.owner_name, p.description, p.county, p.locality, p.phone, p.whatsapp,
      p.lat, p.lng, p.avatar_url, p.cover_url);
    const producerId = producerResult.lastInsertRowid;

    for (const pr of p.products) {
      await db.prepare('INSERT INTO products (producer_id, name, description, price, unit, category, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(producerId, ...pr);
    }

    if (i === 0) {
      await db.prepare('INSERT INTO announcements (producer_id, type, title, message, percent) VALUES (?, ?, ?, ?, ?)')
        .run(producerId, 'offer', 'Coș de legume proaspete', 'Coș cu roșii, castraveți și salată — doar 15 lei!', null);
      await db.prepare('INSERT INTO announcements (producer_id, type, title, message, percent) VALUES (?, ?, ?, ?, ?)')
        .run(producerId, 'free_shipping', 'Transport gratuit', 'Transport gratuit pentru comenzi peste 50 lei în Vâlcele și împrejurimi.', null);
      await db.prepare('INSERT INTO notifications (producer_id, target_user_id, type, title, message) VALUES (?, ?, ?, ?, ?)')
        .run(producerId, customerId, 'fresh', '🌱 Recoltă proaspătă: Roșii cherry de grădină', 'Roșii cherry de grădină — 9,00 lei/kg. Culese azi dimineață! Disponibil la Ferma Bio Vâlcele.');
      await db.prepare('INSERT INTO notifications (producer_id, target_user_id, type, title, message) VALUES (?, ?, ?, ?, ?)')
        .run(producerId, customer2Id, 'fresh', '🌱 Recoltă proaspătă: Roșii cherry de grădină', 'Roșii cherry de grădină — 9,00 lei/kg. Culese azi dimineață! Disponibil la Ferma Bio Vâlcele.');
      await db.prepare('INSERT INTO reviews (producer_id, user_id, rating, comment) VALUES (?, ?, ?, ?)')
        .run(producerId, customerId, 5, 'Cele mai bune roșii din zonă! Se simte gustul adevărat de grădină. Recomand cu drag.');
      await db.prepare('INSERT INTO reviews (producer_id, user_id, rating, comment) VALUES (?, ?, ?, ?)')
        .run(producerId, customer2Id, 4, 'Legume foarte proaspete și oameni de treabă. Doar coada la preluare a fost puțin mai lungă.');
      await db.prepare("UPDATE reviews SET reply = ?, reply_at = NOW() WHERE producer_id = ?")
        .run('Mulțumim frumos pentru recenzii! Ne bucurăm că vă place. Vom mai angaja ajutor la preluare. 😊', producerId);
    }
    if (i === 1) {
      await db.prepare('INSERT INTO announcements (producer_id, type, title, message, percent) VALUES (?, ?, ?, ?, ?)')
        .run(producerId, 'discount', 'Reducere la mierea polifloră', 'Miere polifloră cu 20% reducere în această săptămână!', 20);
      await db.prepare('INSERT INTO reviews (producer_id, user_id, rating, comment) VALUES (?, ?, ?, ?)')
        .run(producerId, customerId, 5, 'Mierea este extraordinară, se simte că e culeasă din munte. Voi comanda din nou!');
      await db.prepare('INSERT INTO reviews (producer_id, user_id, rating, comment) VALUES (?, ?, ?, ?)')
        .run(producerId, customer2Id, 5, 'Cel mai bun polen pe care l-am gustat. Livrare rapidă și ambalaj impecabil.');
    }
    if (i === 3) {
      await db.prepare('INSERT INTO reviews (producer_id, user_id, rating, comment) VALUES (?, ?, ?, ?)')
        .run(producerId, customer2Id, 5, 'Cozonacul e ca la bunica! Pâinea pe piatră e superbă.');
    }
  }

  console.log(`Seed finalizat: ${PRODUCERS.length} producători, ${STORES.length} magazine Dor de Casă, 4 recenzii, 3 anunțuri, 2 notificări.`);
  console.log('Conturi demo: ferma1@exemplu.ro / client@exemplu.ro · parola: parola123');
}

const EXTRA_PRODUCTS = [
  ['Moara de Piatră', 'Făină integrală de grâu', 'Măcinată la piatră, fără aditivi, ideală pentru pâine de casă.', 5.50, 'kg', 'Cereale', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=60'],
  ['Moara de Piatră', 'Mălai de porumb', 'Mălai fin, din porumb românesc, pentru mămăligă și mălai dulce.', 6.00, 'kg', 'Cereale', 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=60'],
  ['Gospodăria lui Mitu', 'Ouă de prepeliță', 'Ouă mici de prepeliță, bogate în nutrienți, crescute în aer liber.', 2.50, 'buc', 'Altele', 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&q=60'],
  ['Gospodăria lui Mitu', 'Zacuscă de casă', 'Zacuscă de vinete cu gogoșari, rețetă de familie, fără conservanți.', 16.00, 'borcan', 'Conserve și murături', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=60'],
  ['Raiul Plantei', 'Sare de baie cu lavandă', 'Sare naturală cu lavandă, pentru relaxare, făcută manual.', 14.00, 'pachet', 'Altele', 'https://images.unsplash.com/photo-1564540586988-aa4e53c7a87f?w=400&q=60']
];

async function seedMissingProducts() {
  let added = 0;
  for (const [producerName, name, description, price, unit, category, image_url] of EXTRA_PRODUCTS) {
    const exists = await db.prepare('SELECT id FROM products WHERE name = ?').get(name);
    if (exists) continue;
    const producer = await db.prepare('SELECT id FROM producers WHERE name = ?').get(producerName);
    if (!producer) continue;
    await db.prepare('INSERT INTO products (producer_id, name, description, price, unit, category, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(producer.id, name, description, price, unit, category, image_url);
    added++;
  }
  if (added) console.log(`Produse demo completate: +${added}`);
}

seed().catch(err => console.error('Seed error:', err.message));
seedMissingProducts().catch(err => console.error('SeedMissing error:', err.message));
seedAdmin().catch(err => console.error('SeedAdmin error:', err.message));
seedMocks().catch(err => console.error('SeedMocks error:', err.message));

async function seedAdmin() {
  const admin = await db.prepare('SELECT id, is_admin FROM users WHERE phone = ?').get(ADMIN_PHONE);
  if (admin && !admin.is_admin) {
    await db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(admin.id);
    console.log('Admin setat pentru ' + ADMIN_PHONE);
  }
}

const MOCK_TOWNS = [
  { county: 'Cluj', locality: 'Feleacu', lat: 46.72, lng: 23.62 },
  { county: 'Bihor', locality: 'Finiș', lat: 46.63, lng: 22.31 },
  { county: 'Arad', locality: 'Curtici', lat: 46.34, lng: 21.31 },
  { county: 'Timiș', locality: 'Făget', lat: 45.84, lng: 22.18 },
  { county: 'Sibiu', locality: 'Cisnădie', lat: 45.71, lng: 24.15 },
  { county: 'Brașov', locality: 'Râșnov', lat: 45.59, lng: 25.46 },
  { county: 'Mureș', locality: 'Sighișoara', lat: 46.22, lng: 24.79 },
  { county: 'Alba', locality: 'Sebeș', lat: 45.93, lng: 23.57 },
  { county: 'Maramureș', locality: 'Sighet', lat: 47.93, lng: 23.89 },
  { county: 'Suceava', locality: 'Gura Humorului', lat: 47.55, lng: 25.89 },
  { county: 'Neamț', locality: 'Bicaz', lat: 46.84, lng: 26.09 },
  { county: 'Iași', locality: 'Târgu Frumos', lat: 47.20, lng: 27.01 },
  { county: 'Constanța', locality: 'Mangalia', lat: 43.81, lng: 28.58 },
  { county: 'Prahova', locality: 'Breaza', lat: 45.18, lng: 25.67 },
];

const MOCK_PRODUCTS = {
  'Legume': [
    ['Roșii heirloom', 'Roșii colorate din grădină, soi vechi.', 12.00, 'kg'],
    ['Ardei gras', 'Ardei proaspăt, cules cu mâna.', 10.00, 'kg'],
    ['Dovlecel bio', 'Dovlecei tineri, fără pesticide.', 7.00, 'kg'],
    ['Varză de Brăila', 'Varză românească, dulce și crocantă.', 4.00, 'kg'],
  ],
  'Cartofi și ceapă': [
    ['Cartofi roșii', 'Cartofi noi roșii, fierbi în 10 minute.', 5.00, 'kg'],
    ['Ceapă galbenă', 'Ceapă uscată, tare și aromată.', 3.50, 'kg'],
    ['Cartofi mov', 'Cartofi speciali, boabe colorate natural.', 8.00, 'kg'],
  ],
  'Fructe': [
    ['Cireșe de mai', 'Cireșe roșii, dulci ca mierea.', 15.00, 'kg'],
    ['Zmeură', 'Zmeură proaspătă, culese azi.', 25.00, 'kg'],
    ['Prune Bistreț', 'Prune pentru compot și magiun.', 7.00, 'kg'],
    ['Caise românești', 'Caise galbene, coapte la soare.', 12.00, 'kg'],
  ],
  'Lactate': [
    ['Iaurt de casă', 'Iaurt gros, din lapte integral.', 10.00, 'kg'],
    ['Branză de vaci', 'Brânză proaspătă, fără conservanți.', 20.00, 'kg'],
    ['Unt de țară', 'Unt gras, bătut manual.', 30.00, 'kg'],
  ],
  'Cereale': [
    ['Grâu pentru măcinat', 'Grâu curățat, ideal pentru făină.', 4.50, 'kg'],
    ['Ovăz decorticat', 'Ovăz pentru terci sănătos.', 6.00, 'kg'],
    ['Secară', 'Secară autohtonă, din câmp.', 5.00, 'kg'],
  ],
  'Panificație': [
    ['Pâine cu maia', 'Pâine cu maia naturală, coaptă în cuptor.', 9.00, 'buc'],
    ['Chifle integrale', 'Chifle cu semințe, proaspete.', 0.80, 'buc'],
    ['Cozonac cu stafide', 'Cozonac pufos cu stafide.', 35.00, 'buc'],
  ],
  'Miere și dulciuri': [
    ['Miere de tei', 'Miere de tei parfumată, din Munții Apuseni.', 30.00, 'kg'],
    ['Miere cu nucă', 'Miere cu nuci întregi, borcan.', 25.00, 'borcan'],
    ['Sirop de artar', 'Sirop natural de artar, fără adaos.', 40.00, 'L'],
  ],
  'Dulcețuri': [
    ['Dulceață de căpșuni', 'Dulceață 100% fructe, fără zahăr alb.', 18.00, 'borcan'],
    ['Dulceață de visine', 'Visine amare, dulceață tradițională.', 20.00, 'borcan'],
    ['Gem de afine', 'Gem de afine sălbatice.', 22.00, 'borcan'],
  ],
  'Carne și ouă': [
    ['Ouă de țară', 'Ouă de găini libere, gălbenuș portocaliu.', 1.50, 'buc'],
    ['Carne de porc', 'Porc crescut în gospodărie, alimentație naturală.', 28.00, 'kg'],
    ['Cârnați de casă', 'Cârnați afumați pe lemn de fag.', 35.00, 'kg'],
  ],
  'Pește': [
    ['Păstrăv', 'Păstrăv proaspăt de crescătorie.', 40.00, 'kg'],
    ['Somon afumat', 'Somon afumat artizanal.', 55.00, 'kg'],
  ],
  'Conserve și murături': [
    ['Gogoșari murati', 'Gogoșari în oțet, rețetă veche.', 15.00, 'borcan'],
    ['Varză murată', 'Varză murată la butoi, tacâmuri.', 12.00, 'kg'],
    ['Ardei copt la borcan', 'Ardei copți, conservați în ulei.', 16.00, 'borcan'],
  ],
  'Băuturi naturale': [
    ['Socată', 'Băutură din flori de soc, fermentată natural.', 12.00, 'L'],
    ['Compot de mere', 'Compot de mere fără conservanți.', 10.00, 'L'],
    ['Tinctură de echinacea', 'Tinctură preparată în casă, imunitate.', 25.00, 'flacon'],
  ],
  'Plante și ceaiuri': [
    ['Ceai de mușețel', 'Mușețel uscat la soare, pungă.', 10.00, '100g'],
    ['Cimbrișor', 'Cimbrișor proaspăt, pentru ceai.', 8.00, '100g'],
    ['Rozmarin uscat', 'Rozmarin cules și uscat natural.', 9.00, '100g'],
  ],
  'Altele': [
    ['Sare de baie', 'Sare de baie cu lavandă.', 15.00, 'pachet'],
    ['Lumanare de ceară', 'Lumânare din ceară naturală de albine.', 20.00, 'buc'],
  ],
};

const MOCK_IMAGES = [
  'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&q=60',
  'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=400&q=60',
  'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&q=60',
  'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=60',
  'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&q=60',
  'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&q=60',
];

const MOCK_AVATARS = [
  'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=200&q=60',
  'https://images.unsplash.com/photo-1589923188900-85dae523342b?w=200&q=60',
  'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=200&q=60',
  'https://images.unsplash.com/photo-1581578017093-cd308404f0b6?w=200&q=60',
];

const MOCK_COVERS = [
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=60',
  'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=60',
  'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800&q=60',
  'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=800&q=60',
];

async function seedMocks() {
  try {
    const existing = await db.prepare("SELECT COUNT(*) AS c FROM users WHERE is_mock = 1").get();
    if (existing.c > 0) {
      console.log('Mock producers există deja. Skip.');
      return;
    }

    let mockIdx = 0;
    for (const cat of CATEGORIES) {
      const products = MOCK_PRODUCTS[cat.name] || MOCK_PRODUCTS['Altele'];
      for (let i = 0; i < 3; i++) {
        const town = MOCK_TOWNS[(mockIdx) % MOCK_TOWNS.length];
        const farmName = `Ferma Mock ${cat.icon} ${town.locality} #${mockIdx + 1}`;
        const phone = `0700${String(100000 + mockIdx).slice(0, 6)}`;
        const email = `mock${mockIdx}@test.local`;

        const userResult = await db.prepare(
          'INSERT INTO users (role, name, email, phone, password_hash, is_mock) VALUES (?, ?, ?, ?, ?, 1)'
        ).run('producer', farmName, email, phone, PASSWORD);
        const userId = userResult.lastInsertRowid;

        const prodResult = await db.prepare(`
          INSERT INTO producers (user_id, name, owner_name, description, county, locality, phone, whatsapp, lat, lng, avatar_url, cover_url, is_mock)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).run(
          userId, farmName, `Producător test ${town.locality}`,
          `Fermă de testare în ${town.locality}, județul ${town.county}. Produse din categoria ${cat.name}.`,
          town.county, town.locality, phone, phone,
          town.lat + (Math.random() - 0.5) * 0.1,
          town.lng + (Math.random() - 0.5) * 0.1,
          MOCK_AVATARS[mockIdx % MOCK_AVATARS.length],
          MOCK_COVERS[mockIdx % MOCK_COVERS.length]
        );
        const producerId = prodResult.lastInsertRowid;

        const catProducts = products.slice(0, 2 + (i % 2));
        for (const [name, desc, price, unit] of catProducts) {
          const imgUrl = MOCK_IMAGES[(mockIdx + catProducts.indexOf(name)) % MOCK_IMAGES.length];
          await db.prepare('INSERT INTO products (producer_id, name, description, price, unit, category, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(producerId, name, desc + ' [TEST]', price, unit, cat.name, imgUrl);
        }

        mockIdx++;
      }
    }

    console.log(`Seed mock finalizat: ${mockIdx} producători de test, ${CATEGORIES.length} categorii × 3.`);
  } catch (err) {
    console.error('Seed mocks error:', err.message);
  }
}
