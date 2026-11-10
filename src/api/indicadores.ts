import { get, getSesion, post } from './client';
import type {
  AvanceLote,
  Catalogos,
  CorteCliente,
  Cosecha,
  Liquidacion,
  LoteLiquidado,
  PlantaLotes,
  PresentacionInventario,
} from './tipos';

// Una función por endpoint de AppIndicadoresController. Los parámetros opcionales que
// se omiten no viajan en el JSON y el servidor los recibe como "todas".

const R = '/AppIndicadores/';

export const api = {
  sesion: getSesion,

  catalogos: () => get<Catalogos>(R + 'Catalogos'),

  liquidacion: (idTemporada: string) => post<Liquidacion>(R + 'Liquidacion', { idTemporada }),

  /** No depende de la temporada */
  lotesLiquidados: (fechaInicio: string, fechaFin: string, idPlanta?: string) =>
    post<LoteLiquidado[]>(R + 'LotesLiquidados', { idPlanta, fechaInicio, fechaFin }),

  plantasLotes: () => get<PlantaLotes[]>(R + 'PlantasLotes'),

  avance: (idTemporada: string, empresa?: string, planta?: string) =>
    post<AvanceLote[]>(R + 'Avance', { idTemporada, empresa, planta }),

  cosecha: (idTemporada: string) => post<Cosecha>(R + 'Cosecha', { idTemporada }),

  inventario: (idTemporada: string) =>
    post<PresentacionInventario[]>(R + 'Inventario', { idTemporada }),

  cortes: (idTemporada: string, fechaInicio: string, fechaFin: string) =>
    post<CorteCliente[]>(R + 'Cortes', { idTemporada, fechaInicio, fechaFin }),
};
