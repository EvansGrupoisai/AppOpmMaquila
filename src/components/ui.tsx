import React, { createContext, useContext, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { MONO, SPACE, getTokens } from '../theme/tokens';
import { ErrorCaptura, capturarYCompartir, esperarPintado, nombreArchivo } from '../utils/compartir';
import { fmtPct } from '../utils/format';

export function useTheme() {
  return getTokens(useColorScheme());
}

const mono = Platform.select(MONO);

/* ======================================================================
   Contexto de captura: qué temporada y qué fecha se imprimen en la imagen
   ====================================================================== */

type ContextoCaptura = { unidad: string; fecha: string };
const Captura = createContext<ContextoCaptura>({ unidad: '', fecha: '' });
export const ProveedorCaptura = Captura.Provider;

/* ======================================================================
   Bloque: tarjeta con franja de color, título y botón de compartir
   ====================================================================== */

type BloqueProps = {
  titulo: string;
  /** Color de la franja superior y del título */
  tono?: string;
  nota?: string;
  children: React.ReactNode;
  /** Controles a la derecha del título (por ejemplo, "Ver todos") */
  accion?: React.ReactNode;
  /** Chips o navegador que van bajo el título; no salen en la imagen compartida */
  filtros?: React.ReactNode;
  /** Pinta el contenido atenuado mientras llega la respuesta nueva */
  actualizando?: boolean;
  compartible?: boolean;
};

export function Bloque({
  titulo,
  tono,
  nota,
  children,
  accion,
  filtros,
  actualizando,
  compartible = true,
}: BloqueProps) {
  const t = useTheme();
  const ctx = useContext(Captura);
  const ref = useRef<React.ComponentRef<typeof View> | null>(null);
  const [capturando, setCapturando] = useState(false);
  const color = tono || t.accent;
  // En el navegador no hay hoja de compartir del sistema ni captura del árbol de vistas
  const puedeCompartir = compartible && Platform.OS !== 'web';

  async function compartir() {
    setCapturando(true);
    try {
      await esperarPintado();
      await capturarYCompartir(ref.current, nombreArchivo(ctx.unidad, ctx.fecha, titulo), titulo);
    } catch (e) {
      Alert.alert(
        'No se pudo compartir',
        e instanceof ErrorCaptura ? e.message : 'Ocurrió un error al generar la imagen.'
      );
    } finally {
      setCapturando(false);
    }
  }

  return (
    <View
      ref={ref}
      collapsable={false}
      style={[s.bloque, { backgroundColor: t.surface, borderColor: t.border }]}
    >
      <View style={[s.franja, { backgroundColor: color }]} />
      <View style={s.bloqueInterior}>
        {capturando ? (
          <View style={[s.capCab, { borderBottomColor: t.border }]}>
            <Text style={[s.capUnidad, { color: t.ink }]}>{ctx.unidad}</Text>
            <Text style={[s.capFecha, { color: t.muted }]}>{ctx.fecha}</Text>
          </View>
        ) : null}

        <View style={s.bloqueCab}>
          <Text style={[s.bloqueTitulo, { color }]}>{titulo}</Text>
          {actualizando ? <ActivityIndicator size="small" color={color} /> : null}
          {!capturando ? accion : null}
          {puedeCompartir && !capturando ? (
            <Pressable
              onPress={compartir}
              accessibilityRole="button"
              accessibilityLabel={'Compartir ' + titulo + ' como imagen'}
              hitSlop={8}
              style={({ pressed }) => [
                s.btnCompartir,
                { borderColor: t.border, backgroundColor: t.surfaceSunk, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[s.btnCompartirTexto, { color: t.ink2 }]}>Compartir</Text>
            </Pressable>
          ) : null}
        </View>

        {filtros && !capturando ? <View style={s.filtros}>{filtros}</View> : null}
        {nota ? <Text style={[s.nota, { color: t.muted }]}>{nota}</Text> : null}

        <View style={[s.bloqueCuerpo, actualizando && { opacity: 0.45 }]}>{children}</View>
      </View>
    </View>
  );
}

/* ======================================================================
   Cifra grande: el número que se lee primero
   ====================================================================== */

export function Cifra({
  etiqueta,
  valor,
  color,
  tamano = 'xl',
  pie,
  alinear = 'left',
}: {
  etiqueta?: string;
  valor: string;
  color?: string;
  tamano?: 'xl' | 'lg' | 'md';
  pie?: React.ReactNode;
  alinear?: 'left' | 'center';
}) {
  const t = useTheme();
  const fontSize = tamano === 'xl' ? 40 : tamano === 'lg' ? 30 : 23;
  return (
    <View style={{ alignItems: alinear === 'center' ? 'center' : 'flex-start', gap: 2 }}>
      {etiqueta ? <Text style={[s.cifraEtiqueta, { color: t.muted }]}>{etiqueta}</Text> : null}
      <Text
        style={[s.cifraValor, { color: color || t.ink, fontSize, lineHeight: fontSize * 1.15 }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
        {valor}
      </Text>
      {pie ? (
        typeof pie === 'string' ? <Text style={[s.cifraPie, { color: t.ink2 }]}>{pie}</Text> : pie
      ) : null}
    </View>
  );
}

/** Dos cifras lado a lado, para comparar A contra B */
export function ParCifras({ children }: { children: React.ReactNode }) {
  return <View style={s.par}>{children}</View>;
}

export function Celda({ children }: { children: React.ReactNode }) {
  return <View style={s.celda}>{children}</View>;
}

/* ======================================================================
   Tendencia: píldora ▲ 12.3% / ▼ 4.1% / sin comparación
   ====================================================================== */

export function Tendencia({
  valor,
  sufijo,
  subirEsBueno = true,
}: {
  valor: number | null;
  sufijo?: string;
  subirEsBueno?: boolean;
}) {
  const t = useTheme();
  if (valor === null) {
    return (
      <View style={[s.pill, { backgroundColor: t.surfaceSunk, borderColor: t.border }]}>
        <Text style={[s.pillTexto, { color: t.muted }]}>Sin base para comparar</Text>
      </View>
    );
  }
  const igual = Math.abs(valor) < 0.05;
  const sube = valor > 0;
  const bueno = igual ? null : sube === subirEsBueno;
  const color = bueno === null ? t.ink2 : bueno ? t.good : t.critical;
  const fondo = bueno === null ? t.surfaceSunk : bueno ? t.goodSoft : t.criticalSoft;
  const flecha = igual ? '=' : sube ? '▲' : '▼';
  return (
    <View style={[s.pill, { backgroundColor: fondo, borderColor: fondo }]}>
      <Text style={[s.pillTexto, { color }]}>
        {flecha} {igual ? 'Sin cambio' : fmtPct(Math.abs(valor))}
        {sufijo ? <Text style={{ fontWeight: '600' }}>{' ' + sufijo}</Text> : null}
      </Text>
    </View>
  );
}

/* ======================================================================
   Titular: una frase con las palabras clave resaltadas
   ====================================================================== */

export type Segmento = string | { b: string; color?: string };

export function Titular({ partes, tamano = 17 }: { partes: Segmento[]; tamano?: number }) {
  const t = useTheme();
  return (
    <Text style={[s.titular, { color: t.ink2, fontSize: tamano, lineHeight: tamano * 1.42 }]}>
      {partes.map((p, i) =>
        typeof p === 'string' ? (
          <Text key={i}>{p}</Text>
        ) : (
          <Text key={i} style={{ fontWeight: '800', color: p.color || t.ink }}>
            {p.b}
          </Text>
        )
      )}
    </Text>
  );
}

/* ======================================================================
   Renglones
   ====================================================================== */

export function FilaPunteada({
  etiqueta,
  valor,
  color,
  destacado,
  extra,
}: {
  etiqueta: string;
  valor: string;
  color?: string;
  destacado?: boolean;
  /** Texto chico a la derecha del valor, por ejemplo el porcentaje */
  extra?: string;
}) {
  const t = useTheme();
  return (
    <View style={s.fila}>
      <Text style={[s.filaEtiqueta, { color: t.ink2 }]} numberOfLines={2}>
        {etiqueta}
      </Text>
      <View style={[s.puntos, { borderBottomColor: t.border }]} />
      <Text style={[s.filaValor, { color: color || t.ink, fontWeight: destacado ? '800' : '600' }]}>
        {valor}
      </Text>
      {extra !== undefined ? <Text style={[s.filaExtra, { color: t.muted }]}>{extra}</Text> : null}
    </View>
  );
}

/** Renglón de ranking: número de posición grande, nombre y cifra */
export function FilaRanking({
  posicion,
  nombre,
  detalle,
  valor,
  extra,
  onPress,
}: {
  posicion: number;
  nombre: string;
  detalle?: string;
  valor: string;
  extra?: string;
  onPress?: () => void;
}) {
  const t = useTheme();
  const podio = posicion <= 3 ? t.podio[posicion - 1] : null;
  const contenido = (
    <View style={[s.ranking, { borderBottomColor: t.border }]}>
      <Text style={[s.rankNum, { color: podio || t.muted, fontSize: podio ? 26 : 18 }]}>
        {posicion < 10 ? '0' + posicion : posicion}
      </Text>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[s.rankNombre, { color: t.ink, fontWeight: podio ? '800' : '600' }]} numberOfLines={2}>
          {nombre}
        </Text>
        {detalle ? (
          <Text style={[s.rankDetalle, { color: t.muted }]} numberOfLines={1}>
            {detalle}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 1 }}>
        <Text style={[s.rankValor, { color: podio || t.ink }]}>{valor}</Text>
        {extra ? <Text style={[s.rankDetalle, { color: t.muted }]}>{extra}</Text> : null}
      </View>
      {onPress ? <Text style={[s.flechita, { color: t.muted }]}>›</Text> : null}
    </View>
  );
  if (!onPress) return contenido;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.6 }} accessibilityRole="button">
      {contenido}
    </Pressable>
  );
}

/** Mosaico de cifras (por ejemplo, tickets por forma de pago) */
export function Mosaico({ children }: { children: React.ReactNode }) {
  return <View style={s.mosaico}>{children}</View>;
}

export function Ficha({ valor, etiqueta, color }: { valor: string; etiqueta: string; color?: string }) {
  const t = useTheme();
  return (
    <View style={[s.ficha, { backgroundColor: t.surfaceSunk, borderColor: t.border }]}>
      <Text style={[s.fichaValor, { color: color || t.ink }]} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      <Text style={[s.fichaEtiqueta, { color: t.ink2 }]} numberOfLines={2}>
        {etiqueta}
      </Text>
    </View>
  );
}

/** Etiqueta pequeña de color ("★ MEJOR DÍA") */
export function Insignia({ texto, color, fondo }: { texto: string; color: string; fondo: string }) {
  return (
    <View style={[s.insignia, { backgroundColor: fondo }]}>
      <Text style={[s.insigniaTexto, { color }]}>{texto}</Text>
    </View>
  );
}

export function Punto({ color, tamano = 12 }: { color: string; tamano?: number }) {
  return <View style={{ width: tamano, height: tamano, borderRadius: tamano / 2, backgroundColor: color }} />;
}

/** Barra horizontal rellena al porcentaje indicado (0 a 100) */
export function BarraProporcional({ porcentaje, color }: { porcentaje: number; color?: string }) {
  const t = useTheme();
  const ancho = Math.min(100, Math.max(0, Number(porcentaje) || 0));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ancho) }}
      style={[s.barra, { backgroundColor: t.surfaceSunk }]}
    >
      <View style={{ width: `${ancho}%`, height: '100%', backgroundColor: color || t.accent }} />
    </View>
  );
}

