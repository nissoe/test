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

/** Default look for each world (used while the "By world" theme is equipped). */
const wt = (id: string, bgTop: string, bgBottom: string, slab: string, tile: string, rim: string, particles: string, light = '#ffffff'): BoardTheme => ({
  id, name: { he: id, en: id }, price: 0, bgTop, bgBottom, slab, tile, rim, fog: bgBottom, particles, light,
});
export const WORLD_THEMES: Record<string, BoardTheme> = {
  w1: wt('w1', '#3a2a6e', '#0d0a1f', '#17132e', '#221d44', '#ffc845', '#ffe39a', '#fff2d6'),
  w2: wt('w2', '#0f3a5c', '#03101c', '#0b1a2a', '#12293e', '#3ee8ff', '#9ff4ff', '#e6fbff'),
  w3: wt('w3', '#0f3d2e', '#020f0b', '#0a1d16', '#123026', '#7cff6b', '#c4ffb8', '#effff0'),
  w4: wt('w4', '#4a3a2c', '#120d09', '#2a2119', '#3a2e24', '#c9a27a', '#e8cfae', '#fff1e0'),
  w5: wt('w5', '#4a1350', '#12041a', '#1f0c25', '#2e1336', '#ff6bd6', '#ffb3ec', '#ffe9f8'),
  w6: wt('w6', '#1d4a66', '#06121c', '#0e2433', '#173a50', '#9fdcff', '#ffffff', '#eaf7ff'),
  w7: wt('w7', '#6b2a14', '#170806', '#2a120b', '#3d1c12', '#ff9a3c', '#ffcb8f', '#ffe8d2'),
  w8: wt('w8', '#2d1060', '#09031a', '#170c30', '#231446', '#b46bff', '#dcbcff', '#f3e9ff'),
  w9: wt('w9', '#5a0f22', '#14030a', '#260a13', '#38101d', '#ff5470', '#ffb0bd', '#ffe8ec'),
  w10: wt('w10', '#073f36', '#010e0c', '#08201c', '#0d3029', '#45ffb5', '#a8ffe0', '#e9fff8'),
  w11: wt('w11', '#3d2f08', '#0e0a02', '#211a07', '#30260c', '#ffe066', '#fff0b0', '#fff8e1'),
  w12: wt('w12', '#2a2a35', '#08080c', '#15151c', '#20202a', '#ffffff', '#d8d8e8', '#ffffff'),
  w13: wt('w13', '#0b0a33', '#000004', '#0a0a1e', '#12122e', '#8fb8ff', '#b9ccff', '#e6edff'),
};

export const THEMES: BoardTheme[] = [
  {
    id: 'world', name: { he: 'לפי עולם', en: 'By world' }, price: 0,
    bgTop: '#3a2a6e', bgBottom: '#0f3a5c', slab: '#14122a', tile: '#1f1c3d', rim: '#ffc845', fog: '#0b0820', particles: '#9f8cff', light: '#ffffff',
  },
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
/** Theme to show for a pack: the world's own look, unless the player equipped a specific theme. */
export const themeFor = (equipped: string, pack: string) => (equipped === 'world' ? WORLD_THEMES[pack] ?? themeById('nebula') : themeById(equipped));
