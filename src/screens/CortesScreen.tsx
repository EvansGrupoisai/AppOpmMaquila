import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '../api/indicadores';
import type { CorteCliente, Temporada } from '../api/tipos';
import { ConCarga, Pantalla } from '../components/Pantalla';
import { RangoFechas } from '../components/RangoFechas';
import { BarraProporcional, Bloque, Cifra, Ficha, Mosaico, Vacio, fuenteMono, useTheme } from '../components/ui';
import { useCarga } from '../logic/useCarga';
import { SPACE } from '../theme/tokens';
import { fmtCantidad, fmtEntero, fmtMoney, pct, rangoMesActual } from '../utils/format';

export function CortesScreen({ temporada, pulso }: { temporada: Temporada; pulso: number }) {
  const [rango, setRango] = useState(rangoMesActual);
  const idTemporada = temporada.IdTemporada;
  const cortes = useCarga(
    () => api.cortes(idTemporada, rango.inicio, rango.fin),
    [idTemporada, rango.inicio, rango.fin, pulso]
  );

  return (
    <Pantalla cargas={[cortes]}>
      <Bloque
        titulo="Ponchos y pagos por cliente"
        actualizando={cortes.actualizando}
        filtros={<RangoFechas inicio={rango.inicio} fin={rango.fin} onCambio={(inicio, fin) => setRango({ inicio, fin })} />}
      >
        <ConCarga carga={cortes} textoCargando="Consultando los cortes…">
          {(clientes) =>
            clientes.length === 0 ? <Vacio texto="No hay cortes en estas fechas." /> : <Ranking clientes={clientes} />
          }
        </ConCarga>
      </Bloque>
    </Pantalla>
  );
}

function Ranking({ clientes }: { clientes: CorteCliente[] }) {
  const ordenados = [...clientes].sort((a, b) => b.TotalPagado - a.TotalPagado);
  const mayor = ordenados[0].TotalPagado;
  return (
    <>
      <Cifra
        etiqueta="Total pagado"
        valor={fmtMoney(clientes.reduce((suma, c) => suma + c.TotalPagado, 0))}
        tamano="lg"
      />
      <Mosaico>
        <Ficha valor={fmtEntero(clientes.length)} etiqueta="Clientes" />
        <Ficha valor={fmtCantidad(clientes.reduce((suma, c) => suma + c.TotalPonchos, 0))} etiqueta="Ponchos" />
      </Mosaico>
      {ordenados.map((cliente, i) => (
        <FilaCliente key={i} posicion={i + 1} cliente={cliente} mayor={mayor} />
      ))}
    </>
  );
}

function FilaCliente({ posicion, cliente, mayor }: { posicion: number; cliente: CorteCliente; mayor: number }) {
  const t = useTheme();
  const podio = posicion <= 3 ? t.podio[posicion - 1] : null;
  return (
    <View style={s.fila}>
      <Text style={[s.posicion, { color: podio || t.muted }]}>{posicion}</Text>
      <View style={s.cuerpo}>
        <View style={s.linea}>
          <Text style={[s.nombre, { color: t.ink }]}>{cliente.ClienteNombre}</Text>
          <Text style={[s.importe, { color: t.ink }]}>{fmtMoney(cliente.TotalPagado)}</Text>
        </View>
        <BarraProporcional porcentaje={pct(cliente.TotalPagado, mayor)} />
        <Text style={[s.detalle, { color: t.muted }]}>{fmtCantidad(cliente.TotalPonchos)} ponchos</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', gap: SPACE.md },
  posicion: { width: 26, fontFamily: fuenteMono, fontSize: 18, fontWeight: '900' },
  cuerpo: { flex: 1, gap: SPACE.xs },
  linea: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACE.sm },
  nombre: { flexShrink: 1, fontSize: 15, fontWeight: '600' },
  importe: { fontFamily: fuenteMono, fontSize: 14, fontWeight: '800' },
  detalle: { fontSize: 12 },
});
