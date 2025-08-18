param(
  [string]$uiDir = "../src/lib/components/ui"
)
$cfgFile = "components.json"
if (Test-Path $cfgFile) {
  try {
    $json = Get-Content $cfgFile -Raw | ConvertFrom-Json
  }
  catch {
    $json = @{}
  }
}
else {
  $json = @{}
}
if ($null -eq $json.aliases) {
  $json.aliases = @{}
}
$json.aliases.ui = $uiDir
$json | ConvertTo-Json -Depth 10 | Set-Content $cfgFile
Write-Host "components.json updated with ui alias $uiDir"
Write-Host "Running shadcn-svelte init"
npx shadcn-svelte init
Write-Host "Installing all components"
npx shadcn-svelte add -a -y
Write-Host "Done"
