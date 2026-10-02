import type { MenuCategory, MenuItem, Modifier, Variant } from '@/types'

/** icon = lucide icon name (rendered via <DynIcon/>) */
export const CATEGORIES: MenuCategory[] = [
  { id: 'c1', name: 'Starters', icon: 'Flame', color: '#ea580c' },
  { id: 'c2', name: 'Soups', icon: 'Soup', color: '#ca8a04' },
  { id: 'c3', name: 'Main Course', icon: 'CookingPot', color: '#dc2626' },
  { id: 'c4', name: 'Chinese', icon: 'Utensils', color: '#e11d48' },
  { id: 'c5', name: 'South Indian', icon: 'Leaf', color: '#16a34a' },
  { id: 'c6', name: 'Breads', icon: 'Wheat', color: '#b45309' },
  { id: 'c7', name: 'Rice & Biryani', icon: 'Salad', color: '#0d9488' },
  { id: 'c8', name: 'Beverages', icon: 'CupSoda', color: '#2563eb' },
  { id: 'c9', name: 'Desserts', icon: 'IceCreamCone', color: '#db2777' },
  { id: 'c10', name: 'Combos', icon: 'Package', color: '#7c3aed' },
]

const ALL = ['o1', 'o2', 'o3', 'o4']
const HALF_FULL = (p: number): Variant[] => [{ name: 'Half', price: Math.round(p * 0.6 / 5) * 5 }, { name: 'Full', price: p }]
const SIZES = (p: number): Variant[] => [{ name: 'Regular', price: p }, { name: 'Large', price: p + 40 }]
const CURRY_MODS: Modifier[] = [{ name: 'Extra Butter', price: 30 }, { name: 'Less Spicy', price: 0 }, { name: 'Extra Spicy', price: 0 }, { name: 'Jain (No Onion/Garlic)', price: 0 }]
const STARTER_MODS: Modifier[] = [{ name: 'Extra Mint Chutney', price: 15 }, { name: 'Extra Cheese', price: 40 }, { name: 'Less Oil', price: 0 }]
const BREAD_MODS: Modifier[] = [{ name: 'Butter', price: 15 }, { name: 'Garlic', price: 20 }, { name: 'Cheese', price: 35 }]
const BEV_MODS: Modifier[] = [{ name: 'No Ice', price: 0 }, { name: 'Less Sugar', price: 0 }, { name: 'Extra Shot', price: 40 }]
const CHINESE_MODS: Modifier[] = [{ name: 'Extra Gravy', price: 30 }, { name: 'Schezwan Style', price: 20 }, { name: 'No MSG', price: 0 }]
const DESSERT_MODS: Modifier[] = [{ name: 'Add Ice Cream Scoop', price: 50 }, { name: 'Extra Chocolate', price: 30 }]

type Row = [name: string, short: string, cat: string, price: number, veg: boolean, emoji: string, extra?: Partial<MenuItem>]

