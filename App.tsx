import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError, SesionExpirada, cargarPreferencias, getSesion, logout, type Sesion } from './src/api/client';
import { ProveedorSesion } from './src/logic/sesion';
import { LoginScreen } from './src/screens/LoginScreen';
import { MainScreen } from './src/screens/MainScreen';
import { SinPermisoScreen } from './src/screens/SinPermisoScreen';
import { getTokens } from './src/theme/tokens';

type Estado =
  | { tipo: 'comprobando' }
  | { tipo: 'fuera'; aviso?: string }
  | { tipo: 'dentro'; sesion: Sesion }
  | { tipo: 'sinPermiso'; sesion: Sesion; mensaje?: string };

export default function App() {
  const esquema = useColorScheme();
  const t = getTokens(esquema);
  const [estado, setEstado] = useState<Estado>({ tipo: 'comprobando' });

  // La cookie vive en el almacén nativo y sobrevive al cierre de la app, así que al
  // abrir se comprueba si sigue sirviendo antes de pedir credenciales.
  useEffect(() => {
    (async () => {
      const prefs = await cargarPreferencias();
      if (!prefs.servidor) return setEstado({ tipo: 'fuera' });
      try {
        entrar(await getSesion());
      } catch (e) {
        // Sin red la cookie puede seguir sirviendo: se avisa para que no parezca un cierre de sesión
        setEstado(
          e instanceof ApiError && !(e instanceof SesionExpirada)
            ? { tipo: 'fuera', aviso: e.message }
            : { tipo: 'fuera' }
        );
      }
    })();
  }, []);

  function entrar(sesion: Sesion) {
    setEstado(sesion.EsSuperAdmin ? { tipo: 'dentro', sesion } : { tipo: 'sinPermiso', sesion });
  }

  const salir = useCallback(async () => {
    await logout();
    setEstado({ tipo: 'fuera' });
  }, []);

  const avisos = useMemo(
    () => ({
      onSesionExpirada: () => setEstado({ tipo: 'fuera', aviso: 'La sesión terminó. Vuelve a iniciar sesión.' }),
      onSinPermiso: (mensaje: string) =>
        setEstado((e) => (e.tipo === 'dentro' ? { tipo: 'sinPermiso', sesion: e.sesion, mensaje } : e)),
    }),
    []
  );

  return (
    <SafeAreaProvider>
      <StatusBar style={esquema === 'dark' ? 'light' : 'dark'} />
      <ProveedorSesion valor={avisos}>
        {estado.tipo === 'comprobando' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.paper }}>
            <ActivityIndicator color={t.accent} />
          </View>
        ) : estado.tipo === 'fuera' ? (
          <LoginScreen onListo={entrar} aviso={estado.aviso} />
        ) : estado.tipo === 'sinPermiso' ? (
          <SinPermisoScreen
            nombre={estado.sesion.Nombre}
            perfil={estado.sesion.Perfil}
            mensaje={estado.mensaje}
            onSalir={salir}
          />
        ) : (
          <MainScreen sesion={estado.sesion} onSalir={salir} />
        )}
      </ProveedorSesion>
    </SafeAreaProvider>
  );
}
