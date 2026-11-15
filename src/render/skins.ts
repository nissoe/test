/** Cosmetic catalog. Prices are in coins; premium items will be IAP later. */
type L = { he: string; en: string };

export interface BlockSkin {
  id: string;
  name: L;
  price: number;
  roughness: number;
  metalness: number;
  clearcoat: number;
  iridescence: number;
  /** 0..1 how much group color glows. */
  glow: number;
  /** Edge glow lines (neon look). */
  edges: boolean;
  /** Neutral (unlinked) block color. */
  neutral: string;
  /** Palette for link groups. */
  palette: string[];
  /** Saturation multiplier for the pastel look. */
  sheen?: number;
}

export interface BoardTheme {
  id: string;
  name: L;
  price: number;
  bgTop: string;
  bgBottom: string;
  slab: string;
  tile: string;
  rim: string;
  fog: string;
  particles: string;
  light: string;
}

export const SKINS: BlockSkin[] = [
  {
    id: 'prism', name: { he: 'פריזמה', en: 'Prism' }, price: 0,
    roughness: 0.22, metalness: 0.05, clearcoat: 1, iridescence: 0.25, glow: 0.06, edges: false,
    neutral: '#6f789f', palette: ['#20d9ff', '#ff3fb4', '#7dff5a', '#ff8a2b', '#a96bff', '#ff4d5e'],
  },
  {
    id: 'ceramic', name: { he: 'קרמיקה', en: 'Ceramic' }, price: 300,
    roughness: 0.55, metalness: 0, clearcoat: 0.4, iridescence: 0, glow: 0.02, edges: false,
    neutral: '#e8e2d6', palette: ['#6cc5d9', '#e88fb1', '#9ccc79', '#f0a965', '#a993d6', '#e07a7a'],
  },
  {
    id: 'neon', name: { he: 'ניאון', en: 'Neon' }, price: 600,
    roughness: 0.35, metalness: 0.2, clearcoat: 0.6, iridescence: 0, glow: 0.55, edges: true,
    neutral: '#2a2f45', palette: ['#00f0ff', '#ff00c8', '#39ff14', '#ff7b00', '#b026ff', '#ff1744'],
  },
  {
    id: 'chrome', name: { he: 'כרום', en: 'Chrome' }, price: 900,
    roughness: 0.08, metalness: 1, clearcoat: 1, iridescence: 0, glow: 0.05, edges: false,
    neutral: '#b9c0cc', palette: ['#4fd8ff', '#ff5fc2', '#8dff6a', '#ffa04d', '#b98cff', '#ff6b78'],
  },
  {
    id: 'aurora', name: { he: 'זוהר צפוני', en: 'Aurora' }, price: 1500,
    roughness: 0.12, metalness: 0.3, clearcoat: 1, iridescence: 1, glow: 0.2, edges: false,
    neutral: '#c9d2ff', palette: ['#58f5ff', '#ff6ad5', '#a2ff7a', '#ffb36b', '#c59bff', '#ff7a8a'],
  },
];

export const THEMES: BoardTheme[] = [
  {
    id: 'nebula', name: { he: 'ערפילית', en: 'Nebula' }, price: 0,
    bgTop: '#1a1040', bgBottom: '#05040d', slab: '#14122a', tile: '#1f1c3d', rim: '#6a5cff', fog: '#0b0820', particles: '#9f8cff', light: '#ffffff',
  },
  {
    id: 'sunset', name: { he: 'שקיעה', en: 'Sunset' }, price: 400,
    bgTop: '#ff7a59', bgBottom: '#2b0f3a', slab: '#2a1530', tile: '#3d1f42', rim: '#ffb36b', fog: '#3a1736', particles: '#ffd29a', light: '#ffe2c4',
  },
  {
    id: 'abyss', name: { he: 'תהום', en: 'Abyss' }, price: 500,
    bgTop: '#00353f', bgBottom: '#00080c', slab: '#071c22', tile: '#0c2a31', rim: '#00e5c7', fog: '#001418', particles: '#59ffe4', light: '#d8fff8',
  },
  {
    id: 'zen', name: { he: 'זן', en: 'Zen' }, price: 500,
    bgTop: '#f3efe6', bgBottom: '#cfc6b4', slab: '#e9e3d6', tile: '#ddd5c4', rim: '#8a7a5c', fog: '#e7e0d0', particles: '#ffffff', light: '#fff8ec',
  },
];

export const skinById = (id: string) => SKINS.find((s) => s.id === id) ?? SKINS[0];
export const themeById = (id: string) => THEMES.find((s) => s.id === id) ?? THEMES[0];
