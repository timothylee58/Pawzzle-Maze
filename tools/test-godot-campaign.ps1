param([string]$GodotExecutable = 'godot')
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
Push-Location $repo
try {
    & node tools/sync-godot-campaign.mjs --check
    if ($LASTEXITCODE -ne 0) { throw 'Campaign data is stale' }
    & node --test packages/game-core/v3/rules.test.js tests/gamepix-platform.test.mjs
    if ($LASTEXITCODE -ne 0) { throw 'JavaScript tests failed' }
    foreach ($suite in @('campaign_test.gd', 'integration_test.gd')) {
        $output = & $GodotExecutable --headless --path games/godot --script $suite -- --test-mode 2>&1
        $code = $LASTEXITCODE
        $output | Write-Output
        if ($code -ne 0 -or ($output -match 'SCRIPT ERROR:|ERROR:')) { throw "Godot suite failed: $suite" }
    }
} finally { Pop-Location }
