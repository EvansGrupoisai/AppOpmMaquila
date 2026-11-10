import React, { createContext, useContext } from 'react';

// Cualquier pantalla puede descubrir que la cookie venció o que el perfil ya no es
// Super Admin; en vez de pasar callbacks por props, lo avisan por este contexto y App
// decide a qué pantalla regresar.

type Sesion = {
  onSesionExpirada: () => void;
  onSinPermiso: (mensaje: string) => void;
};

const Contexto = createContext<Sesion>({
  onSesionExpirada: () => {},
  onSinPermiso: () => {},
});

export function ProveedorSesion({ valor, children }: { valor: Sesion; children: React.ReactNode }) {
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion() {
  return useContext(Contexto);
}
