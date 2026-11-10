# Crea la llave de firma de la app (una sola vez).
#
# Android solo acepta actualizar una app instalada si el APK nuevo está firmado con la
# MISMA llave. Si se pierde credenciales/, los teléfonos tendrán que desinstalar la app
# para poner una versión nueva. Respalda la carpeta completa fuera de este equipo.
#
#   powershell -ExecutionPolicy Bypass -File scripts\crear-llave.ps1

$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $raiz 'credenciales'
$keystore = Join-Path $dir 'release.keystore'
$props = Join-Path $dir 'firma.properties'

if (Test-Path $keystore) {
    throw "Ya existe $keystore. No se sobrescribe: perderías la llave con la que están firmadas las apps instaladas."
}

# Si JAVA_HOME no está definido se busca el mismo JDK que usa generar-apk.ps1
$keytool = 'keytool'
if (-not $env:JAVA_HOME) {
    $jdk = Get-Item 'C:\Program Files\Microsoft\jdk-17*', 'C:\Program Files\Android\Android Studio\jbr' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($jdk) { $keytool = Join-Path $jdk.FullName 'bin\keytool.exe' }
} else {
    $keytool = Join-Path $env:JAVA_HOME 'bin\keytool.exe'
}

New-Item -ItemType Directory -Force $dir | Out-Null

# Contraseña aleatoria de 24 caracteres (PKCS12 usa la misma para el almacén y la llave)
$caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'.ToCharArray()
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 24
$rng.GetBytes($bytes)
$password = -join ($bytes | ForEach-Object { $caracteres[$_ % $caracteres.Length] })

& $keytool -genkeypair -v -storetype PKCS12 `
    -keystore $keystore -alias maquila -keyalg RSA -keysize 2048 -validity 10000 `
    -storepass $password -keypass $password `
    -dname 'CN=Operadora de Productos del Mar, OU=Maquila Indicadores, O=OPM, C=MX'
if ($LASTEXITCODE -ne 0) { throw 'keytool no pudo crear la llave.' }

$contenido = @"
# Credenciales de la llave de firma. NO subir a git; respaldar junto con release.keystore.
MAQUILA_STORE_PASSWORD=$password
MAQUILA_KEY_ALIAS=maquila
MAQUILA_KEY_PASSWORD=$password
"@
[System.IO.File]::WriteAllText($props, $contenido, (New-Object System.Text.UTF8Encoding $false))

Write-Host ''
Write-Host "Llave creada en $keystore"
Write-Host "Contraseñas en $props"
Write-Host 'RESPALDA LA CARPETA credenciales/ FUERA DE ESTE EQUIPO.'