export function Separador() {
  const t = useTheme();
  return <View style={{ height: 1, backgroundColor: t.border, marginVertical: SPACE.sm }} />;
}

/* ======================================================================
   Estados: cargando, error, vacío
   ====================================================================== */

export function Cargando({ texto = 'Consultando el servidor…' }: { texto?: string }) {
  const t = useTheme();
  return (
    <View style={s.centrado}>
      <ActivityIndicator color={t.accent} />
      <Text style={[s.cargandoTexto, { color: t.muted }]}>{texto}</Text>
    </View>
  );
}

export function ErrorCaja({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
  const t = useTheme();
  return (
    <View style={[s.error, { backgroundColor: t.criticalSoft, borderColor: t.critical }]}>
      <Text style={[s.errorTexto, { color: t.critical }]}>{mensaje}</Text>
      {onReintentar ? (
        <View style={{ marginTop: SPACE.md }}>
          <Boton titulo="Reintentar" onPress={onReintentar} variante="suave" />
        </View>
      ) : null}
    </View>
  );
}

export function Aviso({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={[s.aviso, { backgroundColor: t.warnSoft, borderColor: t.warn }]}>
      <Text style={[s.avisoTexto, { color: t.warn }]}>{children}</Text>
    </View>
  );
}

export function Vacio({ texto }: { texto: string }) {
  const t = useTheme();
  return <Text style={[s.vacio, { color: t.muted }]}>{texto}</Text>;
}

/* ======================================================================
   Controles
   ====================================================================== */

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  deshabilitado,
}: {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'suave';
  deshabilitado?: boolean;
}) {
  const t = useTheme();
  const primario = variante === 'primario';
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.boton,
        {
          backgroundColor: primario ? t.accent : 'transparent',
          borderColor: primario ? t.accent : t.border,
          opacity: deshabilitado ? 0.5 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text style={[s.botonTexto, { color: primario ? '#ffffff' : t.ink2 }]}>{titulo}</Text>
    </Pressable>
  );
}

