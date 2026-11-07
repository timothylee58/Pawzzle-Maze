param(
    [string]$GodotExecutable = 'godot',
    [string]$PackagePath = 'dist/pawzzle-maze-gamepix.zip'
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$project = Join-Path $repo 'games/godot'
$output = Join-Path $repo 'dist/gamepix'
New-Item -ItemType Directory -Path $output -Force | Out-Null
# Keep the checked-in runtime copy synchronized with the standalone sprite pack.
Copy-Item -Path (Join-Path $repo 'Sprites/*') -Destination (Join-Path $project 'Sprites') -Recurse -Force
& $GodotExecutable --headless --path $project --editor --import --quit
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
& $GodotExecutable --headless --path $project --export-release GamePix (Join-Path $output 'index.html')
if ($LASTEXITCODE -ne 0) { throw 'GamePix export failed' }
foreach ($name in @('index.html', 'index.js', 'index.wasm', 'index.pck')) {
    if (-not (Test-Path -LiteralPath (Join-Path $output $name))) { throw "Missing exported file: $name" }
}
$package = if ([IO.Path]::IsPathRooted($PackagePath)) { $PackagePath } else { Join-Path $repo $PackagePath }
New-Item -ItemType Directory -Path (Split-Path $package -Parent) -Force | Out-Null
# Exported files are at ZIP root, never inside a gamepix/ parent directory.
Compress-Archive -Path (Join-Path $output 'index*') -DestinationPath $package -Force
Write-Output "GamePix ZIP: $package"
