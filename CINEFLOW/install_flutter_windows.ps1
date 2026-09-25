$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$flutterHome = Join-Path $env:USERPROFILE 'flutter'
$flutterBat = Join-Path $flutterHome 'bin\flutter.bat'

Write-Host 'Checking for existing Flutter SDK...'
if (-not (Test-Path $flutterBat)) {
    $zipPath = Join-Path ([System.IO.Path]::GetTempPath()) ('flutter_sdk_' + [System.Guid]::NewGuid().ToString('N') + '.zip')
    $url = 'https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.24.5-stable.zip'

    Write-Host "Downloading Flutter SDK from $url"
    Invoke-WebRequest -Uri $url -OutFile $zipPath

    Write-Host "Extracting Flutter SDK to $env:USERPROFILE"
    Expand-Archive -Path $zipPath -DestinationPath $env:USERPROFILE -Force

    if (-not (Test-Path $flutterBat)) {
        throw 'Flutter SDK did not extract correctly. Please re-run this script.'
    }
}

$env:Path = "$flutterHome\bin;$env:Path"

Write-Host 'Verifying Flutter install...'
& $flutterBat --version

Set-Location $root

if (-not (Test-Path (Join-Path $root 'android'))) {
    Write-Host 'Creating Android project files...'
    & $flutterBat create . --project-name cineflow --platforms=android
}

Write-Host 'Installing Flutter dependencies...'
& $flutterBat pub get

Write-Host 'Running Flutter doctor...'
& $flutterBat doctor

Write-Host 'Setup complete. To launch the app:'
Write-Host '  flutter run'
