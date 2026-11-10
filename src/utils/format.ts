// Formateadores de cifras y fechas.
//
// No se usa toLocaleString('es-MX'): el soporte de Intl varía entre Hermes, JSC y
// las versiones de Android, y una cifra de dinero que cambia según el teléfono es
// peor que no formatearla. Se agrupa a mano. Las fechas tampoco pasan por
// new Date("YYYY-MM-DD"), que interpreta UTC y recorre el día.

function agrupar(entero: string): string {
  let salida = '';
  let cuenta = 0;
  for (let i = entero.length - 1; i >= 0; i--) {
    salida = entero[i] + salida;
    cuenta++;
    if (cuenta % 3 === 0 && i > 0) salida = ',' + salida;
  }
  return salida;
}

function numero(n: number, decimales: number): string {
  const valor = Number(n);
  const seguro = isFinite(valor) ? valor : 0;
  const negativo = seguro < 0;
  const [entero, frac] = Math.abs(seguro).toFixed(decimales).split('.');
  let texto = agrupar(entero);
  if (frac && frac.length) texto += '.' + frac;
  return (negativo ? '-' : '') + texto;
}

/** $1,234,567.89 */
export function fmtMoney(n: number): string {
  const s = numero(n, 2);
  return s.startsWith('-') ? '-$' + s.slice(1) : '$' + s;
}

/** $1,234,568 */
export function fmtMoneyCorto(n: number): string {
  const s = numero(n, 0);
  return s.startsWith('-') ? '-$' + s.slice(1) : '$' + s;
}

/** $1.2 M · $845 k · $920 — para titulares donde importa leer rápido */
export function fmtMoneyCompacto(n: number): string {
  const abs = Math.abs(n);
  const signo = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return signo + '$' + numero(abs / 1_000_000, abs >= 10_000_000 ? 1 : 2) + ' M';
  if (abs >= 10_000) return signo + '$' + numero(abs / 1_000, 0) + ' k';
  return signo + '$' + numero(abs, 0);
}

export function fmtEntero(n: number): string {
  return numero(n, 0);
}

/** 1,234.5 — cantidades que pueden traer fracción (kg, piezas de hielo) */
export function fmtCantidad(n: number): string {
  return Number.isInteger(Number(n)) ? numero(n, 0) : numero(n, 2);
}

/** 12.3% */
export function fmtPct(n: number): string {
  return numero(n, 1) + '%';
}

/** Variación porcentual de actual contra anterior; null si no hay base para compararse */
export function variacion(actual: number, anterior: number): number | null {
  if (!anterior) return null;
  return ((actual - anterior) / Math.abs(anterior)) * 100;
}

/** Porcentaje de parte sobre total, 0 si el total es 0 */
export function pct(parte: number, total: number): number {
  return total > 0 ? (parte / total) * 100 : 0;
}

/** Quita la razón social (S.A. de C.V., S.P.R. de R.L., etc.), igual que el tablero web */
export function nombreCorto(nombre: string): string {
  return (nombre || '')
    .replace(/,?\s*\bS\.?\s*(A\.?|(DE\s*)?P\.?\s*R\.?|(DE\s*)?R\.?\s*L\.?)(\s*DE\s*(C\.?\s*V\.?|R\.?\s*L\.?))*\.?(?=[\s,(]|$)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ---------------- fechas ---------------- */

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function partes(clave: string): { y: number; m: number; d: number } {
  return {
    y: parseInt(clave.substring(0, 4), 10),
    m: parseInt(clave.substring(5, 7), 10),
    d: parseInt(clave.substring(8, 10), 10) || 1,
  };
}

/** Date -> "YYYY-MM-DD" en hora local */
export function claveDe(fecha: Date): string {
  const m = fecha.getMonth() + 1;
  const d = fecha.getDate();
  return fecha.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d);
}

export function deClave(clave: string): Date {
  const { y, m, d } = partes(clave);
  return new Date(y, m - 1, d);
}

/** Del día 1 del mes en curso a hoy, en hora local, como "YYYY-MM-DD" */
export function rangoMesActual(): { inicio: string; fin: string } {
  const hoy = new Date();
  return { inicio: claveDe(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), fin: claveDe(hoy) };
}

export function mesNombre(mes: number): string {
  return MESES[mes - 1] || '';
}

export function capitaliza(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** "2026-09-29" -> "martes 29 de septiembre" */
export function fechaLarga(clave: string): string {
  if (!clave || clave.length < 10) return clave || '';
  const f = deClave(clave);
  return DIAS[f.getDay()] + ' ' + f.getDate() + ' de ' + MESES[f.getMonth()];
}

/** "2026-09-29" -> "mar 29 sep" */
export function fechaCorta(clave: string): string {
  if (!clave || clave.length < 10) return clave || '';
  const f = deClave(clave);
  return DIAS_CORTOS[f.getDay()] + ' ' + f.getDate() + ' ' + MESES_CORTOS[f.getMonth()];
}

/** "2026-09" -> "Septiembre" */
export function mesDeClave(clave: string): string {
  return capitaliza(MESES[partes(clave).m - 1] || clave);
}

/** "2026-09-01","2026-09-29" -> "1 sep – 29 sep 2026" */
export function rangoTexto(inicio: string, fin: string): string {
  if (!inicio || !fin) return '';
  const a = partes(inicio);
  const b = partes(fin);
  const izq = a.d + ' ' + MESES_CORTOS[a.m - 1] + (a.y !== b.y ? ' ' + a.y : '');
  return izq + ' – ' + b.d + ' ' + MESES_CORTOS[b.m - 1] + ' ' + b.y;
}

/** "2026-09-29 14:05" -> "29 sep 2026 · 14:05" */
export function fechaHora(texto: string): string {
  if (!texto || texto.length < 10) return texto || '';
  const { y, m, d } = partes(texto);
  const hora = texto.length >= 16 ? ' · ' + texto.substring(11, 16) : '';
  return d + ' ' + MESES_CORTOS[m - 1] + ' ' + y + hora;
}

export function horaActual(): string {
  const f = new Date();
  const h = f.getHours();
  const m = f.getMinutes();
  return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
}
