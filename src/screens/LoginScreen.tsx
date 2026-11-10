import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError, cargarPreferencias, login, type Sesion } from '../api/client';
import { Boton, useTheme } from '../components/ui';
import { SERVIDOR_PREDETERMINADO } from '../config';
import { SPACE } from '../theme/tokens';

export function LoginScreen({ onListo, aviso }: { onListo: (s: Sesion) => void; aviso?: string | null }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const [servidor, setServidor] = useState('');
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(aviso || null);
  const [preparando, setPreparando] = useState(true);

  useEffect(() => {
    cargarPreferencias()
      .then((p) => {
        setServidor(p.servidor || SERVIDOR_PREDETERMINADO);
        setUsuario(p.usuario);
      })
      .finally(() => setPreparando(false));
  }, []);

  async function entrar() {
    setError(null);
    setCargando(true);
    try {
      const sesion = await login(servidor, usuario.trim(), password);
      setPassword('');
      onListo(sesion);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo iniciar sesión.');
    } finally {
      setCargando(false);
    }
  }

  if (preparando) {
    return (
      <View style={[s.centrado, { backgroundColor: t.paper }]}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.cabecera}>
          <Image source={require('../../assets/logo.png')} style={s.logo} accessibilityLabel="Logo de Operadora" />
          <Text style={[s.marca, { color: t.accent }]}>OPERADORA</Text>
          <Text style={[s.titulo, { color: t.ink }]}>Maquila Indicadores</Text>
          <Text style={[s.subtitulo, { color: t.muted }]}>
            Liquidación, producción, inventario y cortes por temporada, tomados del mismo sistema web.
          </Text>
        </View>

        <View style={[s.tarjeta, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Campo
            etiqueta="Servidor"
            valor={servidor}
            onChange={setServidor}
            placeholder="http://192.168.1.10:90"
            teclado="url"
            ayuda="IP y puerto con los que abres el sistema en la computadora. Se recuerda para la próxima vez."
          />
          <Campo etiqueta="Usuario" valor={usuario} onChange={setUsuario} placeholder="correo@empresa.com" teclado="email-address" />
          <Campo etiqueta="Contraseña" valor={password} onChange={setPassword} secreto onSubmit={entrar} />

          {error ? (
            <View style={[s.error, { backgroundColor: t.criticalSoft, borderColor: t.critical }]}>
              <Text style={[s.errorTexto, { color: t.critical }]}>{error}</Text>
            </View>
          ) : null}

          <View style={{ marginTop: SPACE.sm }}>
            {cargando ? (
              <View style={s.cargando}>
                <ActivityIndicator color={t.accent} />
                <Text style={[s.cargandoTexto, { color: t.muted }]}>Entrando…</Text>
              </View>
            ) : (
              <Boton titulo="Entrar" onPress={entrar} deshabilitado={!servidor || !usuario} />
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Campo({
  etiqueta,
  valor,
  onChange,
  placeholder,
  secreto,
  teclado,
  ayuda,
  onSubmit,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secreto?: boolean;
  teclado?: 'url' | 'email-address';
  ayuda?: string;
  onSubmit?: () => void;
}) {
  const t = useTheme();
  return (
    <View style={s.campo}>
      <Text style={[s.etiqueta, { color: t.ink2 }]}>{etiqueta}</Text>
      <TextInput
        value={valor}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.muted}
        secureTextEntry={secreto}
        keyboardType={teclado || 'default'}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={onSubmit}
        returnKeyType={onSubmit ? 'go' : 'next'}
        style={[s.input, { backgroundColor: t.surfaceSunk, borderColor: t.border, color: t.ink }]}
      />
      {ayuda ? <Text style={[s.ayuda, { color: t.muted }]}>{ayuda}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: SPACE.lg },
  cabecera: { marginBottom: SPACE.xl, gap: SPACE.sm },
  logo: { width: 84, height: 84, marginBottom: SPACE.sm },
  marca: { fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  titulo: { fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  subtitulo: { fontSize: 14.5, lineHeight: 21 },
  tarjeta: { borderRadius: 14, borderWidth: 1, padding: SPACE.lg, gap: SPACE.md },
  campo: { gap: 6 },
  etiqueta: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: SPACE.md, paddingVertical: 12, fontSize: 16 },
  ayuda: { fontSize: 12, lineHeight: 17 },
  error: { borderWidth: 1, borderRadius: 8, padding: SPACE.md },
  errorTexto: { fontSize: 13.5, lineHeight: 19 },
  cargando: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, paddingVertical: 13 },
  cargandoTexto: { fontSize: 14 },
});
