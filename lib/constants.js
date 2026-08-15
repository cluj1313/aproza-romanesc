const CATEGORIES = [
  { name: 'Legume', icon: '🥕', color: '#2e7d32', image: '/images/cat-legume.jpg' },
  { name: 'Fructe', icon: '🍎', color: '#e53935', image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=700&q=60' },
  { name: 'Lactate', icon: '🧀', color: '#fb8c00', image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=700&q=60' },
  { name: 'Cereale', icon: '🌾', color: '#f9a825', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=700&q=60' },
  { name: 'Panificație', icon: '🍞', color: '#8d6e63', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=700&q=60' },
  { name: 'Miere și dulciuri', icon: '🍯', color: '#ef6c00', image: 'https://images.pexels.com/photos/30666803/pexels-photo-30666803.jpeg?auto=compress&cs=tinysrgb&w=700' },
  { name: 'Carne și ouă', icon: '🍗', color: '#c62828', image: 'https://images.pexels.com/photos/28976232/pexels-photo-28976232.jpeg?auto=compress&cs=tinysrgb&w=700' },
  { name: 'Conserve și murături', icon: '🫙', color: '#558b2f', image: 'https://images.pexels.com/photos/13707355/pexels-photo-13707355.jpeg?auto=compress&cs=tinysrgb&w=700' },
  { name: 'Băuturi naturale', icon: '🍷', color: '#6a1b9a', image: 'https://images.pexels.com/photos/21574964/pexels-photo-21574964.jpeg?auto=compress&cs=tinysrgb&w=700' },
  { name: 'Plante și ceaiuri', icon: '🌿', color: '#43a047', image: 'https://images.pexels.com/photos/7367634/pexels-photo-7367634.jpeg?auto=compress&cs=tinysrgb&w=700' },
  { name: 'Altele', icon: '🧺', color: '#546e7a', image: 'https://images.unsplash.com/photo-1518843875459-f738682238a6?w=700&q=60' }
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
