import React, { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Sesion } from '../api/client';
import { api } from '../api/indicadores';
import { ConCarga } from '../components/Pantalla';
import { ProveedorCaptura, Selector, Vacio, useTheme } from '../components/ui';
import { useCarga } from '../logic/useCarga';
import { SPACE } from '../theme/tokens';
import { capitaliza, claveDe, fechaLarga } from '../utils/format';
import { CortesScreen } from './CortesScreen';
import { InventarioScreen } from './InventarioScreen';
import { LiquidacionScreen } from './LiquidacionScreen';
import { ProduccionScreen } from './ProduccionScreen';

type Pestana = 'liquidacion' | 'produccion' | 'inventario' | 'cortes';

const PESTANAS: { clave: Pestana; texto: string }[] = [
  { clave: 'liquidacion', texto: 'Liquidación' },
  { clave: 'produccion', texto: 'Producción' },
  { clave: 'inventario', texto: 'Inventario' },
  { clave: 'cortes', texto: 'Cortes' },
];

/** Si la app estuvo en segundo plano más de esto, al volver se refrescan los datos */
const REFRESCO_AL_VOLVER_MS = 60_000;

export function MainScreen({ sesion, onSalir }: { sesion: Sesion; onSalir: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [pestana, setPestana] = useState<Pestana>('liquidacion');
  // Null hasta que el usuario elige: mientras tanto rige la temporada de mayor folio
  const [idTemporada, setIdTemporada] = useState<string | null>(null);
  // Las pestañas se montan la primera vez que se visitan y después se conservan,
  // para no volver a consultar el servidor cada vez que el usuario cambia de pestaña.
  const [visitadas, setVisitadas] = useState<Record<Pestana, boolean>>({
    liquidacion: true,
    produccion: false,
    inventario: false,
    cortes: false,
  });
  // Cambiar este número hace que todas las pestañas montadas vuelvan a consultar
  const [pulso, setPulso] = useState(0);
  const enFondoDesde = useRef<number | null>(null);

  const carga = useCarga(() => api.catalogos(), [pulso]);
  const catalogos = carga.datos;
  const temporadas = [...(catalogos?.Temporadas ?? [])].sort((a, b) => b.Folio - a.Folio);
  const temporada = temporadas.find((x) => x.IdTemporada === idTemporada) ?? temporadas[0] ?? null;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        const desde = enFondoDesde.current;
        enFondoDesde.current = null;
        if (desde !== null && Date.now() - desde > REFRESCO_AL_VOLVER_MS) setPulso((p) => p + 1);
      } else if (enFondoDesde.current === null) {
        enFondoDesde.current = Date.now();
      }
    });
    return () => sub.remove();
  }, []);

  function ir(p: Pestana) {
    setPestana(p);
    setVisitadas((v) => (v[p] ? v : { ...v, [p]: true }));
  }

  const actual = PESTANAS.find((p) => p.clave === pestana)!;
  const captura = {
    unidad: 'Maquila · ' + (temporada?.Descripcion ?? ''),
    fecha: capitaliza(fechaLarga(claveDe(new Date()))),
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.paper }}>
      {/* ---------- encabezado ---------- */}
      <View style={[s.cab, { backgroundColor: t.surface, borderBottomColor: t.border, paddingTop: insets.top + SPACE.sm }]}>
        <View style={s.cabFila}>
          <View style={{ flex: 1 }}>
            <Text style={[s.cabTitulo, { color: t.ink }]}>{actual.texto}</Text>
            <Text style={[s.cabSub, { color: t.muted }]} numberOfLines={1}>
              {captura.fecha} · {sesion.Nombre}
            </Text>
          </View>
          <Pressable
            onPress={onSalir}
            hitSlop={8}
            accessibilityRole="button"
            style={({ pressed }) => [s.salir, { borderColor: t.border, opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[s.salirTexto, { color: t.ink2 }]}>Salir</Text>
          </Pressable>
        </View>
        {temporada ? (
          <Selector
            opciones={temporadas.map((x) => ({ valor: x.IdTemporada, texto: x.Descripcion }))}
            valor={temporada.IdTemporada}
            onCambio={setIdTemporada}
          />
        ) : null}
      </View>

      {/* ---------- pestañas ---------- */}
      <ProveedorCaptura value={captura}>
        <View style={{ flex: 1 }}>
          {catalogos && temporada ? (
            PESTANAS.map((p) =>
              visitadas[p.clave] ? (
                <View key={p.clave} style={[s.pagina, { display: p.clave === pestana ? 'flex' : 'none' }]}>
                  {p.clave === 'liquidacion' ? <LiquidacionScreen temporada={temporada} pulso={pulso} /> : null}
                  {p.clave === 'produccion' ? (
                    <ProduccionScreen temporada={temporada} catalogos={catalogos} pulso={pulso} />
                  ) : null}
                  {p.clave === 'inventario' ? <InventarioScreen temporada={temporada} pulso={pulso} /> : null}
                  {p.clave === 'cortes' ? <CortesScreen temporada={temporada} pulso={pulso} /> : null}
                </View>
              ) : null
            )
          ) : (
            <View style={s.estado}>
              <ConCarga carga={carga} textoCargando="Consultando las temporadas…">
                {() => <Vacio texto="No hay temporadas registradas." />}
              </ConCarga>
            </View>
          )}
        </View>
      </ProveedorCaptura>

      {/* ---------- barra inferior ---------- */}
      <View style={[s.barra, { backgroundColor: t.surface, borderTopColor: t.border, paddingBottom: insets.bottom + 6 }]}>
        {PESTANAS.map((p) => {
          const activa = p.clave === pestana;
          return (
            <Pressable
              key={p.clave}
              onPress={() => ir(p.clave)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activa }}
              accessibilityLabel={p.texto}
              style={({ pressed }) => [s.tab, pressed && { opacity: 0.6 }]}
            >
              <Text style={[s.tabTexto, { color: activa ? t.accent : t.muted, fontWeight: activa ? '800' : '600' }]}>
                {p.texto}
              </Text>
              <View style={[s.tabMarca, { backgroundColor: activa ? t.accent : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  cab: { paddingHorizontal: SPACE.lg, paddingBottom: SPACE.md, borderBottomWidth: 1, gap: SPACE.md },
  cabFila: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  cabTitulo: { fontSize: 26, fontWeight: '900', letterSpacing: -0.6 },
  cabSub: { fontSize: 12.5 },
  salir: { borderWidth: 1, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 14 },
  salirTexto: { fontSize: 13, fontWeight: '700' },
  pagina: { flex: 1 },
  estado: { flex: 1, padding: SPACE.lg },
  barra: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 10 },
  tab: { flex: 1, alignItems: 'center', gap: 1 },
  tabTexto: { fontSize: 12 },
  tabMarca: { width: 18, height: 3, borderRadius: 2, marginTop: 3 },
});
