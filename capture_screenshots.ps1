$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$outDir = "D:\Projects\Python\wb-agent\docs\screenshots"

$pages = @(
    @{ name = "overview.png"; url = "http://localhost:3000/"; width = 1600; height = 1050 },
    @{ name = "live_inbox.png"; url = "http://localhost:3000/conversations"; width = 1600; height = 1050 },
    @{ name = "leads_pipeline.png"; url = "http://localhost:3000/leads"; width = 1600; height = 1050 },
    @{ name = "orders.png"; url = "http://localhost:3000/orders"; width = 1600; height = 1050 },
    @{ name = "catalog.png"; url = "http://localhost:3000/products"; width = 1600; height = 1050 },
    @{ name = "pricing_rules.png"; url = "http://localhost:3000/pricing"; width = 1600; height = 1050 },
    @{ name = "modular_prompts.png"; url = "http://localhost:3000/prompts"; width = 1600; height = 1050 },
    @{ name = "integrations.png"; url = "http://localhost:3000/integrations"; width = 1600; height = 1050 },
    @{ name = "knowledge_rag.png"; url = "http://localhost:3000/knowledge"; width = 1600; height = 1050 },
    @{ name = "followups.png"; url = "http://localhost:3000/followups"; width = 1600; height = 1050 },
    @{ name = "handoffs.png"; url = "http://localhost:3000/handoffs"; width = 1600; height = 1050 },
    @{ name = "settings.png"; url = "http://localhost:3000/settings"; width = 1600; height = 1050 },
    @{ name = "mobile_overview.png"; url = "http://localhost:3000/"; width = 390; height = 844 },
    @{ name = "mobile_inbox.png"; url = "http://localhost:3000/conversations"; width = 390; height = 844 }
)

foreach ($p in $pages) {
    $targetPath = Join-Path $outDir $p.name
    Write-Host "Capturing $($p.name) ($($p.width)x$($p.height)) from $($p.url)..."
    Start-Process -FilePath $chrome -ArgumentList @(
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--window-size=$($p.width),$($p.height)",
        "--virtual-time-budget=4000",
        "--screenshot=$targetPath",
        $p.url
    ) -Wait
    if (Test-Path $targetPath) {
        $size = (Get-Item $targetPath).Length
        Write-Host "  -> Success: $($p.name) ($size bytes)"
    } else {
        Write-Host "  -> FAILED: $($p.name)"
    }
}
Write-Host "All screenshots captured!"
