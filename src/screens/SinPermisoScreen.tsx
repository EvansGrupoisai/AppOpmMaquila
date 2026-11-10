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
      <View style={[s.tarjeta, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Text style={[s.icono, { color: t.critical }]}>⊘</Text>
        <Text style={[s.titulo, { color: t.ink }]}>Sin acceso a los indicadores</Text>
        <Text style={[s.texto, { color: t.ink2 }]}>
          {mensaje ||
            'Hola ' + nombre + '. Tu perfil es ' + (perfil ? '«' + perfil + '»' : 'desconocido') +
              ' y esta app es solo para el perfil Super Admin.'}
        </Text>
        <Boton titulo="Entrar con otro usuario" onPress={onSalir} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.lg },
  tarjeta: { borderWidth: 1, borderRadius: 14, padding: SPACE.xl, gap: SPACE.md, alignSelf: 'stretch' },
  icono: { fontSize: 44, fontWeight: '900' },
  titulo: { fontSize: 22, fontWeight: '900' },
  texto: { fontSize: 15, lineHeight: 22 },
});
