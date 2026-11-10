import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, SesionExpirada, SinPermiso } from '../api/client';
import { horaActual } from '../utils/format';
import { useSesion } from './sesion';

export type Carga<T> = {
  datos: T | null;
  /** Primera carga, todavía sin datos que mostrar */
  cargando: boolean;
  /** Ya hay datos en pantalla y está llegando una versión nueva */
  actualizando: boolean;
  error: string | null;
  /** Hora de la última respuesta correcta, "14:05" */
  actualizado: string;
  recargar: () => Promise<void>;
};

/**
 * Ejecuta `fn` al montar y cada vez que cambian `deps`. Si llega una respuesta de una
 * petición vieja (el usuario cambió de filtro mientras tanto) se descarta, para que
 * nunca se pinten datos de un filtro que ya no está seleccionado.
 */
export function useCarga<T>(fn: () => Promise<T>, deps: unknown[]): Carga<T> {
  const { onSesionExpirada, onSinPermiso } = useSesion();
  const [datos, setDatos] = useState<T | null>(null);
  const [pendiente, setPendiente] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualizado, setActualizado] = useState('');

  const peticion = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const recargar = useCallback(async () => {
    const id = ++peticion.current;
    setPendiente(true);
    setError(null);
    try {
      const r = await fnRef.current();
      if (id !== peticion.current) return;
      setDatos(r);
      setActualizado(horaActual());
    } catch (e) {
      if (id !== peticion.current) return;
      if (e instanceof SesionExpirada) return onSesionExpirada();
      if (e instanceof SinPermiso) return onSinPermiso(e.message);
      setError(e instanceof ApiError ? e.message : 'No fue posible obtener la información.');
    } finally {
      if (id === peticion.current) setPendiente(false);
    }
  }, [onSesionExpirada, onSinPermiso]);

  useEffect(() => {
    recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    datos,
    cargando: pendiente && datos === null,
    actualizando: pendiente && datos !== null,
    error,
    actualizado,
    recargar,
  };
}
