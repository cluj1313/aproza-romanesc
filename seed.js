const bcrypt = require('bcryptjs');
const db = require('./db');

const PASSWORD = bcrypt.hashSync('parola123', 10);

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

function seed() {
  const existing = db.prepare('SELECT COUNT(*) AS c FROM producers').get();
  if (existing.c > 0) {
    console.log('Baza de date conține deja date. Seed sărit.');
    return;
  }

  const insertUser = db.prepare('INSERT INTO users (role, name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)');
  const insertProducer = db.prepare(`
    INSERT INTO producers (user_id, name, owner_name, description, county, locality, phone, whatsapp, lat, lng, avatar_url, cover_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertProduct = db.prepare(
    'INSERT INTO products (producer_id, name, description, price, unit, category, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertStore = db.prepare(
    'INSERT INTO stores (name, county, city, address, phone, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertReview = db.prepare(
    'INSERT INTO reviews (producer_id, user_id, rating, comment) VALUES (?, ?, ?, ?)'
  );
  const insertAnnouncement = db.prepare(
    'INSERT INTO announcements (producer_id, type, title, message, percent) VALUES (?, ?, ?, ?, ?)'
  );
  const insertNotification = db.prepare(
    'INSERT INTO notifications (producer_id, target_user_id, type, title, message) VALUES (?, ?, ?, ?, ?)'
  );

  STORES.forEach(s => insertStore.run(...s));

  const customerId = insertUser.run('customer', 'Ion Popescu', 'client@exemplu.ro', '0720123123', PASSWORD).lastInsertRowid;
  const customer2Id = insertUser.run('customer', 'Ana Vasilescu', 'ana@exemplu.ro', '0740123123', PASSWORD).lastInsertRowid;

  PRODUCERS.forEach((p, i) => {
    const userId = insertUser.run('producer', p.name, `ferma${i + 1}@exemplu.ro`, p.phone.replace(/\s/g, ''), PASSWORD).lastInsertRowid;
    const producerId = insertProducer.run(
      userId, p.name, p.owner_name, p.description, p.county, p.locality, p.phone, p.whatsapp,
      p.lat, p.lng, p.avatar_url, p.cover_url
    ).lastInsertRowid;

    p.products.forEach(pr => insertProduct.run(producerId, ...pr));

    if (i === 0) {
      insertAnnouncement.run(producerId, 'offer', 'Coș de legume proaspete', 'Coș cu roșii, castraveți și salată — doar 15 lei!', null);
      insertAnnouncement.run(producerId, 'free_shipping', 'Transport gratuit', 'Transport gratuit pentru comenzi peste 50 lei în Vâlcele și împrejurimi.', null);
      insertNotification.run(producerId, customerId, 'fresh', '🌱 Recoltă proaspătă: Roșii cherry de grădină', 'Roșii cherry de grădină — 9,00 lei/kg. Culese azi dimineață! Disponibil la Ferma Bio Vâlcele.');
      insertNotification.run(producerId, customer2Id, 'fresh', '🌱 Recoltă proaspătă: Roșii cherry de grădină', 'Roșii cherry de grădină — 9,00 lei/kg. Culese azi dimineață! Disponibil la Ferma Bio Vâlcele.');
      insertReview.run(producerId, customerId, 5, 'Cele mai bune roșii din zonă! Se simte gustul adevărat de grădină. Recomand cu drag.');
      insertReview.run(producerId, customer2Id, 4, 'Legume foarte proaspete și oameni de treabă. Doar coada la preluare a fost puțin mai lungă.');
      db.prepare('UPDATE reviews SET reply = ?, reply_at = datetime(\'now\') WHERE producer_id = ?').run('Mulțumim frumos pentru recenzii! Ne bucurăm că vă place. Vom mai angaja ajutor la preluare. 😊', producerId);
    }
    if (i === 1) {
      insertAnnouncement.run(producerId, 'discount', 'Reducere la mierea polifloră', 'Miere polifloră cu 20% reducere în această săptămână!', 20);
      insertReview.run(producerId, customerId, 5, 'Mierea este extraordinară, se simte că e culeasă din munte. Voi comanda din nou!');
      insertReview.run(producerId, customer2Id, 5, 'Cel mai bun polen pe care l-am gustat. Livrare rapidă și ambalaj impecabil.');
    }
    if (i === 3) {
      insertReview.run(producerId, customer2Id, 5, 'Cozonacul e ca la bunica! Pâinea pe piatră e superbă.');
    }
  });

  console.log(`Seed finalizat: ${PRODUCERS.length} producători, ${STORES.length} magazine Dor de Casă, 4 recenzii, 3 anunțuri, 2 notificări.`);
  console.log('Conturi demo: ferma1@exemplu.ro / client@exemplu.ro · parola: parola123');
}

// Completează produsele demo lipsă la fiecare pornire (baze de date deja populate).
// Asigură ca fiecare categorie să aibă cel puțin produsele demo de mai jos.
const EXTRA_PRODUCTS = [
  ['Moara de Piatră', 'Făină integrală de grâu', 'Măcinată la piatră, fără aditivi, ideală pentru pâine de casă.', 5.50, 'kg', 'Cereale', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=60'],
  ['Moara de Piatră', 'Mălai de porumb', 'Mălai fin, din porumb românesc, pentru mămăligă și mălai dulce.', 6.00, 'kg', 'Cereale', 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=60'],
  ['Gospodăria lui Mitu', 'Ouă de prepeliță', 'Ouă mici de prepeliță, bogate în nutrienți, crescute în aer liber.', 2.50, 'buc', 'Altele', 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&q=60'],
  ['Gospodăria lui Mitu', 'Zacuscă de casă', 'Zacuscă de vinete cu gogoșari, rețetă de familie, fără conservanți.', 16.00, 'borcan', 'Conserve și murături', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=60'],
  ['Raiul Plantei', 'Sare de baie cu lavandă', 'Sare naturală cu lavandă, pentru relaxare, făcută manual.', 14.00, 'pachet', 'Altele', 'https://images.unsplash.com/photo-1564540586988-aa4e53c7a87f?w=400&q=60']
];

function seedMissingProducts() {
  const insertProduct = db.prepare(
    'INSERT INTO products (producer_id, name, description, price, unit, category, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const exists = db.prepare('SELECT id FROM products WHERE name = ?');
  let added = 0;

  EXTRA_PRODUCTS.forEach(([producerName, name, description, price, unit, category, image_url]) => {
    if (exists.get(name)) return;
    const producer = db.prepare('SELECT id FROM producers WHERE name = ?').get(producerName);
    if (!producer) return;
    insertProduct.run(producer.id, name, description, price, unit, category, image_url);
    added++;
  });

  if (added) console.log(`Produse demo completate: +${added}`);
}

seed();
seedMissingProducts();
