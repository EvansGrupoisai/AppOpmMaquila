import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { SPACE } from '../theme/tokens';
import { claveDe, deClave, fechaHora } from '../utils/format';
import { useTheme } from './ui';

type Campo = 'inicio' | 'fin';
type Rango = Record<Campo, string>;

const CAMPOS: { clave: Campo; texto: string }[] = [
  { clave: 'inicio', texto: 'Desde' },
  { clave: 'fin', texto: 'Hasta' },
];

// En web el año se teclea dígito a dígito y el campo va emitiendo 0002, 0020, 0202...
// Con este piso esas fechas a medias no llegan a consultarse.
const FECHA_MINIMA = '2000-01-01';
const FECHA_MAXIMA = '9999-12-31';

function esFecha(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) && valor >= FECHA_MINIMA;
}

function problemaDe(rango: Rango): string | null {
  if (!esFecha(rango.inicio) || !esFecha(rango.fin)) return 'Escribe una fecha válida en ambos campos.';
  if (rango.inicio > rango.fin) return 'La fecha inicial no puede ser mayor que la final.';
  return null;
}

/**
 * Selector de fecha inicial y final, con valores "YYYY-MM-DD". `inicio` y `fin` son el
 * último rango válido: `onCambio` solo se llama si inicio <= fin, y mientras tanto el
 * control conserva lo que el usuario eligió y lo marca como inválido.
 */
export function RangoFechas({
  inicio,
  fin,
  onCambio,
}: {
  inicio: string;
  fin: string;
  onCambio: (inicio: string, fin: string) => void;
}) {
  const t = useTheme();
  const esquema = useColorScheme();
  const [borrador, setBorrador] = useState<Rango>({ inicio, fin });
  // Solo en iOS: el calendario va dentro del control; en Android es un diálogo del sistema
  const [abierto, setAbierto] = useState<Campo | null>(null);

  useEffect(() => {
    setBorrador({ inicio, fin });
  }, [inicio, fin]);

  const problema = problemaDe(borrador);

  function cambiar(campo: Campo, valor: string) {
    const nuevo = { ...borrador, [campo]: valor };
    setBorrador(nuevo);
    if (!problemaDe(nuevo) && (nuevo.inicio !== inicio || nuevo.fin !== fin)) onCambio(nuevo.inicio, nuevo.fin);
  }

  function abrir(campo: Campo) {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: deClave(borrador[campo]),
        mode: 'date',
        onValueChange: (_evento, fecha) => cambiar(campo, claveDe(fecha)),
      });
    } else {
      setAbierto((a) => (a === campo ? null : campo));
    }
  }

  function bordeDe(campo: Campo) {
    return problema ? t.critical : abierto === campo ? t.accent : t.border;
  }

  return (
    <View style={s.contenedor}>
      <View style={s.fila}>
        {CAMPOS.map(({ clave, texto }) => (
          <View key={clave} style={s.campo}>
            <Text style={[s.etiqueta, { color: t.ink2 }]}>{texto}</Text>
            {Platform.OS === 'web' ? (
              React.createElement('input', {
                type: 'date',
                value: borrador[clave],
                min: FECHA_MINIMA,
                max: FECHA_MAXIMA,
                'aria-label': texto,
                'aria-invalid': problema ? true : undefined,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => cambiar(clave, e.target.value),
                style: {
                  boxSizing: 'border-box',
                  width: '100%',
                  minHeight: 42,
                  padding: '0 ' + SPACE.md + 'px',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: bordeDe(clave),
                  backgroundColor: t.surfaceSunk,
                  color: t.ink,
                  colorScheme: esquema === 'dark' ? 'dark' : 'light',
                  font: 'inherit',
                  fontSize: 15,
                },
              })
            ) : (
              <Pressable
                onPress={() => abrir(clave)}
                accessibilityRole="button"
                accessibilityLabel={texto + ': ' + fechaHora(borrador[clave])}
                style={({ pressed }) => [
                  s.valor,
                  { backgroundColor: t.surfaceSunk, borderColor: bordeDe(clave), opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={[s.valorTexto, { color: t.ink }]}>{fechaHora(borrador[clave])}</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      {Platform.OS === 'ios' && abierto ? (
        <DateTimePicker
          value={deClave(borrador[abierto])}
          mode="date"
          display="inline"
          accentColor={t.accent}
          themeVariant={esquema === 'dark' ? 'dark' : 'light'}
          onValueChange={(_evento, fecha) => cambiar(abierto, claveDe(fecha))}
        />
      ) : null}

      {problema ? (
        <Text style={[s.problema, { color: t.critical }]} accessibilityLiveRegion="polite">
          {problema}
        </Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  contenedor: { gap: SPACE.sm },
  fila: { flexDirection: 'row', gap: SPACE.md },
  campo: { flex: 1, gap: SPACE.xs },
  etiqueta: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  valor: { minHeight: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: SPACE.md, justifyContent: 'center' },
  valorTexto: { fontSize: 15 },
  problema: { fontSize: 12.5, lineHeight: 18 },
});
