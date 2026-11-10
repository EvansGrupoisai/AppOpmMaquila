import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '../api/indicadores';
import type { Temporada } from '../api/tipos';
import { ConCarga, Pantalla } from '../components/Pantalla';
import { Bloque, Punto, Vacio, fuenteMono, useTheme } from '../components/ui';
import { useCarga } from '../logic/useCarga';
import { SPACE, type Tokens } from '../theme/tokens';
import { fmtCantidad } from '../utils/format';

/** Mismos rangos que generarColorTable del tablero, con los tonos del semáforo de tokens */
function tonoDeKilos(kilos: number, t: Tokens): string {
  if (kilos >= 10000) return t.deuda[0];
  if (kilos >= 1000) return t.deuda[1];
  if (kilos >= 500) return t.deuda[2];
  if (kilos >= 100) return t.deuda[3];
  if (kilos >= 20) return t.deuda[4];
  return t.deuda[5];
}

export function InventarioScreen({ temporada, pulso }: { temporada: Temporada; pulso: number }) {
  const t = useTheme();
  const idTemporada = temporada.IdTemporada;
  const inventario = useCarga(() => api.inventario(idTemporada), [idTemporada, pulso]);

  return (
    <Pantalla cargas={[inventario]}>
      <Bloque titulo="Presentaciones almacenadas" actualizando={inventario.actualizando}>
        <ConCarga carga={inventario} textoCargando="Consultando el inventario…">
          {(presentaciones) =>
            presentaciones.length === 0 ? (
              <Vacio texto="No hay presentaciones para mostrar." />
            ) : (
              <View>
                {presentaciones.map((p, i) => (
                  <View key={i} style={[s.fila, { borderBottomColor: t.border }]}>
                    <Punto color={tonoDeKilos(p.KilogramosDisponibles, t)} />
                    <Text style={[s.nombre, { color: t.ink }]}>{p.Descripcion}</Text>
                    <Text style={[s.kilos, { color: t.ink }]}>{fmtCantidad(p.KilogramosDisponibles)} kg</Text>
                  </View>
                ))}
              </View>
            )
          }
        </ConCarga>
      </Bloque>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nombre: { flex: 1, fontSize: 15 },
  kilos: { fontFamily: fuenteMono, fontSize: 14, fontWeight: '800' },
});
