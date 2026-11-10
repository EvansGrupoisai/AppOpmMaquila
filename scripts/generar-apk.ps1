# Genera el APK firmado de la app.
#
#   powershell -ExecutionPolicy Bypass -File scripts\generar-apk.ps1
#
# Requisitos: Node 22.13 o posterior, Android SDK, JDK 17 o posterior y la llave en
# credenciales/ (scripts\crear-llave.ps1).
# Para una versión nueva, sube "version" y android.versionCode en app.json.

$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $PSScriptRoot
$keystore = Join-Path $raiz 'credenciales\release.keystore'
$firma = Join-Path $raiz 'credenciales\firma.properties'

if (-not (Test-Path $keystore) -or -not (Test-Path $firma)) {
    throw 'Falta la llave en credenciales/. Si es la primera vez: scripts\crear-llave.ps1. Si no, recupérala del respaldo.'
}

# ---------- entorno ----------
if (-not $env:JAVA_HOME) {
    $jdk = Get-Item 'C:\Program Files\Microsoft\jdk-17*', 'C:\Program Files\Android\Android Studio\jbr' -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $jdk) { throw 'No se encontró un JDK. Define JAVA_HOME.' }
    $env:JAVA_HOME = $jdk.FullName
}
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (-not (Test-Path $env:ANDROID_HOME)) { throw "No existe el Android SDK en $env:ANDROID_HOME. Define ANDROID_HOME." }
$env:Path = (Join-Path $env:JAVA_HOME 'bin') + ';' + $env:Path
$env:CI = '1'
Write-Host "JAVA_HOME    = $env:JAVA_HOME"
Write-Host "ANDROID_HOME = $env:ANDROID_HOME"

Set-Location $raiz

# ---------- proyecto nativo ----------
# --clean regenera android/ desde app.json, así el ícono, el nombre y los permisos
# siempre salen de la configuración actual
npx expo prebuild --platform android --clean --no-install
if ($LASTEXITCODE -ne 0) { throw 'expo prebuild falló.' }

$android = Join-Path $raiz 'android'
$utf8 = New-Object System.Text.UTF8Encoding $false

# Ubicación del SDK para Gradle
$sdk = $env:ANDROID_HOME.Replace('\', '\\').Replace(':', '\:')
[System.IO.File]::WriteAllText((Join-Path $android 'local.properties'), "sdk.dir=$sdk`n", $utf8)

# gradle.properties: solo procesadores ARM (los teléfonos reales) y las credenciales
$props = Join-Path $android 'gradle.properties'
$p = [System.IO.File]::ReadAllText($props)
$p = [regex]::Replace($p, '(?m)^reactNativeArchitectures=.*$', 'reactNativeArchitectures=armeabi-v7a,arm64-v8a')
$p += "`n# --- Firma de release (credenciales/ vive fuera de android/ para sobrevivir a prebuild --clean) ---`n"
$p += "MAQUILA_STORE_FILE=../../credenciales/release.keystore`n"
$p += ([System.IO.File]::ReadAllText($firma) -replace '(?m)^#.*$', '').Trim() + "`n"
[System.IO.File]::WriteAllText($props, $p, $utf8)

# build.gradle: se agrega un bloque android {} al final; Gradle lo combina con el de
# la plantilla y la firma de release reemplaza a la de debug
$gradle = Join-Path $android 'app\build.gradle'
$bloque = @'

// --- Firma de release con la llave propia (agregado por scripts/generar-apk.ps1) ---
android {
    signingConfigs {
        release {
            storeFile file(MAQUILA_STORE_FILE)
            storePassword MAQUILA_STORE_PASSWORD
            keyAlias MAQUILA_KEY_ALIAS
            keyPassword MAQUILA_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
'@
[System.IO.File]::AppendAllText($gradle, $bloque, $utf8)

# El permiso para HTTP sin cifrar (servidores como http://IP:puerto) viene de app.json
$manifest = [System.IO.File]::ReadAllText((Join-Path $android 'app\src\main\AndroidManifest.xml'))
if ($manifest -notmatch 'usesCleartextTraffic="true"') {
    throw 'El manifiesto no permite HTTP sin cifrar: revisa expo-build-properties en app.json.'
}

# ---------- compilación ----------
Set-Location $android
.\gradlew.bat assembleRelease --no-daemon
if ($LASTEXITCODE -ne 0) { throw 'La compilación de Gradle falló.' }

$version = (Get-Content (Join-Path $raiz 'app.json') -Raw | ConvertFrom-Json).expo.version
$salida = Join-Path $raiz "MaquilaIndicadores-v$version.apk"
Copy-Item (Join-Path $android 'app\build\outputs\apk\release\app-release.apk') $salida -Force

Write-Host ''
Write-Host "APK listo: $salida"
