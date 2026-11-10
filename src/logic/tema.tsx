import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

// El usuario puede fijar claro u oscuro desde el menú de perfil; en "auto" se sigue
// el modo del teléfono. La elección se guarda para la próxima vez que abra la app.

export type PreferenciaTema = 'auto' | 'claro' | 'oscuro';
export type Esquema = 'light' | 'dark';

const K_TEMA = 'tema';

type Tema = {
  preferencia: PreferenciaTema;
  esquema: Esquema;
  cambiar: (p: PreferenciaTema) => void;
};

const Contexto = createContext<Tema>({ preferencia: 'auto', esquema: 'light', cambiar: () => {} });

export function ProveedorTema({ children }: { children: React.ReactNode }) {
  const sistema = useColorScheme();
  const [preferencia, setPreferencia] = useState<PreferenciaTema>('auto');

  useEffect(() => {
    AsyncStorage.getItem(K_TEMA)
      .then((v) => {
        if (v === 'claro' || v === 'oscuro') setPreferencia(v);
      })
      .catch(() => {});
  }, []);

  function cambiar(p: PreferenciaTema) {
    setPreferencia(p);
    AsyncStorage.setItem(K_TEMA, p).catch(() => {});
  }

  const esquema: Esquema =
    preferencia === 'claro' ? 'light' : preferencia === 'oscuro' ? 'dark' : sistema === 'dark' ? 'dark' : 'light';

  return <Contexto.Provider value={{ preferencia, esquema, cambiar }}>{children}</Contexto.Provider>;
}

export function useTema() {
  return useContext(Contexto);
}

/** Esquema en uso: el elegido por el usuario o, en automático, el del teléfono */
export function useEsquema(): Esquema {
  return useContext(Contexto).esquema;
}
