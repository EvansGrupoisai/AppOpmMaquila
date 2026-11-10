// Paleta "azul corporativo": fondo gris azulado, tarjetas blancas sin borde, un solo
// azul de acento y una tarjeta marino para la cifra principal. Los tonos por
// sección quedan solo para las barras; las variaciones se pintan en verde / rojo.

export type Tokens = {
  ink: string;
  ink2: string;
  muted: string;
  border: string;
  paper: string;
  surface: string;
  surfaceSunk: string;
  accent: string;
  accentSoft: string;
  good: string;
  goodSoft: string;
  critical: string;
  criticalSoft: string;
  warn: string;
  warnSoft: string;
  /** Tarjeta destacada (la cifra principal) y barra de pestañas */
  hero: string;
  onHero: string;
  /** Riel gris del selector segmentado */
  track: string;
  /** Acentos por sección */
  tono: { azul: string; ambar: string; violeta: string; verde: string; coral: string };
  /** Oro, plata y bronce del ranking */
  podio: [string, string, string];
  /** Semáforo de deuda, nivel 1 (menor) a 6 (mayor) */
  deuda: [string, string, string, string, string, string];
};

const light: Tokens = {
  ink: '#0f1a2b',
  ink2: '#3a4659',
  muted: '#5a6678',
  border: '#e1e7f0',
  paper: '#f2f5fa',
  surface: '#ffffff',
  surfaceSunk: '#f5f7fb',
  accent: '#1d5fd1',
  accentSoft: '#e6eefc',
  good: '#11743c',
  goodSoft: '#e3f4ea',
  critical: '#c62f2f',
  criticalSoft: 'rgba(208,59,59,0.12)',
  warn: '#8a6100',
  warnSoft: '#fff5dc',
  hero: '#0b2a5b',
  onHero: '#ffffff',
  track: '#e1e7f0',
  tono: { azul: '#1d5fd1', ambar: '#b86e00', violeta: '#6b3fc4', verde: '#11743c', coral: '#c8452f' },
  podio: ['#b8860b', '#6f7a86', '#a0522d'],
  deuda: ['#0098b8', '#0063a8', '#1c9a63', '#b89200', '#e07b00', '#d11a1a'],
};

const dark: Tokens = {
  ink: '#e8edf5',
  ink2: '#b4bfcf',
  muted: '#8592a6',
  border: '#222d40',
  paper: '#0b111c',
  surface: '#131b2a',
  surfaceSunk: '#0f1622',
  accent: '#6aa1ff',
  accentSoft: 'rgba(106,161,255,0.14)',
  good: '#5fd08a',
  goodSoft: 'rgba(95,208,138,0.14)',
  critical: '#f5847f',
  criticalSoft: 'rgba(245,132,127,0.14)',
  warn: '#e8b25a',
  warnSoft: 'rgba(232,178,90,0.12)',
  hero: '#1a3a72',
  onHero: '#f2f6fc',
  track: '#1c2536',
  tono: { azul: '#6aa1ff', ambar: '#f0b35a', violeta: '#c29bff', verde: '#5fd08a', coral: '#ff9580' },
  podio: ['#f2c94c', '#c3ccd6', '#e0935a'],
  deuda: ['#4fd3ee', '#6aaeff', '#5fd08a', '#f2d24c', '#ffab4a', '#ff6b6b'],
};

export function getTokens(scheme: 'light' | 'dark' | null | undefined): Tokens {
  return scheme === 'dark' ? dark : light;
}

// Los números se alinean en columnas, así que van en monoespaciada en las dos plataformas
export const MONO = { ios: 'Menlo', android: 'monospace', default: 'monospace' };

export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 30,
};
