import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Sesion } from '../api/client';
import { api } from '../api/indicadores';
import { ConCarga } from '../components/Pantalla';
import { ProveedorCaptura, Selector, Vacio, useTheme } from '../components/ui';
import { type PreferenciaTema, useTema } from '../logic/tema';
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
  const [perfilAbierto, setPerfilAbierto] = useState(false);
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
      <View style={[s.cab, { paddingTop: insets.top + SPACE.lg }]}>
        <View style={s.cabFila}>
          <View style={{ flex: 1 }}>
            <Text style={[s.cabSub, { color: t.muted }]} numberOfLines={1}>
              {captura.fecha}
            </Text>
            <Text style={[s.cabTitulo, { color: t.ink }]}>{actual.texto}</Text>
          </View>
          <Pressable
            onPress={() => setPerfilAbierto(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={'Perfil de ' + sesion.Nombre}
            style={({ pressed }) => [s.avatar, { backgroundColor: t.accentSoft, opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[s.avatarTexto, { color: t.accent }]}>{iniciales(sesion.Nombre)}</Text>
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

      <MenuPerfil
        visible={perfilAbierto}
        sesion={sesion}
        arriba={insets.top + SPACE.lg + 48}
        onCerrar={() => setPerfilAbierto(false)}
        onSalir={() => {
          setPerfilAbierto(false);
          onSalir();
        }}
      />

      {/* ---------- barra inferior flotante ---------- */}
      <View style={[s.barraCaja, { paddingBottom: insets.bottom + SPACE.md }]}>
        <View style={[s.barra, { backgroundColor: t.hero }]}>
          {PESTANAS.map((p) => {
            const activa = p.clave === pestana;
            const color = activa ? t.onHero : 'rgba(255,255,255,0.65)';
            return (
              <Pressable
                key={p.clave}
                onPress={() => ir(p.clave)}
                accessibilityRole="tab"
                accessibilityState={{ selected: activa }}
                accessibilityLabel={p.texto}
                style={({ pressed }) => [
                  s.tab,
                  activa && { backgroundColor: 'rgba(255,255,255,0.14)' },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Icono pestana={p.clave} activa={activa} color={color} />
                <Text style={[s.tabTexto, { color, fontWeight: activa ? '700' : '500' }]} numberOfLines={1}>
                  {p.texto}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?';
}

const OPCIONES_TEMA: { valor: PreferenciaTema; texto: string }[] = [
  { valor: 'auto', texto: 'Automático' },
  { valor: 'claro', texto: 'Claro' },
  { valor: 'oscuro', texto: 'Oscuro' },
];

/** Mini menú bajo el avatar: quién está dentro, el tema de la app y cerrar sesión */
function MenuPerfil({
  visible,
  sesion,
  arriba,
  onCerrar,
  onSalir,
}: {
  visible: boolean;
  sesion: Sesion;
  /** Distancia desde arriba de la pantalla, para que el menú salga justo bajo el avatar */
  arriba: number;
  onCerrar: () => void;
  onSalir: () => void;
}) {
  const t = useTheme();
  const tema = useTema();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <Pressable style={s.fondoModal} onPress={onCerrar} accessibilityLabel="Cerrar menú" />
      <View style={[s.menu, { top: arriba, backgroundColor: t.surface, borderColor: t.border }]}>
        <View style={s.menuCab}>
          <View style={[s.avatar, { backgroundColor: t.accentSoft }]}>
            <Text style={[s.avatarTexto, { color: t.accent }]}>{iniciales(sesion.Nombre)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.menuNombre, { color: t.ink }]} numberOfLines={1}>
              {sesion.Nombre}
            </Text>
            {sesion.Perfil ? (
              <Text style={[s.menuPerfil, { color: t.muted }]} numberOfLines={1}>
                {sesion.Perfil}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={onCerrar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Ionicons name="close" size={22} color={t.muted} />
          </Pressable>
        </View>

        <View style={[s.menuSeccion, { borderTopColor: t.border }]}>
          <Text style={[s.menuEtiqueta, { color: t.muted }]}>Tema de la app</Text>
          <Selector opciones={OPCIONES_TEMA} valor={tema.preferencia} onCambio={tema.cambiar} />
        </View>

        <View style={[s.menuSeccion, { borderTopColor: t.border }]}>
          <Pressable
            onPress={onSalir}
            accessibilityRole="button"
            style={({ pressed }) => [s.salir, { backgroundColor: t.criticalSoft, opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="log-out-outline" size={19} color={t.critical} />
            <Text style={[s.salirTexto, { color: t.critical }]}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type NombreIcono = React.ComponentProps<typeof Ionicons>['name'];

/** Ícono de cada pestaña: relleno cuando está activa, de contorno cuando no */
const ICONOS: Record<Pestana, { activo: NombreIcono; inactivo: NombreIcono }> = {
  liquidacion: { activo: 'receipt', inactivo: 'receipt-outline' },
  produccion: { activo: 'speedometer', inactivo: 'speedometer-outline' },
  inventario: { activo: 'cube', inactivo: 'cube-outline' },
  cortes: { activo: 'cut', inactivo: 'cut-outline' },
};

function Icono({ pestana, activa, color }: { pestana: Pestana; activa: boolean; color: string }) {
  const icono = ICONOS[pestana];
  return <Ionicons name={activa ? icono.activo : icono.inactivo} size={21} color={color} />;
}

const s = StyleSheet.create({
  cab: { paddingHorizontal: 20, paddingBottom: SPACE.sm, gap: 14 },
  cabFila: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  cabTitulo: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  cabSub: { fontSize: 13 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontSize: 15, fontWeight: '700' },
  pagina: { flex: 1 },
  estado: { flex: 1, padding: SPACE.lg },
  barraCaja: { paddingHorizontal: 20, paddingTop: SPACE.sm },
  barra: {
    flexDirection: 'row',
    borderRadius: 22,
    padding: SPACE.sm,
    shadowColor: '#0b2a5b',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 6, borderRadius: 14 },
  tabTexto: { fontSize: 10.5 },
  fondoModal: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  menu: {
    position: 'absolute',
    right: 16,
    width: 300,
    maxWidth: '92%',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  menuCab: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.lg },
  menuNombre: { fontSize: 16, fontWeight: '700' },
  menuPerfil: { fontSize: 13 },
  menuSeccion: { borderTopWidth: StyleSheet.hairlineWidth, padding: SPACE.lg, gap: SPACE.sm },
  menuEtiqueta: { fontSize: 13, fontWeight: '600' },
  salir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
    borderRadius: 12,
    paddingVertical: 12,
  },
  salirTexto: { fontSize: 15, fontWeight: '700' },
});
