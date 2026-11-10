import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Boton, useTheme } from '../components/ui';
import { SPACE } from '../theme/tokens';

export function SinPermisoScreen({
  nombre,
  perfil,
  mensaje,
  onSalir,
}: {
  nombre: string;
  perfil: string | null;
  mensaje?: string | null;
  onSalir: () => void;
}) {
  const t = useTheme();
  return (
    <View style={[s.centrado, { backgroundColor: t.paper }]}>
      <View style={[s.tarjeta, { backgroundColor: t.surface }]}>
        <View style={[s.icono, { backgroundColor: t.criticalSoft }]}>
          <Ionicons name="lock-closed" size={30} color={t.critical} />
        </View>
        <Text style={[s.titulo, { color: t.ink }]}>Sin acceso a los indicadores</Text>
        <Text style={[s.texto, { color: t.ink2 }]}>
          {mensaje || 'Hola ' + nombre + '. Esta app es solo para el perfil Super Admin.'}
        </Text>
        {!mensaje ? (
          <View style={[s.perfil, { backgroundColor: t.surfaceSunk }]}>
            <Text style={[s.perfilEtiqueta, { color: t.muted }]}>Tu perfil</Text>
            <Text style={[s.perfilValor, { color: t.ink }]}>{perfil || 'Desconocido'}</Text>
          </View>
        ) : null}
        <View style={s.boton}>
          <Boton titulo="Entrar con otro usuario" onPress={onSalir} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  tarjeta: {
    borderRadius: 18,
    padding: SPACE.xl,
    gap: SPACE.md,
    alignSelf: 'stretch',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  icono: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  texto: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  perfil: { alignSelf: 'stretch', borderRadius: 12, padding: SPACE.md, alignItems: 'center', gap: 2 },
  perfilEtiqueta: { fontSize: 12 },
  perfilValor: { fontSize: 15, fontWeight: '700' },
  boton: { alignSelf: 'stretch', marginTop: SPACE.xs },
});
