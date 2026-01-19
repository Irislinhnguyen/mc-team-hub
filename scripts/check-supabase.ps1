# Simple PowerShell script to query Supabase
# Load env file
$envFile = Get-Content ".env.local" | Where-Object { $_ -match "=" }
foreach ($line in $envFile) {
    if ($line -match "^([^#].+?)=(.+)$") {
        $name = $matches[1]
        $value = $matches[2]
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

$supabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$serviceKey = $env:SUPABASE_SERVICE_ROLE_KEY

Write-Host "Checking Query Lab sessions for linhnt@geniee.co.jp..."
Write-Host ""

# Get user
$userUrl = "${supabaseUrl}/rest/v1/users?email=eq.linhnt@geniee.co.jp&select=id,email"
$user = Invoke-RestMethod -Uri $userUrl -Headers @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer ${serviceKey}"
}

if ($user.Count -eq 0) {
    Write-Host "User not found!"
    exit
}

$userId = $user[0].id
Write-Host "User found: $userId"

# Get sessions
$sessionsUrl = "${supabaseUrl}/rest/v1/query_lab_sessions?user_id=eq.${userId}&select=*"
$sessions = Invoke-RestMethod -Uri $sessionsUrl -Headers @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer ${serviceKey}"
}

Write-Host "Sessions found: $($sessions.Count)"
if ($sessions.Count -gt 0) {
    $sessions | Format-List
}

# Get messages if sessions exist
if ($sessions.Count -gt 0) {
    $sessionId = $sessions[0].id
    Write-Host "`nMessages for session ${sessionId}:"

    $messagesUrl = "${supabaseUrl}/rest/v1/query_lab_messages?session_id=eq.${sessionId}&select=*&order=created_at.asc"
    $messages = Invoke-RestMethod -Uri $messagesUrl -Headers @{
        "apikey" = $serviceKey
        "Authorization" = "Bearer ${serviceKey}"
    }

    Write-Host "Messages: $($messages.Count)"
    foreach ($msg in $messages) {
        Write-Host "  [$($msg.role)] $($msg.message_type): $($msg.content.Substring(0, [Math]::Min(100, $msg.content.Length)))..."
    }
}
