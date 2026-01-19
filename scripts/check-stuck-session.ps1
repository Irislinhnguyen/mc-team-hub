# Check the stuck session details
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

$sessionId = "f872081d-9b29-44e2-a0fd-c7066d1898a7"

Write-Host "=== Checking stuck session: ${sessionId} ===`n"

# Get session details
$sessionUrl = "${supabaseUrl}/rest/v1/query_lab_sessions?id=eq.${sessionId}&select=*"
$session = Invoke-RestMethod -Uri $sessionUrl -Headers @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer ${serviceKey}"
}

Write-Host "Session Details:"
$session | Format-List

Write-Host "`nuser_id type/value: $($session.user_id) | $($session.user_id.GetType().Name)"
Write-Host "user_id length: $($session.user_id.Length)"

# Get all messages for this session
$msgUrl = "${supabaseUrl}/rest/v1/query_lab_messages?session_id=eq.${sessionId}&select=*&order=created_at.asc"
$messages = Invoke-RestMethod -Uri $msgUrl -Headers @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer ${serviceKey}"
}

Write-Host "`n=== Messages ($($messages.Count)) ==="

foreach ($m in $messages) {
    Write-Host "`n--- Message $($m.id) ---"
    Write-Host "Role: $($m.role)"
    Write-Host "Type: $($m.message_type)"
    Write-Host "Created: $($m.created_at)"

    if ($m.content) {
        $content = $m.content
        if ($content.Length -gt 200) {
            Write-Host "Content: $($content.Substring(0,200))..."
        } else {
            Write-Host "Content: $content"
        }
    }

    if ($m.sql) {
        $sql = $m.sql
        if ($sql.Length -gt 200) {
            Write-Host "SQL: $($sql.Substring(0,200))..."
        } else {
            Write-Host "SQL: $sql"
        }
    }

    if ($m.warnings) {
        Write-Host "Warnings: $($m.warnings | ConvertTo-Json -Compress)"
    }

    if ($m.retry_info) {
        Write-Host "Retry Info: $($m.retry_info | ConvertTo-Json -Compress)"
    }

    Write-Host "Confidence: $($m.confidence)"
    Write-Host "Row Count: $($m.row_count)"
}