const ROWS: Row[] = [
  // Starters c1
  ['Paneer Tikka', 'PT', 'c1', 320, true, '🧀', { bestseller: true, variants: HALF_FULL(320), modifiers: STARTER_MODS, station: 'Tandoor' }],
  ['Hara Bhara Kebab', 'HBK', 'c1', 260, true, '🥬', { modifiers: STARTER_MODS, station: 'Tandoor' }],
  ['Chicken Tikka', 'CT', 'c1', 380, false, '🍗', { bestseller: true, variants: HALF_FULL(380), modifiers: STARTER_MODS, station: 'Tandoor', spicy: true }],
  ['Tandoori Chicken', 'TC', 'c1', 420, false, '🍗', { variants: HALF_FULL(420), station: 'Tandoor' }],
  ['Mutton Seekh Kebab', 'MSK', 'c1', 460, false, '🥩', { station: 'Tandoor', spicy: true }],
  ['Malai Soya Chaap', 'MSC', 'c1', 290, true, '🍢', { modifiers: STARTER_MODS, station: 'Tandoor' }],
  ['Fish Amritsari', 'FA', 'c1', 440, false, '🐟', { station: 'Kitchen' }],
  ['Crispy Corn', 'CC', 'c1', 240, true, '🌽', { station: 'Chinese' }],
  // Soups c2
  ['Tomato Shorba', 'TS', 'c2', 160, true, '🍅'],
  ['Sweet Corn Soup', 'SCS', 'c2', 170, true, '🌽', { variants: [{ name: 'Veg', price: 170 }, { name: 'Chicken', price: 200 }], station: 'Chinese' }],
  ['Hot & Sour Soup', 'HSS', 'c2', 180, true, '🥣', { spicy: true, station: 'Chinese' }],
  ['Chicken Manchow Soup', 'CMS', 'c2', 210, false, '🥣', { station: 'Chinese' }],
  // Main course c3
  ['Paneer Butter Masala', 'PBM', 'c3', 340, true, '🍛', { bestseller: true, variants: HALF_FULL(340), modifiers: CURRY_MODS }],
  ['Dal Makhani', 'DM', 'c3', 280, true, '🫘', { bestseller: true, variants: HALF_FULL(280), modifiers: CURRY_MODS }],
  ['Kadhai Paneer', 'KP', 'c3', 330, true, '🍲', { variants: HALF_FULL(330), modifiers: CURRY_MODS, spicy: true }],
  ['Shahi Paneer', 'SP', 'c3', 340, true, '🍛', { modifiers: CURRY_MODS }],
  ['Mix Veg', 'MV', 'c3', 260, true, '🥘', { modifiers: CURRY_MODS }],
  ['Malai Kofta', 'MK', 'c3', 320, true, '🍛', { modifiers: CURRY_MODS }],
  ['Butter Chicken', 'BC', 'c3', 420, false, '🍛', { bestseller: true, variants: HALF_FULL(420), modifiers: CURRY_MODS }],
  ['Chicken Curry', 'CHC', 'c3', 380, false, '🍲', { variants: HALF_FULL(380), modifiers: CURRY_MODS, spicy: true }],
  ['Mutton Rogan Josh', 'MRJ', 'c3', 520, false, '🍖', { modifiers: CURRY_MODS, spicy: true }],
  ['Dal Tadka', 'DT', 'c3', 220, true, '🫘', { modifiers: CURRY_MODS }],
  // Chinese c4
  ['Veg Hakka Noodles', 'VHN', 'c4', 240, true, '🍜', { modifiers: CHINESE_MODS, station: 'Chinese' }],
  ['Chicken Hakka Noodles', 'CHN', 'c4', 280, false, '🍜', { modifiers: CHINESE_MODS, station: 'Chinese' }],
  ['Veg Manchurian', 'VM', 'c4', 250, true, '🥟', { variants: [{ name: 'Dry', price: 250 }, { name: 'Gravy', price: 270 }], modifiers: CHINESE_MODS, station: 'Chinese' }],
  ['Chilli Paneer', 'CP', 'c4', 300, true, '🌶️', { bestseller: true, variants: [{ name: 'Dry', price: 300 }, { name: 'Gravy', price: 320 }], modifiers: CHINESE_MODS, station: 'Chinese', spicy: true }],
  ['Chilli Chicken', 'CHCH', 'c4', 340, false, '🌶️', { variants: [{ name: 'Dry', price: 340 }, { name: 'Gravy', price: 360 }], modifiers: CHINESE_MODS, station: 'Chinese', spicy: true }],
  ['Veg Fried Rice', 'VFR', 'c4', 230, true, '🍚', { modifiers: CHINESE_MODS, station: 'Chinese' }],
  ['Veg Spring Roll', 'VSR', 'c4', 220, true, '🌯', { station: 'Chinese' }],
  // South Indian c5
  ['Masala Dosa', 'MD', 'c5', 180, true, '🫓', { bestseller: true, modifiers: [{ name: 'Extra Sambar', price: 20 }, { name: 'Butter', price: 25 }, { name: 'Cheese', price: 40 }] }],
  ['Plain Dosa', 'PD', 'c5', 140, true, '🫓'],
  ['Mysore Masala Dosa', 'MMD', 'c5', 200, true, '🫓', { spicy: true }],
  ['Idli Sambar', 'IS', 'c5', 120, true, '⚪'],
  ['Medu Vada', 'MDV', 'c5', 130, true, '🍩'],
  ['Onion Uttapam', 'OU', 'c5', 170, true, '🥞'],
  // Breads c6
  ['Butter Naan', 'BN', 'c6', 70, true, '🫓', { bestseller: true, modifiers: BREAD_MODS, station: 'Tandoor' }],
  ['Garlic Naan', 'GN', 'c6', 90, true, '🫓', { modifiers: BREAD_MODS, station: 'Tandoor' }],
  ['Tandoori Roti', 'TR', 'c6', 35, true, '🫓', { modifiers: BREAD_MODS, station: 'Tandoor' }],
  ['Lachha Paratha', 'LP', 'c6', 75, true, '🥯', { station: 'Tandoor' }],
  ['Amritsari Kulcha', 'AK', 'c6', 120, true, '🥙', { station: 'Tandoor' }],
  ['Missi Roti', 'MR', 'c6', 60, true, '🫓', { station: 'Tandoor' }],
  // Rice c7
  ['Veg Dum Biryani', 'VDB', 'c7', 290, true, '🍚', { variants: HALF_FULL(290) }],
  ['Chicken Dum Biryani', 'CDB', 'c7', 360, false, '🍗', { bestseller: true, variants: HALF_FULL(360) }],
  ['Mutton Biryani', 'MB', 'c7', 460, false, '🍖'],
  ['Jeera Rice', 'JR', 'c7', 170, true, '🍚'],
  ['Steamed Rice', 'SR', 'c7', 140, true, '🍚'],
  // Beverages c8
  ['Masala Chai', 'MC', 'c8', 60, true, '☕', { modifiers: BEV_MODS, station: 'Bar' }],
  ['Cold Coffee', 'CCF', 'c8', 160, true, '🧋', { variants: SIZES(160), modifiers: BEV_MODS, station: 'Bar', bestseller: true }],
  ['Sweet Lassi', 'SL', 'c8', 120, true, '🥛', { station: 'Bar' }],
  ['Fresh Lime Soda', 'FLS', 'c8', 110, true, '🍋', { variants: [{ name: 'Sweet', price: 110 }, { name: 'Salted', price: 110 }, { name: 'Mixed', price: 110 }], modifiers: BEV_MODS, station: 'Bar' }],
  ['Virgin Mojito', 'VMJ', 'c8', 180, true, '🍹', { modifiers: BEV_MODS, station: 'Bar' }],
  ['Mineral Water', 'MW', 'c8', 40, true, '💧', { station: 'Bar', gst: 18 }],
  // Desserts c9
  ['Gulab Jamun', 'GJ', 'c9', 110, true, '🟤', { modifiers: DESSERT_MODS, station: 'Desserts' }],
  ['Rasmalai', 'RM', 'c9', 140, true, '🍮', { station: 'Desserts' }],
  ['Sizzling Brownie', 'SB', 'c9', 240, true, '🍫', { modifiers: DESSERT_MODS, station: 'Desserts', bestseller: true }],
  ['Kulfi Falooda', 'KF', 'c9', 180, true, '🍨', { station: 'Desserts' }],
  // Combos c10
  ['Veg Thali', 'VT', 'c10', 349, true, '🍱', { description: 'Paneer, dal, mix veg, rice, 2 roti, raita, sweet' }],
  ['Non-Veg Thali', 'NVT', 'c10', 449, false, '🍱', { description: 'Butter chicken, dal, rice, 2 roti, raita, sweet' }],
  ['Chole Bhature Combo', 'CBC', 'c10', 220, true, '🥘', { description: 'Chole, 2 bhature, lassi', bestseller: true }],
  ['Rajma Chawal Bowl', 'RCB', 'c10', 210, true, '🍛'],
]

export const MENU: MenuItem[] = ROWS.map(([name, short, cat, price, veg, emoji, extra], i) => ({
  id: 'm' + (i + 1),
  code: String(101 + i),
  short,
  name,
  categoryId: cat,
  price,
  veg,
  emoji,
  gst: 5,
  available: !['Mutton Biryani', 'Kulfi Falooda'].includes(name),
  outlets: name.includes('Fish') ? ['o1', 'o2'] : ALL,
  station: 'Kitchen',
  description: extra?.description ?? `Chef's special ${name.toLowerCase()} prepared fresh to order.`,
  ...extra,
}))

export const menuById = (id: string) => MENU.find((m) => m.id === id)