export function Enlace({ texto, onPress, color }: { texto: string; onPress: () => void; color?: string }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button">
      {({ pressed }) => (
        <Text style={[s.enlace, { color: color || t.accent, opacity: pressed ? 0.6 : 1 }]}>{texto}</Text>
      )}
    </Pressable>
  );
}

export function Chip({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      style={({ pressed }) => [
        s.chip,
        {
          backgroundColor: activo ? t.accent : t.surface,
          borderColor: activo ? t.accent : t.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text style={[s.chipTexto, { color: activo ? '#ffffff' : t.ink2 }]} numberOfLines={1}>
        {texto}
      </Text>
    </Pressable>
  );
}

/** Fila de chips con una sola opción activa */
export function Selector<T extends string | number>({
  opciones,
  valor,
  onCambio,
}: {
  opciones: { valor: T; texto: string }[];
  valor: T;
  onCambio: (v: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.selector}>
      {opciones.map((o) => (
        <Chip key={String(o.valor)} texto={o.texto} activo={o.valor === valor} onPress={() => onCambio(o.valor)} />
      ))}
    </ScrollView>
  );
}

/** ‹ Septiembre 2026 › */
export function Navegador({
  texto,
  onAnterior,
  onSiguiente,
  puedeAnterior = true,
  puedeSiguiente = true,
}: {
  texto: string;
  onAnterior: () => void;
  onSiguiente: () => void;
  puedeAnterior?: boolean;
  puedeSiguiente?: boolean;
}) {
  const t = useTheme();
  const flecha = (txt: string, onPress: () => void, activo: boolean, etiqueta: string) => (
    <Pressable
      onPress={onPress}
      disabled={!activo}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [
        s.navFlecha,
        { borderColor: t.border, backgroundColor: t.surfaceSunk, opacity: !activo ? 0.3 : pressed ? 0.6 : 1 },
      ]}
    >
      <Text style={[s.navFlechaTexto, { color: t.ink2 }]}>{txt}</Text>
    </Pressable>
  );
  return (
    <View style={s.nav}>
      {flecha('‹', onAnterior, puedeAnterior, 'Anterior')}
      <Text style={[s.navTexto, { color: t.ink }]}>{texto}</Text>
      {flecha('›', onSiguiente, puedeSiguiente, 'Siguiente')}
    </View>
  );
}

/* ======================================================================
   Estilos
   ====================================================================== */

const s = StyleSheet.create({
  bloque: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: SPACE.lg,
    overflow: 'hidden',
  },
  franja: { height: 5 },
  bloqueInterior: { padding: SPACE.lg, gap: SPACE.md },
  bloqueCab: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  bloqueTitulo: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  filtros: { gap: SPACE.sm },
  bloqueCuerpo: { gap: SPACE.md },
  nota: { fontSize: 12.5, lineHeight: 18 },

  btnCompartir: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 11,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCompartirTexto: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.3 },

  capCab: { borderBottomWidth: 1, paddingBottom: SPACE.md, gap: 2 },
  capUnidad: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  capFecha: { fontSize: 12.5 },

  cifraEtiqueta: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.9, textTransform: 'uppercase' },
  cifraValor: { fontWeight: '900', letterSpacing: -1 },
  cifraPie: { fontSize: 14, lineHeight: 20 },

  par: { flexDirection: 'row', gap: SPACE.md },
  celda: { flex: 1, gap: SPACE.xs },

  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  pillTexto: { fontSize: 14, fontWeight: '800' },

  titular: { fontWeight: '400' },

  fila: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACE.sm, paddingVertical: 5 },
  filaEtiqueta: { flexShrink: 1, fontSize: 15 },
  puntos: { flexGrow: 1, flexShrink: 0, minWidth: 12, borderBottomWidth: 1, borderStyle: 'dotted', marginBottom: 4 },
  filaValor: { fontFamily: mono, fontSize: 15 },
  filaExtra: { fontFamily: mono, fontSize: 12, width: 58, textAlign: 'right' },

  ranking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rankNum: { fontWeight: '900', width: 38, fontFamily: mono, letterSpacing: -1 },
  rankNombre: { fontSize: 15 },
  rankDetalle: { fontSize: 12 },
  rankValor: { fontSize: 15.5, fontWeight: '800', fontFamily: mono },
  flechita: { fontSize: 22, marginLeft: -4 },

  mosaico: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  ficha: {
    flexGrow: 1,
    flexBasis: '30%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.md,
    gap: 2,
  },
  fichaValor: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  fichaEtiqueta: { fontSize: 12.5, fontWeight: '600' },

  insignia: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' },
  insigniaTexto: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.6 },

  barra: { height: 8, borderRadius: 4, overflow: 'hidden' },

  centrado: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center', gap: SPACE.md },
  cargandoTexto: { fontSize: 14 },

  error: { borderWidth: 1, borderRadius: 12, padding: SPACE.lg, marginBottom: SPACE.lg },
  errorTexto: { fontSize: 14, lineHeight: 20 },

  aviso: { borderRadius: 10, borderWidth: 1, padding: SPACE.md, marginTop: SPACE.sm },
  avisoTexto: { fontSize: 12.5, lineHeight: 18 },

  vacio: { fontSize: 14, paddingVertical: SPACE.md, textAlign: 'center' },

  boton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: SPACE.lg,
    alignItems: 'center',
  },
  botonTexto: { fontSize: 15, fontWeight: '700' },
  enlace: { fontSize: 13, fontWeight: '800' },

  chip: { borderRadius: 16, borderWidth: 1, paddingVertical: 7, paddingHorizontal: 13, maxWidth: 240 },
  chipTexto: { fontSize: 13, fontWeight: '700' },
  selector: { gap: SPACE.sm, paddingRight: SPACE.sm },

  nav: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  navFlecha: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navFlechaTexto: { fontSize: 20, lineHeight: 24, fontWeight: '700' },
  navTexto: { flex: 1, textAlign: 'center', fontSize: 15.5, fontWeight: '800' },
});

export const fuenteMono = mono;
