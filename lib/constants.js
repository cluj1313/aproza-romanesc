const CATEGORIES = [
  { name: 'Legume', icon: '🥕', color: '#2e7d32', image: '/images/cat-legume.jpg' },
  { name: 'Fructe', icon: '🍎', color: '#e53935', image: '/images/cat-fructe.jpg' },
  { name: 'Lactate', icon: '🧀', color: '#fb8c00', image: '/images/cat-lactate.jpg' },
  { name: 'Cereale', icon: '🌾', color: '#f9a825', image: '/images/cat-cereale.jpg' },
  { name: 'Panificație', icon: '🍞', color: '#8d6e63', image: '/images/cat-panificatie.jpg' },
  { name: 'Miere și dulciuri', icon: '🍯', color: '#ef6c00', image: '/images/cat-miere.jpg' },
  { name: 'Carne și ouă', icon: '🍗', color: '#c62828', image: '/images/cat-carne.jpg' },
  { name: 'Conserve și murături', icon: '🫙', color: '#558b2f', image: 'https://images.pexels.com/photos/13707355/pexels-photo-13707355.jpeg?auto=compress&cs=tinysrgb&w=700' },
  { name: 'Băuturi naturale', icon: '🍷', color: '#6a1b9a', image: '/images/cat-bauturi.jpg' },
  { name: 'Plante și ceaiuri', icon: '🌿', color: '#43a047', image: '/images/cat-plante.jpg' },
  { name: 'Altele', icon: '🧺', color: '#546e7a', image: '/images/cat-altele.jpg' }
];

const CATEGORY_NAMES = CATEGORIES.map(c => c.name);

const ANNOUNCEMENT_TYPES = [
  { id: 'discount', label: 'Reduceri de preț %', icon: '🏷️' },
  { id: 'offer', label: 'Oferte', icon: '🎁' },
  { id: 'free_shipping', label: 'Transport gratuit', icon: '🚚' },
  { id: 'vacation', label: 'Concediu', icon: '🏖️' },
  { id: 'other', label: 'Altele', icon: '📢' }
];

const COUNTIES = [
  'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani',
  'Brașov', 'Brăila', 'București', 'Buzău', 'Caraș-Severin', 'Călărași',
  'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 'Dolj', 'Galați', 'Giurgiu',
  'Gorj', 'Harghita', 'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 'Maramureș',
  'Mehedinți', 'Mureș', 'Neamț', 'Olt', 'Prahova', 'Satu Mare', 'Sălaj',
  'Sibiu', 'Suceava', 'Teleorman', 'Timiș', 'Tulcea', 'Vaslui', 'Vâlcea', 'Vrancea'
];

module.exports = { CATEGORIES, CATEGORY_NAMES, ANNOUNCEMENT_TYPES, COUNTIES };
