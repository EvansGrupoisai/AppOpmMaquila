import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '../api/indicadores';
import type { AvanceLote, Catalogos, Cosecha, KilosGranja, Temporada } from '../api/tipos';
import { ConCarga, Pantalla } from '../components/Pantalla';
import {
  BarraProporcional,
  Bloque,
  Ficha,
  Mosaico,
  Selector,
  Vacio,
  fuenteMono,
  useTheme,
} from '../components/ui';
import { useCarga } from '../logic/useCarga';
import { SPACE, type Tokens } from '../theme/tokens';
import { fmtCantidad, fmtEntero, nombreCorto, pct } from '../utils/format';

/** Misma regla que estadoProduccion del tablero; recibe el porcentaje ya redondeado */
function estadoDe(escaneados: number, porcentaje: number, t: Tokens) {
  if (escaneados <= 0) return { texto: 'En espera', color: t.muted };
  if (porcentaje >= 100) return { texto: 'Completado', color: t.good };
  return { texto: 'En proceso', color: t.tono.azul };
}

type FilaGranja = { nombre: string; cosecha: number | null; preCosecha: number | null };

/** Cada serie puede traer granjas distintas: se alinean por nombre, igual que el tablero */
function unirGranjas(datos: Cosecha): FilaGranja[] {
  const kilos = (serie: KilosGranja[], nombre: string) =>
    serie.find((g) => g.Nombre === nombre)?.KilosCosechados ?? null;
  const nombres = [...new Set([...datos.Cosecha, ...datos.PreCosecha].map((g) => g.Nombre))];
  return nombres.map((nombre) => ({
    nombre,
    cosecha: kilos(datos.Cosecha, nombre),
    preCosecha: kilos(datos.PreCosecha, nombre),
  }));
}

function kg(valor: number | null): string {
  return valor === null ? 'Sin dato' : fmtCantidad(valor) + ' kg';
}

export function ProduccionScreen({
  temporada,
  catalogos,
  pulso,
}: {
  temporada: Temporada;
  /** Empresas y plantas para los filtros de Avance */
  catalogos: Catalogos;
  pulso: number;
}) {
  const t = useTheme();
  // Vacío significa "todas": el parámetro no viaja y el servidor no filtra
  const [empresa, setEmpresa] = useState('');
  const [planta, setPlanta] = useState('');
  const idTemporada = temporada.IdTemporada;

  const avance = useCarga(
    () => api.avance(idTemporada, empresa || undefined, planta || undefined),
    [idTemporada, empresa, planta, pulso]
  );
  const cosecha = useCarga(() => api.cosecha(idTemporada), [idTemporada, pulso]);

  return (
    <Pantalla cargas={[avance, cosecha]}>
      <Bloque
        titulo="Avance de producción"
        actualizando={avance.actualizando}
        filtros={
          <>
            <Selector
              opciones={[
                { valor: '', texto: 'Todas las empresas' },
                ...catalogos.Empresas.map((e) => ({ valor: e.IdEmpresa, texto: nombreCorto(e.Nombre) })),
              ]}
              valor={empresa}
              onCambio={setEmpresa}
            />
            <Selector
              opciones={[
                { valor: '', texto: 'Todas las plantas' },
                ...catalogos.Plantas.map((p) => ({ valor: p.IdPlanta, texto: p.Nombre })),
              ]}
              valor={planta}
              onCambio={setPlanta}
            />
          </>
        }
      >
        <ConCarga carga={avance} textoCargando="Consultando el avance…">
          {(lotes) => (lotes.length === 0 ? <Vacio texto="No hay producción para mostrar." /> : <Avance lotes={lotes} />)}
        </ConCarga>
      </Bloque>

      <Bloque
        titulo="Cosecha y pre-cosecha"
        tono={t.tono.ambar}
        nota="Cosecha / pre-cosecha en kilos. La barra compara la cosecha de cada granja con la mayor."
        actualizando={cosecha.actualizando}
      >
        <ConCarga carga={cosecha} textoCargando="Consultando la cosecha…">
          {(datos) => <Granjas filas={unirGranjas(datos)} />}
        </ConCarga>
      </Bloque>
    </Pantalla>
  );
}

function Avance({ lotes }: { lotes: AvanceLote[] }) {
  const escaneados = lotes.reduce((suma, l) => suma + l.MastersEscaneados, 0);
  const masters = lotes.reduce((suma, l) => suma + l.Masters, 0);
  return (
    <>
      <Mosaico>
        <Ficha valor={fmtEntero(lotes.length)} etiqueta="Lotes" />
        <Ficha valor={fmtCantidad(escaneados)} etiqueta={'de ' + fmtCantidad(masters) + ' masters'} />
        <Ficha valor={Math.round(pct(escaneados, masters)) + '%'} etiqueta="Avance" />
      </Mosaico>
      {lotes.map((lote, i) => (
        <FilaLote key={i} lote={lote} />
      ))}
    </>
  );
}

function FilaLote({ lote }: { lote: AvanceLote }) {
  const t = useTheme();
  const porcentaje = Math.round(lote.porcentaje);
  const estado = estadoDe(lote.MastersEscaneados, porcentaje, t);
  return (
    <View style={s.item}>
      <View style={s.linea}>
        <Text style={[s.nombre, { color: t.ink }]}>{lote.Lote}</Text>
        <Text style={[s.estado, { color: estado.color }]}>{estado.texto}</Text>
      </View>
      <Text style={[s.detalle, { color: t.muted }]}>
        {nombreCorto(lote.Productora)} · {lote.Planta}
      </Text>
      <BarraProporcional porcentaje={porcentaje} color={estado.color} />
      <Text style={[s.detalle, { color: t.muted }]}>
        {fmtCantidad(lote.MastersEscaneados)} / {fmtCantidad(lote.Masters)} masters · {porcentaje}%
      </Text>
    </View>
  );
}

function Granjas({ filas }: { filas: FilaGranja[] }) {
  const t = useTheme();
  if (filas.length === 0) return <Vacio texto="No hay cosecha para mostrar." />;
  const mayor = Math.max(...filas.map((f) => f.cosecha ?? 0));
  return (
    <>
      {filas.map((f) => (
        <View key={f.nombre} style={s.item}>
          <View style={s.lineaGranja}>
            <Text style={[s.nombre, { color: t.ink }]}>{nombreCorto(f.nombre)}</Text>
            <Text style={[s.valor, { color: t.ink }]}>
              {kg(f.cosecha)} / {kg(f.preCosecha)}
            </Text>
          </View>
          {/* Sin cosecha no se pinta la barra: vacía se leería como 0 */}
          {f.cosecha !== null ? (
            <BarraProporcional porcentaje={pct(f.cosecha, mayor)} color={t.tono.ambar} />
          ) : null}
        </View>
      ))}
    </>
  );
}

const s = StyleSheet.create({
  item: { gap: SPACE.xs },
  linea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm },
  // Si el nombre y los kilos no caben juntos, los kilos bajan a su propio renglón
  lineaGranja: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: SPACE.sm,
  },
  nombre: { flexShrink: 1, fontSize: 15, fontWeight: '600' },
  estado: { fontSize: 11, fontWeight: '800' },
  detalle: { fontSize: 12 },
  valor: { fontFamily: fuenteMono, fontSize: 14, fontWeight: '800' },
});
