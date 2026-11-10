import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// El sistema web usa autenticación por formularios (cookie), no JWT. La app inicia
// sesión igual que el navegador: POST con formulario a /Account/Login. fetch en React
// Native usa la pila HTTP nativa, que guarda la cookie y la reenvía sola.
//
// Los datos salen de AppIndicadoresController, que responde siempre JSON:
//   { Success, Message, ResponseObject, ErrorObject: { Codigo, Detalle } }

const K_SERVIDOR = 'maquila.servidor';
const K_USER = 'maquila.usuario';

export class ApiError extends Error {}

export class SesionExpirada extends ApiError {
  constructor() {
    super('La sesión terminó. Vuelve a iniciar sesión.');
  }
}

/** El usuario inició sesión pero su perfil no es Super Admin */
export class SinPermiso extends ApiError {}

/** El servidor respondió 404: esa versión del sistema web no tiene la ruta */
export class RutaNoEncontrada extends ApiError {}

export const ES_WEB = Platform.OS === 'web';

/** Dirección del sistema tal como la escribió el usuario, ya normalizada */
let servidor = '';
/** Prefijo real de cada petición: el servidor en el teléfono, el proxy en web */
let baseUrl = '';

export function normalizaUrl(url: string): string {
  let u = (url || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
  return u.replace(/\/+$/, '');
}

/**
 * En el teléfono se habla directo con IIS. En el navegador no se puede: el sistema
 * está en otro origen, así que el navegador bloquearía las respuestas (CORS) y no
 * mandaría la cookie. Ahí se pasa por el proxy del servidor de Expo (metro.config.js),
 * que lleva el destino dentro de la ruta:
 *   http://192.168.1.10:90  ->  /op/http/192.168.1.10:90
 */
function baseDe(url: string): string {
  if (!url || !ES_WEB) return url;
  const m = /^(https?):\/\/(.+)$/i.exec(url);
  return m ? '/op/' + m[1].toLowerCase() + '/' + m[2] : '';
}

function usarServidor(url: string) {
  servidor = normalizaUrl(url);
  baseUrl = baseDe(servidor);
}

export async function cargarPreferencias(): Promise<{ servidor: string; usuario: string }> {
  const [b, u] = await Promise.all([AsyncStorage.getItem(K_SERVIDOR), AsyncStorage.getItem(K_USER)]);
  usarServidor(b || '');
  return { servidor, usuario: u || '' };
}

async function guardarPreferencias(url: string, usuario: string) {
  usarServidor(url);
  await AsyncStorage.multiSet([
    [K_SERVIDOR, servidor],
    [K_USER, usuario],
  ]);
}

function conTiempoLimite(ms: number): { signal: AbortSignal; cancelar: () => void } {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancelar: () => clearTimeout(id) };
}

export type Sesion = { Nombre: string; Perfil: string | null; EsSuperAdmin: boolean };

/**
 * Inicia sesión contra el mismo formulario que usa el navegador. MVC responde 302 al
 * Home si es correcto y vuelve a pintar el login (200 con HTML) si no, así que el
 * código de estado no basta: se comprueba pidiendo datos reales con la cookie.
 */
export async function login(url: string, usuario: string, password: string): Promise<Sesion> {
  const destino = normalizaUrl(url);
  if (!destino) throw new ApiError('Escribe la dirección del servidor.');
  const base = baseDe(destino);
  if (!base) throw new ApiError('La dirección no es válida. Ejemplo: http://192.168.1.10:90');

  const cuerpo =
    'Username=' + encodeURIComponent(usuario) + '&Password=' + encodeURIComponent(password);

  const { signal, cancelar } = conTiempoLimite(20000);
  let respuesta: Response;
  try {
    // Con contraseña incorrecta MVC no borra la cookie: si quedara una sesión anterior
    // viva, la comprobación de abajo pasaría y se entraría con ese otro usuario.
    await fetch(base + '/Account/Logout', { method: 'GET', signal });
    respuesta = await fetch(base + '/Account/Login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html' },
      body: cuerpo,
      signal,
    });
  } catch (e: any) {
    throw new ApiError(
      e?.name === 'AbortError'
        ? 'El servidor no respondió a tiempo.'
        : 'No se pudo conectar con ' + destino + '. Revisa la dirección y que el equipo esté en la misma red.'
    );
  } finally {
    cancelar();
  }

  // En web, el proxy responde 400/502 con JSON cuando la dirección no sirve o no alcanza al sistema
  if (ES_WEB && (respuesta.status === 400 || respuesta.status === 502)) {
    let mensaje = 'El proxy de desarrollo no pudo conectar con ' + destino + '.';
    try {
      mensaje = JSON.parse(await respuesta.text()).Message || mensaje;
    } catch {
      /* se queda el mensaje genérico */
    }
    throw new ApiError(mensaje);
  }

  if (respuesta.status >= 500) {
    throw new ApiError('El servidor respondió con un error (' + respuesta.status + ').');
  }

  usarServidor(destino);

  // Primero se confirma que la cookie sirve con un endpoint que existe desde siempre;
  // así, si falla el siguiente paso, se sabe que el problema es la API de la app y no
  // la contraseña.
  try {
    await get<unknown>('/Plantas/GetAuthorized');
  } catch (e) {
    if (e instanceof SesionExpirada) throw new ApiError('Usuario o contraseña incorrectos.');
    throw e;
  }

  let sesion: Sesion;
  try {
    sesion = await getSesion();
  } catch (e) {
    if (e instanceof SesionExpirada) throw new ApiError('Usuario o contraseña incorrectos.');
    if (e instanceof RutaNoEncontrada) {
      throw new ApiError(
        'Las credenciales son correctas, pero el servidor no tiene publicada la API de la app ' +
          '(AppIndicadores). Hay que actualizar el sistema web.'
      );
    }
    throw e;
  }

  await guardarPreferencias(destino, usuario);
  return sesion;
}

