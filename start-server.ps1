# --- KONFIGURATION ---
$url = "http://localhost:8080/"
$rootPath = $PSScriptRoot
$dbFile = "$rootPath\data\database.json"

# --- CHECK FOR EXISTING INSTANCE ---
# Try to start the listener immediately. 
# If port 8080 is taken, we assume the server is already running.
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)

try {
    $listener.Start()
} catch {
    # If we catch an error, the port is busy. 
    # Just open the dashboard and exit this new instance.
    Start-Process $url
    Exit
}

# =======================================================
# IF WE ARE HERE, WE ARE THE MAIN SERVER INSTANCE
# =======================================================

# Load required assemblies for system tray
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Hide the PowerShell console window (in case VBS didn't catch it perfectly)
Add-Type -Name Window -Namespace Console -MemberDefinition '
[DllImport("Kernel32.dll")]
public static extern IntPtr GetConsoleWindow();

[DllImport("user32.dll")]
public static extern bool ShowWindow(IntPtr hWnd, Int32 nCmdShow);
'

$consolePtr = [Console.Window]::GetConsoleWindow()
[Console.Window]::ShowWindow($consolePtr, 0) # 0 = hide

# Create system tray icon
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
$notifyIcon.Text = "LB Dashboard Server - Running on port 8080"
$notifyIcon.Visible = $true

# Create context menu
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

# Menu item: Show Console
$showConsoleItem = New-Object System.Windows.Forms.ToolStripMenuItem
$showConsoleItem.Text = "Show Console"
$showConsoleItem.Add_Click({
    [Console.Window]::ShowWindow($consolePtr, 5) # 5 = show
})

# Menu item: Hide Console
$hideConsoleItem = New-Object System.Windows.Forms.ToolStripMenuItem
$hideConsoleItem.Text = "Hide Console"
$hideConsoleItem.Add_Click({
    [Console.Window]::ShowWindow($consolePtr, 0) # 0 = hide
})

# Menu item: Open Dashboard
$openDashboardItem = New-Object System.Windows.Forms.ToolStripMenuItem
$openDashboardItem.Text = "Open Dashboard"
$openDashboardItem.Add_Click({
    Start-Process $url
})

# Menu item: Stop Server
$exitItem = New-Object System.Windows.Forms.ToolStripMenuItem
$exitItem.Text = "Stop Server"
$exitItem.Add_Click({
    $notifyIcon.Visible = $false
    $listener.Stop()
    [System.Windows.Forms.Application]::Exit()
    Stop-Process -Id $PID
})

# Add items to context menu
$contextMenu.Items.Add($openDashboardItem) | Out-Null
$contextMenu.Items.Add("-") | Out-Null
$contextMenu.Items.Add($showConsoleItem) | Out-Null
$contextMenu.Items.Add($hideConsoleItem) | Out-Null
$contextMenu.Items.Add("-") | Out-Null
$contextMenu.Items.Add($exitItem) | Out-Null

$notifyIcon.ContextMenuStrip = $contextMenu

# Double-click opens dashboard
$notifyIcon.Add_DoubleClick({
    Start-Process $url
})

Write-Host "=================================================" -ForegroundColor Green
Write-Host "  LB DASHBOARD SERVER (UTF-8 FIXED)" -ForegroundColor Green
Write-Host "  Adresse: $url" -ForegroundColor Cyan
Write-Host "  Running in system tray..." -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Green

# Start browser (Since this is the first successful run)
Start-Process $url

# --- DETECT CURRENT USER ---
$currentUsername = $env:USERNAME
$displayName = if ($currentUsername -eq "andre") {
    "Andre"
} else {
    "Administrator"
}
# Convert username to uppercase for image filename
$profileImage = "Profilbilleder/$($currentUsername.ToUpper()).jpg"

# Store user info for API access
$userInfo = @{
    username = $currentUsername
    displayName = $displayName
    profileImage = $profileImage
}

Write-Host "Detected user: $displayName ($currentUsername)" -ForegroundColor Cyan

# Server loop in background runspace
$serverScript = {
    param($listener, $rootPath, $dbFile, $userInfo)
    
    while ($listener.IsListening) {
        try {
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
                    $encoding = [System.Text.Encoding]::UTF8
                    $reader = New-Object System.IO.StreamReader($request.InputStream, $encoding)
                    $body = $reader.ReadToEnd()
                    
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
            # --- API: GET USER INFO ---
            elseif ($request.Url.LocalPath -eq "/api/user" -and $request.HttpMethod -eq "GET") {
                $response.ContentType = "application/json; charset=utf-8"
                $userJson = @{
                    username = $userInfo.username
                    displayName = $userInfo.displayName
                    profileImage = $userInfo.profileImage
                } | ConvertTo-Json -Compress
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($userJson)
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            }
            # --- FIL-SERVER ---
            else {
                $filePath = $request.Url.LocalPath.TrimStart('/')
                if ($filePath -eq "") { $filePath = "index.html" }
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
        } catch {
            # Ignore errors from stopping the listener
        }
    }
}

# Start server in background
$runspace = [runspacefactory]::CreateRunspace()
$runspace.Open()
$runspace.SessionStateProxy.SetVariable("listener", $listener)
$runspace.SessionStateProxy.SetVariable("rootPath", $rootPath)
$runspace.SessionStateProxy.SetVariable("dbFile", $dbFile)
$runspace.SessionStateProxy.SetVariable("userInfo", $userInfo)

$powershell = [powershell]::Create()
$powershell.Runspace = $runspace
$powershell.AddScript($serverScript).AddArgument($listener).AddArgument($rootPath).AddArgument($dbFile).AddArgument($userInfo) | Out-Null
$handle = $powershell.BeginInvoke()

# Keep the application running
[System.Windows.Forms.Application]::Run()