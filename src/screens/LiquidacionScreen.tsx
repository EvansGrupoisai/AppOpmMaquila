import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '../api/indicadores';
import type { Liquidacion, LoteLiquidado, Temporada } from '../api/tipos';
import { ConCarga, Pantalla } from '../components/Pantalla';
import { RangoFechas } from '../components/RangoFechas';
import {
  BarraProporcional,
  Bloque,
  Celda,
  Cifra,
  ErrorCaja,
  FilaRanking,
  ParCifras,
  Selector,
  Tendencia,
  Vacio,
  fuenteMono,
  useTheme,
} from '../components/ui';
import { useCarga } from '../logic/useCarga';
import { SPACE } from '../theme/tokens';
import { fmtCantidad, fmtEntero, fmtPct, nombreCorto, pct, rangoMesActual, variacion } from '../utils/format';

const SIN_DATOS = 'No hay datos para esta temporada.';
const MAX_PLANTAS = 8;

function kg(n: number): string {
  return fmtCantidad(n) + ' kg';
}

function suma(valores: number[]): number {
  return valores.reduce((total, v) => total + v, 0);
}

/** Igual que la dona web: con más de 8 plantas quedan 7 y el resto se junta en "Otras" */
function agruparPlantas(plantas: Liquidacion['Plantas']): Liquidacion['Plantas'] {
  const ordenadas = [...plantas].sort((a, b) => b.Kilos - a.Kilos);
  if (ordenadas.length <= MAX_PLANTAS) return ordenadas;
  const resto = ordenadas.slice(MAX_PLANTAS - 1);
  return [...ordenadas.slice(0, MAX_PLANTAS - 1), { Nombre: 'Otras', Kilos: suma(resto.map((p) => p.Kilos)) }];
}

function FilaBarra({
  nombre,
  valor,
  porcentaje,
  color,
  detalle,
}: {
  nombre: string;
  valor: string;
  porcentaje: number;
  color: string;
  detalle?: string;
}) {
  const t = useTheme();
  return (
    <View style={s.filaBarra}>
      <View style={s.filaBarraCab}>
        <Text style={[s.nombre, { color: t.ink }]} numberOfLines={2}>
          {nombre}
        </Text>
        <Text style={[s.valor, { color: t.ink }]}>{valor}</Text>
      </View>
      <BarraProporcional porcentaje={porcentaje} color={color} />
      {detalle ? <Text style={[s.detalle, { color: t.muted }]}>{detalle}</Text> : null}
    </View>
  );
}

function BloquesTemporada({ datos, actualizando }: { datos: Liquidacion; actualizando: boolean }) {
  const t = useTheme();
  const total = suma(datos.Productoras.map((p) => p.KilosActual));
  const totalAnterior = suma(datos.Productoras.map((p) => p.KilosAnterior));
  // Productoras también trae las que solo liquidaron la temporada anterior: una
  // temporada sin kilos puede llegar con filas, todas con KilosActual en 0
  const sinKilos = total <= 0;
  const comparada = datos.TemporadaAnterior !== null;
  const mayorProductora = datos.Productoras.length ? datos.Productoras[0].KilosActual : 0;

  const plantas = agruparPlantas(datos.Plantas);
  const totalPlantas = suma(plantas.map((p) => p.Kilos));
  const productos = [...datos.TopProductos].sort((a, b) => b.Kilos - a.Kilos);

  return (
    <>
      <Bloque titulo="Kilos liquidados en la temporada" destacado actualizando={actualizando}>
        {sinKilos ? (
          <Vacio texto={SIN_DATOS} />
        ) : (
          <Cifra
            valor={kg(total)}
            pie={
              comparada ? (
                <Tendencia valor={variacion(total, totalAnterior)} sufijo={'contra ' + datos.TemporadaAnterior} />
              ) : undefined
            }
          />
        )}
      </Bloque>

      <Bloque titulo="Por productora" tono={t.tono.azul} actualizando={actualizando}>
        {sinKilos ? (
          <Vacio texto={SIN_DATOS} />
        ) : (
          datos.Productoras.map((p) => (
            <FilaBarra
              key={p.Nombre}
              nombre={nombreCorto(p.Nombre)}
              valor={kg(p.KilosActual)}
              porcentaje={pct(p.KilosActual, mayorProductora)}
              color={t.tono.azul}
              detalle={comparada ? 'Anterior: ' + kg(p.KilosAnterior) : undefined}
            />
          ))
        )}
      </Bloque>

      <Bloque titulo="Por planta" tono={t.tono.verde} actualizando={actualizando}>
        {plantas.length === 0 ? (
          <Vacio texto={SIN_DATOS} />
        ) : (
          plantas.map((p, i) => (
            <FilaBarra
              key={i}
              nombre={p.Nombre}
              valor={kg(p.Kilos) + ' · ' + fmtPct(pct(p.Kilos, totalPlantas))}
              porcentaje={pct(p.Kilos, totalPlantas)}
              color={p.Nombre === 'Otras' ? t.muted : t.tono.verde}
            />
          ))
        )}
      </Bloque>

      <Bloque titulo="Top de productos" tono={t.tono.ambar} actualizando={actualizando}>
        {productos.length === 0 ? (
          <Vacio texto={SIN_DATOS} />
        ) : (
          <View>
            {productos.map((p, i) => (
              <FilaRanking key={i} posicion={i + 1} nombre={p.Descripcion} valor={kg(p.Kilos)} />
            ))}
          </View>
        )}
      </Bloque>
    </>
  );
}

