// Espejo de lo que devuelve AppIndicadoresController del sistema web.
// Los Guid llegan como texto y las fechas de los filtros se mandan como "YYYY-MM-DD".

export type { Sesion } from './client';

export type Temporada = { IdTemporada: string; Descripcion: string; Folio: number };
export type Empresa = { IdEmpresa: string; Nombre: string };
export type Planta = { IdPlanta: string; Nombre: string };

export type Catalogos = {
  Temporadas: Temporada[];
  Empresas: Empresa[];
  Plantas: Planta[];
};

export type Liquidacion = {
  TemporadaActual: string;
  /** null es la única señal de "sin comparación": no hay temporada anterior o no tiene kilos */
  TemporadaAnterior: string | null;
  /** Ordenadas por KilosActual descendente; 0 en el lado donde la productora no aparece */
  Productoras: { Nombre: string; KilosActual: number; KilosAnterior: number }[];
  Plantas: { Nombre: string; Kilos: number }[];
  TopProductos: { Descripcion: string; Kilos: number }[];
};

export type LoteLiquidado = { PlantaNombre: string; Lote: string; TotalKilos: number };

export type PlantaLotes = { IdPlanta: string; Nombre: string };

export type AvanceLote = {
  Productora: string;
  Planta: string;
  Lote: string;
  Masters: number;
  MastersEscaneados: number;
  /** Así llega del servidor, en minúsculas */
  porcentaje: number;
};

export type KilosGranja = { Nombre: string; KilosCosechados: number };

export type Cosecha = { Cosecha: KilosGranja[]; PreCosecha: KilosGranja[] };

export type PresentacionInventario = { Descripcion: string; KilogramosDisponibles: number };

export type CorteCliente = { ClienteNombre: string; TotalPonchos: number; TotalPagado: number };
