import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ---------- franja marino con el nombre de la app (sin marca de empresa) ---------- */}
        <View style={[s.cabecera, { backgroundColor: t.hero, paddingTop: insets.top + 40 }]}>
          <View style={s.iconoCaja}>
            <Ionicons name="stats-chart" size={30} color={t.onHero} />
          </View>
          <Text style={[s.marca, { color: t.onHero }]}>BIENVENIDO</Text>
          <Text style={[s.titulo, { color: t.onHero }]}>Maquila Indicadores</Text>
          <Text style={[s.subtitulo, { color: t.onHero }]}>
            Consulta la liquidación, producción, inventario y cortes de cada temporada.
          </Text>
        </View>

        {/* ---------- formulario ---------- */}
        <View style={[s.tarjeta, { backgroundColor: t.surface }]}>
          <Text style={[s.formTitulo, { color: t.ink }]}>Iniciar sesión</Text>
          <Campo
            etiqueta="Servidor"
            icono="server-outline"
            valor={servidor}
            onChange={setServidor}
            placeholder="http://192.168.1.10:90"
            teclado="url"
            ayuda="IP y puerto con los que abres el sistema en la computadora. Se recuerda para la próxima vez."
          />
          <Campo
            etiqueta="Usuario"
            icono="person-outline"
            valor={usuario}
            onChange={setUsuario}
            placeholder="correo@empresa.com"
            teclado="email-address"
          />
          <Campo
            etiqueta="Contraseña"
            icono="lock-closed-outline"
            valor={password}
            onChange={setPassword}
            secreto
            onSubmit={entrar}
          />

          {error ? (
            <View style={[s.error, { backgroundColor: t.criticalSoft }]}>
              <Ionicons name="alert-circle" size={18} color={t.critical} />
              <Text style={[s.errorTexto, { color: t.critical }]}>{error}</Text>
            </View>
          ) : null}

          <View style={{ marginTop: SPACE.xs }}>
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
  icono,
  valor,
  onChange,
  placeholder,
  secreto,
  teclado,
  ayuda,
  onSubmit,
}: {
  etiqueta: string;
  icono: React.ComponentProps<typeof Ionicons>['name'];
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secreto?: boolean;
  teclado?: 'url' | 'email-address';
  ayuda?: string;
  onSubmit?: () => void;
}) {
  const t = useTheme();
  const [enfocado, setEnfocado] = useState(false);
  const [visible, setVisible] = useState(false);
  return (
    <View style={s.campo}>
      <Text style={[s.etiqueta, { color: t.ink2 }]}>{etiqueta}</Text>
      <View
        style={[
          s.caja,
          { backgroundColor: t.surfaceSunk, borderColor: enfocado ? t.accent : t.border },
        ]}
      >
        <Ionicons name={icono} size={19} color={enfocado ? t.accent : t.muted} />
        <TextInput
          value={valor}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={t.muted}
          secureTextEntry={secreto && !visible}
          keyboardType={teclado || 'default'}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={onSubmit}
          returnKeyType={onSubmit ? 'go' : 'next'}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          accessibilityLabel={etiqueta}
          style={[s.input, { color: t.ink }]}
        />
        {secreto ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={t.muted} />
          </Pressable>
        ) : null}
      </View>
      {ayuda ? <Text style={[s.ayuda, { color: t.muted }]}>{ayuda}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 1 },
  cabecera: { paddingHorizontal: 20, paddingBottom: 56, gap: SPACE.sm },
  iconoCaja: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.sm,
  },
  marca: { fontSize: 12, fontWeight: '700', letterSpacing: 2.5, opacity: 0.75 },
  titulo: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  subtitulo: { fontSize: 14, lineHeight: 20, opacity: 0.8 },
  tarjeta: {
    marginHorizontal: 20,
    marginTop: -32,
    borderRadius: 18,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  formTitulo: { fontSize: 18, fontWeight: '700' },
  campo: { gap: 6 },
  etiqueta: { fontSize: 13, fontWeight: '600' },
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: SPACE.md,
  },
  input: { flex: 1, minWidth: 0, paddingVertical: 12, fontSize: 16 },
  ayuda: { fontSize: 12, lineHeight: 17 },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm, borderRadius: 12, padding: SPACE.md },
  errorTexto: { flex: 1, fontSize: 13.5, lineHeight: 19 },
  cargando: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, paddingVertical: 13 },
  cargandoTexto: { fontSize: 14 },
});
