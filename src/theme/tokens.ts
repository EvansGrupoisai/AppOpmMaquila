// Paleta base (tomada de PorSucursal.cshtml del sistema web), más los tonos que
// usa esta app para que las cifras destaquen sin gráficas: cada indicador tiene su
// color de acento y las variaciones se pintan en verde / rojo.

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
  /** Acentos por sección */
  tono: { azul: string; ambar: string; violeta: string; verde: string; coral: string };
  /** Oro, plata y bronce del ranking */
  podio: [string, string, string];
  /** Semáforo de deuda, nivel 1 (menor) a 6 (mayor) */
  deuda: [string, string, string, string, string, string];
};

const light: Tokens = {
  ink: '#0a1716',
  ink2: '#46534f',
  muted: '#7c8a88',
  border: '#dde5e4',
  paper: '#eef2f2',
  surface: '#ffffff',
  surfaceSunk: '#f4f6f6',
  accent: '#0b6e76',
  accentSoft: 'rgba(11,110,118,0.10)',
  good: '#0a7a2f',
  goodSoft: 'rgba(12,163,12,0.12)',
  critical: '#c62f2f',
  criticalSoft: 'rgba(208,59,59,0.12)',
  warn: '#8a6100',
  warnSoft: '#fff5dc',
  tono: { azul: '#1f5fbf', ambar: '#b86e00', violeta: '#7a3fc4', verde: '#0a7a2f', coral: '#c8452f' },
  podio: ['#b8860b', '#6f7a86', '#a0522d'],
  deuda: ['#0098b8', '#0063a8', '#1c9a63', '#b89200', '#e07b00', '#d11a1a'],
};

const dark: Tokens = {
  ink: '#e7eeed',
  ink2: '#b3c1be',
  muted: '#7e908d',
  border: '#25322f',
  paper: '#0b1211',
  surface: '#131c1a',
  surfaceSunk: '#0f1716',
  accent: '#4bb8c0',
  accentSoft: 'rgba(75,184,192,0.14)',
  good: '#5fd08a',
  goodSoft: 'rgba(95,208,138,0.14)',
  critical: '#f5847f',
  criticalSoft: 'rgba(245,132,127,0.14)',
  warn: '#e8b25a',
  warnSoft: 'rgba(232,178,90,0.12)',
  tono: { azul: '#7fb0ff', ambar: '#f0b35a', violeta: '#c29bff', verde: '#5fd08a', coral: '#ff9580' },
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
