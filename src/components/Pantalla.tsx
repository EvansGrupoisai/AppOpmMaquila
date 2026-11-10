import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';

import type { Carga } from '../logic/useCarga';
import { SPACE } from '../theme/tokens';
import { Cargando, ErrorCaja, useTheme } from './ui';

/** Contenedor desplazable de cada pestaña, con "jalar para actualizar" */
export function Pantalla({
  cargas,
  children,
}: {
  /** Todo lo que se recarga al jalar hacia abajo */
  cargas: Carga<unknown>[];
  children: React.ReactNode;
}) {
  const t = useTheme();
  const [refrescando, setRefrescando] = useState(false);

  async function refrescar() {
    setRefrescando(true);
    try {
      await Promise.all(cargas.map((c) => c.recargar()));
    } finally {
      setRefrescando(false);
    }
  }

  const horas = cargas.map((c) => c.actualizado).filter(Boolean).sort();
  const ultima = horas.length ? horas[horas.length - 1] : '';

  return (
    <ScrollView
      contentContainerStyle={s.lista}
      refreshControl={
        <RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={t.accent} colors={[t.accent]} />
      }
    >
      {children}
      <Text style={[s.pie, { color: t.muted }]}>
        {ultima ? 'Actualizado a las ' + ultima + ' · jala hacia abajo para refrescar' : ' '}
      </Text>
    </ScrollView>
  );
}

/**
 * Pinta el estado de una carga: spinner la primera vez, error con reintento, o el
 * contenido con los datos (atenuado por el Bloque mientras llega la versión nueva).
 * Con error no se pintan los datos previos: pueden ser de otro filtro o temporada.
 */
export function ConCarga<T>({
  carga,
  children,
  textoCargando,
}: {
  carga: Carga<T>;
  children: (datos: T) => React.ReactNode;
  textoCargando?: string;
}) {
  if (carga.cargando) return <Cargando texto={textoCargando} />;
  if (carga.error) return <ErrorCaja mensaje={carga.error} onReintentar={carga.recargar} />;
  if (!carga.datos) return null;
  return <>{children(carga.datos)}</>;
}

const s = StyleSheet.create({
  lista: { padding: SPACE.lg, paddingBottom: SPACE.xxl * 2 },
  pie: { textAlign: 'center', fontSize: 12, marginTop: SPACE.sm },
});