export function getSesion(): Promise<Sesion> {
  return get<Sesion>('/AppIndicadores/Sesion');
}

async function leerRespuesta<T>(respuesta: Response, ruta: string): Promise<T> {
  const texto = await respuesta.text();

  // Un 500 de IIS también llega como HTML: no es sesión vencida, es un error del servidor
  if (respuesta.status >= 500) {
    let mensaje = 'El servidor tuvo un error al consultar la información (' + respuesta.status + ').';
    // El proxy web (502) sí manda JSON con la causa
    if (texto.trimStart().startsWith('{')) {
      try {
        mensaje = JSON.parse(texto).Message || mensaje;
      } catch {
        /* se queda el mensaje genérico */
      }
    }
    throw new ApiError(mensaje);
  }
  if (respuesta.status === 404) {
    throw new RutaNoEncontrada('El servidor no tiene la ruta ' + ruta + '. ¿Está actualizado el sistema web?');
  }

  // Sin sesión, [Authorize] redirige al login y fetch sigue el 302: llega su HTML
  if (texto.trimStart().slice(0, 1) === '<') throw new SesionExpirada();

  let json: any;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new ApiError('El servidor devolvió una respuesta inesperada en ' + ruta + '.');
  }

  if (json && json.Success === false) {
    const codigo = json.ErrorObject?.Codigo;
    const mensaje = json.Message || 'No fue posible completar la operación.';
    if (codigo === 'SIN_PERMISO') throw new SinPermiso(mensaje);
    const detalle = json.ErrorObject?.Detalle;
    throw new ApiError(detalle ? mensaje + '\n' + detalle : mensaje);
  }
  return (json ? json.ResponseObject : null) as T;
}

async function pedir<T>(ruta: string, init: RequestInit, ms: number, msgTiempo: string): Promise<T> {
  if (!baseUrl) throw new SesionExpirada();

  const { signal, cancelar } = conTiempoLimite(ms);
  let respuesta: Response;
  try {
    respuesta = await fetch(baseUrl + ruta, { ...init, signal });
  } catch (e: any) {
    throw new ApiError(e?.name === 'AbortError' ? msgTiempo : 'Se perdió la conexión con el servidor.');
  } finally {
    cancelar();
  }
  return leerRespuesta<T>(respuesta, ruta);
}

export function post<T>(ruta: string, datos: unknown): Promise<T> {
  // Los SP de indicadores pueden tardar: se deja margen amplio antes de cortar
  return pedir<T>(
    ruta,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', Accept: 'application/json' },
      body: JSON.stringify(datos ?? {}),
    },
    130000,
    'La consulta tardó demasiado. Intenta de nuevo en un momento.'
  );
}

export function get<T>(ruta: string): Promise<T> {
  return pedir<T>(
    ruta,
    { method: 'GET', headers: { Accept: 'application/json' } },
    60000,
    'El servidor no respondió a tiempo.'
  );
}

/** Cierra la sesión en el servidor; si falla no importa, la app olvida el estado igual. */
export async function logout(): Promise<void> {
  if (!baseUrl) return;
  const { signal, cancelar } = conTiempoLimite(8000);
  try {
    await fetch(baseUrl + '/Account/Logout', { method: 'GET', signal });
  } catch {
    /* sin red: la cookie caducará sola */
  } finally {
    cancelar();
  }
}
