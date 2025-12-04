# --- KONFIGURATION ---
$url = "http://localhost:8080/"
$rootPath = $PSScriptRoot
$dbFile = "$rootPath\database.json"

# Start HTTP Listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
try {
    $listener.Start()
} catch {
    Write-Host "Fejl: Kunne ikke starte server på port 8080. Måske kører den allerede?" -ForegroundColor Red
    Pause
    Exit
}

Write-Host "=================================================" -ForegroundColor Green
Write-Host "  LB DASHBOARD SERVER (UTF-8 FIXED)" -ForegroundColor Green
Write-Host "  Adresse: $url" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Green

# Start browser
Start-Process $url

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    
    # CORS Headers
    $response.AddHeader("Access-Control-Allow-Origin", "*")
    $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $response.AddHeader("Access-Control-Allow-Headers", "Content-Type")
    $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")

    if ($request.HttpMethod -eq "OPTIONS") {
        $response.Close()
        continue
    }

    # --- API: HENT DATA (GET) ---
    if ($request.Url.LocalPath -eq "/api/data" -and $request.HttpMethod -eq "GET") {
        if (Test-Path $dbFile) {
            # VIGTIGT: Læs som UTF8 eksplizit
            $json = Get-Content $dbFile -Raw -Encoding UTF8
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
        } else {
            $buffer = [System.Text.Encoding]::UTF8.GetBytes('{"converted":[], "nonConverted":[], "rejected":[]}')
        }
        $response.ContentType = "application/json; charset=utf-8"
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
    }
    # --- API: GEM DATA (POST) ---
    elseif ($request.Url.LocalPath -eq "/api/save" -and $request.HttpMethod -eq "POST") {
        try {
            # VIGTIG RETTELSE: Tving UTF-8 når vi læser fra browseren
            $encoding = [System.Text.Encoding]::UTF8
            $reader = New-Object System.IO.StreamReader($request.InputStream, $encoding)
            $body = $reader.ReadToEnd()
            
            # Gem til fil med UTF-8 (uden BOM for maksimal kompatibilitet)
            [System.IO.File]::WriteAllText($dbFile, $body, $encoding)
            
            $msg = "Gemt succesfuldt"
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($msg)
            $response.StatusCode = 200
        } catch {
            Write-Host "Fejl ved gemning: $_" -ForegroundColor Red
            $msg = "Fejl ved gemning: $_"
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($msg)
            $response.StatusCode = 500
        }
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
    }
    # --- FIL-SERVER ---
    else {
        $filePath = $request.Url.LocalPath.TrimStart('/')
        if ($filePath -eq "") { $filePath = "dashboard.html" }
        $localPath = Join-Path $rootPath $filePath

        if (Test-Path $localPath -PathType Leaf) {
            $extension = [System.IO.Path]::GetExtension($localPath)
            switch ($extension) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                ".json" { $response.ContentType = "application/json; charset=utf-8" }
                Default { $response.ContentType = "application/octet-stream" }
            }

            $content = [System.IO.File]::ReadAllBytes($localPath)
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
        } else {
            $response.StatusCode = 404
        }
    }
    $response.Close()
}