function ListaLotes({ filas }: { filas: LoteLiquidado[] }) {
  const t = useTheme();
  if (filas.length === 0) return <Vacio texto="No hay lotes liquidados en este rango." />;
  return (
    <>
      <ParCifras>
        <Celda>
          <Cifra etiqueta="Lotes" valor={fmtEntero(filas.length)} tamano="md" />
        </Celda>
        <Celda>
          <Cifra etiqueta="Kilos" valor={kg(suma(filas.map((f) => f.TotalKilos)))} tamano="md" />
        </Celda>
      </ParCifras>
      <View>
        {filas.map((f, i) => (
          <View key={i} style={[s.lote, { borderBottomColor: t.border }]}>
            <View style={s.loteTextos}>
              <Text style={[s.nombre, { color: t.ink }]} numberOfLines={2}>
                {f.Lote}
              </Text>
              <Text style={[s.detalle, { color: t.muted }]} numberOfLines={1}>
                {f.PlantaNombre}
              </Text>
            </View>
            <Text style={[s.valor, { color: t.ink }]}>{kg(f.TotalKilos)}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

export function LiquidacionScreen({ temporada, pulso }: { temporada: Temporada; pulso: number }) {
  const t = useTheme();
  const [rango, setRango] = useState(rangoMesActual);
  const [idPlanta, setIdPlanta] = useState('');

  // Un solo endpoint alimenta los cuatro bloques de temporada
  const liquidacion = useCarga(() => api.liquidacion(temporada.IdTemporada), [temporada.IdTemporada, pulso]);
  const plantas = useCarga(() => api.plantasLotes(), [pulso]);
  const lotes = useCarga(
    () => api.lotesLiquidados(rango.inicio, rango.fin, idPlanta || undefined),
    [rango.inicio, rango.fin, idPlanta, pulso]
  );

  const opcionesPlanta = [
    { valor: '', texto: 'Todas las plantas' },
    ...(plantas.datos ?? []).map((p) => ({ valor: p.IdPlanta, texto: p.Nombre })),
  ];

  return (
    <Pantalla cargas={[liquidacion, plantas, lotes]}>
      <ConCarga carga={liquidacion} textoCargando="Consultando la liquidación…">
        {(datos) => <BloquesTemporada datos={datos} actualizando={liquidacion.actualizando} />}
      </ConCarga>

      <Bloque
        titulo="Lotes liquidados"
        tono={t.tono.violeta}
        actualizando={lotes.actualizando}
        filtros={
          <>
            <Selector opciones={opcionesPlanta} valor={idPlanta} onCambio={setIdPlanta} />
            {plantas.error ? <ErrorCaja mensaje={plantas.error} onReintentar={plantas.recargar} /> : null}
            <RangoFechas inicio={rango.inicio} fin={rango.fin} onCambio={(inicio, fin) => setRango({ inicio, fin })} />
          </>
        }
      >
        <ConCarga carga={lotes} textoCargando="Consultando los lotes…">
          {(filas) => <ListaLotes filas={filas} />}
        </ConCarga>
      </Bloque>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  filaBarra: { gap: SPACE.xs },
  filaBarraCab: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  nombre: { flex: 1, fontSize: 15, fontWeight: '600' },
  valor: { fontFamily: fuenteMono, fontSize: 14, fontWeight: '700' },
  detalle: { fontSize: 12 },
  lote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  loteTextos: { flex: 1, gap: 1 },
});
