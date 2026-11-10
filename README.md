# Maquila Indicadores

App móvil (Expo / React Native) con los indicadores de maquila: Liquidación, Producción, Inventario y Cortes. Es solo para usuarios con perfil Super Admin del sistema web.

Paquete Android: `com.operadora.maquila`. Tiene llave de firma propia, así que convive en el mismo teléfono con Operadora Indicadores.

## Requisito: publicar el controlador en el sistema web

La app lee sus datos de `AppIndicadoresController` (`MantaBay.Web/Controllers/AppIndicadoresController.cs`, rutas `/AppIndicadores/...`). Antes de usarla, ese controlador debe estar publicado en el servidor al que se conecta. Si no lo está, la app avisa que hay que actualizar el sistema web.

## Requisitos para desarrollar

- Node 22.13 o posterior (lo pide Expo 58).
- Para generar la APK, además: Android SDK y JDK 17 o posterior. Si `ANDROID_HOME` y `JAVA_HOME` no están definidos, el script los busca en las rutas de instalación habituales de Android Studio.

## Correr la app

```powershell
npm install
npm start          # Expo; abre en un dispositivo o emulador
npm run web        # en el navegador
npm run typecheck  # verificación de tipos
```

La dirección del servidor se escribe en la pantalla de acceso y el teléfono recuerda la última usada. Para que aparezca escrita de inicio, edita `SERVIDOR_PREDETERMINADO` en `src/config.ts`.

El teléfono debe estar en la misma red que el servidor. La app permite HTTP sin cifrar para poder usar direcciones por IP.

## Generar la APK

La primera vez, crea la llave de firma:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\crear-llave.ps1
```

La llave y sus contraseñas quedan en `credenciales/`, que no se sube a git. **Respalda esa carpeta fuera de este equipo:** sin ella, una versión nueva no se podrá instalar encima de la actual y habrá que desinstalar la app en cada teléfono. El script no sobrescribe una llave existente.

Después, cada vez que se quiera una APK:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\generar-apk.ps1
```

El resultado es `AppOpmMaquila.apk` en la raíz del proyecto, firmado y para procesadores ARM. La carpeta `android/` se regenera en cada ejecución desde `app.json`; no la edites a mano.

Para publicar una versión nueva, sube `version` y `android.versionCode` en `app.json` antes de generar la APK.

## Iconos

El icono, el splash y el logo de `assets/` son provisionales: se reemplazan cuando estén los definitivos, sin cambiar sus nombres de archivo.
