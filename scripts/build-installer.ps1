[CmdletBinding()]
param([switch]$Publish)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Security

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Version = (Get-Content -Raw (Join-Path $ProjectRoot "src-tauri\tauri.conf.json") | ConvertFrom-Json).version
$SigningKeyPath = Join-Path $env:USERPROFILE ".tauri\fortuna-real.key"
$SigningPasswordPath = "$SigningKeyPath.password.dpapi"
$ReleaseRepository = "OscarD0823/Caja-Fantasma"
$OutputDirectory = Join-Path $ProjectRoot "Entrega"
$Node = (Get-Command node.exe -ErrorAction Stop).Source
$TauriCli = Join-Path $ProjectRoot "node_modules\@tauri-apps\cli\tauri.js"

function Unprotect-Password([string]$encoded) {
    if (-not $encoded -or $encoded.Length % 2 -ne 0 -or $encoded -notmatch '^[0-9A-Fa-f]+$') {
        throw "El archivo de contraseña protegida tiene un formato inválido."
    }
    $encrypted = New-Object byte[] ($encoded.Length / 2)
    for ($index = 0; $index -lt $encrypted.Length; $index++) {
        $encrypted[$index] = [Convert]::ToByte($encoded.Substring($index * 2, 2), 16)
    }
    $plain = [Security.Cryptography.ProtectedData]::Unprotect($encrypted, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
    try { return [Text.Encoding]::Unicode.GetString($plain) }
    finally { [Array]::Clear($plain, 0, $plain.Length) }
}

function Write-Utf8NoBom([string]$Path, [string]$Value) {
    [IO.File]::WriteAllText($Path, $Value, (New-Object Text.UTF8Encoding($false)))
}

if (-not (Test-Path -LiteralPath $SigningKeyPath) -or -not (Test-Path -LiteralPath $SigningPasswordPath)) {
    throw "No se encontró la clave local protegida usada por Fortuna Real. Restaura .tauri\fortuna-real.key y su contraseña DPAPI."
}

$env:TAURI_SIGNING_PRIVATE_KEY = $SigningKeyPath
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = Unprotect-Password (Get-Content -Raw -LiteralPath $SigningPasswordPath).Trim()
try {
    & $Node $TauriCli build
    if ($LASTEXITCODE -ne 0) { throw "Tauri no pudo crear el instalador." }

    $Installer = Get-ChildItem -Path (Join-Path $ProjectRoot "src-tauri\target\release\bundle\nsis") -Filter "*-setup.exe" -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $Installer) { throw "No se encontró el instalador NSIS generado." }
    $Signature = "$($Installer.FullName).sig"
    if (-not (Test-Path -LiteralPath $Signature)) { throw "El instalador no tiene la firma de actualización requerida." }

    New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
    $InstallerName = "Caja-Fantasma-$Version-Instalador.exe"
    $DeliveredInstaller = Join-Path $OutputDirectory $InstallerName
    $DeliveredSignature = "$DeliveredInstaller.sig"
    Copy-Item -LiteralPath $Installer.FullName -Destination $DeliveredInstaller -Force
    Copy-Item -LiteralPath $Signature -Destination $DeliveredSignature -Force

    $NotesPath = Join-Path $ProjectRoot "NOTAS-VERSION-$Version.md"
    $Manifest = [ordered]@{
        version = $Version
        notes = [IO.File]::ReadAllText($NotesPath, [Text.Encoding]::UTF8)
        pub_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        platforms = [ordered]@{
            "windows-x86_64" = [ordered]@{
                signature = (Get-Content -Raw -LiteralPath $DeliveredSignature).Trim()
                url = "https://github.com/$ReleaseRepository/releases/download/v$Version/$InstallerName"
            }
        }
    }
    $ManifestPath = Join-Path $OutputDirectory "latest.json"
    Write-Utf8NoBom $ManifestPath ($Manifest | ConvertTo-Json -Depth 5)
    Copy-Item -LiteralPath $NotesPath -Destination $OutputDirectory -Force

    if ($Publish) {
        & gh auth status
        if ($LASTEXITCODE -ne 0) { throw "GitHub CLI no tiene una sesión válida." }
        & gh release create "v$Version" $DeliveredInstaller $DeliveredSignature $ManifestPath --repo $ReleaseRepository --target main --title "Caja Fantasma v$Version" --notes-file $NotesPath
        if ($LASTEXITCODE -ne 0) { throw "GitHub no pudo publicar el Release." }
    }

    Write-Host "Instalador firmado creado: $DeliveredInstaller" -ForegroundColor Green
}
finally {
    Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD -ErrorAction SilentlyContinue
}
