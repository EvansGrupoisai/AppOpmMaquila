// Proxy de desarrollo para la versión web.
//
// En el teléfono, fetch habla directo con IIS y guarda la cookie de sesión en el
// almacén nativo. En el navegador eso no funciona: la página vive en
// http://localhost:8081 y el sistema en otra dirección, así que el navegador bloquea
// la respuesta (CORS) y tampoco manda la cookie. Para evitarlo, el propio servidor de
// Expo reenvía las peticiones al sistema: el navegador solo ve un origen.
//
// El destino viaja en la ruta, con la dirección que se escribe en la pantalla de acceso:
//   /op/http/192.168.1.10:90/AppIndicadores/Hoy  ->  http://192.168.1.10:90/AppIndicadores/Hoy
//
// Solo existe mientras corre `npx expo start`; no forma parte de la app instalada.

const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');
const https = require('https');

const config = getDefaultConfig(__dirname);

const PREFIJO = '/op/';
// /op/{http|https}/{host[:puerto]}{ruta}
const RUTA = /^\/op\/(https?)\/([A-Za-z0-9.-]+(?::\d{1,5})?)(\/.*)?$/i;

function responderJson(res, status, mensaje) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ Success: false, Message: mensaje }));
}

function proxy(req, res) {
  const m = RUTA.exec(req.url);
  if (!m) {
    return responderJson(res, 400, 'La dirección del servidor no es válida. Ejemplo: http://192.168.1.10:90');
  }

  const protocolo = m[1].toLowerCase();
  const host = m[2];
  const origen = protocolo + '://' + host;
  const prefijoDestino = PREFIJO + protocolo + '/' + host;
  const url = new URL(origen + (m[3] || '/'));
  const cliente = protocolo === 'https' ? https : http;

  const salida = cliente.request(
    url,
    {
      method: req.method,
      headers: { ...req.headers, host: url.host, origin: origen, referer: origen + '/' },
    },
    (respuesta) => {
      const headers = { ...respuesta.headers };

      // La cookie queda para localhost: se quitan Domain y Secure (el proxy es http)
      if (headers['set-cookie']) {
        headers['set-cookie'] = headers['set-cookie'].map((c) =>
          c.replace(/;\s*domain=[^;]*/gi, '').replace(/;\s*secure/gi, '')
        );
      }
      // Las redirecciones de MVC ("/Home/Index", "/Account/Login") también pasan por el proxy
      if (headers.location) {
        let loc = headers.location;
        if (loc.toLowerCase().startsWith(origen.toLowerCase())) loc = loc.slice(origen.length) || '/';
        if (loc.startsWith('/')) headers.location = prefijoDestino + loc;
      }

      res.writeHead(respuesta.statusCode || 502, headers);
      respuesta.pipe(res);
    }
  );

  salida.setTimeout(130000, () => salida.destroy(new Error('el servidor no respondió a tiempo')));
  salida.on('error', (e) => {
    if (res.headersSent) return res.end();
    // Algunos errores de conexión de Node traen el motivo solo en el código (ECONNREFUSED…)
    const motivo = e.code === 'ECONNREFUSED' ? 'no hay nada escuchando en esa dirección' : e.message || e.code || 'error de red';
    responderJson(res, 502, 'No se pudo conectar con ' + origen + ' (' + motivo + '). Revisa la IP, el puerto y que estés en la misma red.');
  });

  req.pipe(salida);
}

const anterior = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const base = anterior ? anterior(middleware, server) : middleware;
  return (req, res, next) => {
    if (req.url && req.url.startsWith(PREFIJO)) return proxy(req, res);
    return base(req, res, next);
  };
};

module.exports = config;
