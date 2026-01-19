# Find ALL Query Lab conversations - search broader
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

Write-Host "=== Finding ALL Query Lab sessions ===`n"

# Get ALL sessions (no filter)
$allSessionsUrl = "${supabaseUrl}/rest/v1/query_lab_sessions?select=*&order=last_message_at.desc&limit=20"
$allSessions = Invoke-RestMethod -Uri $allSessionsUrl -Headers @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer ${serviceKey}"
}

Write-Host "Total sessions in DB: $($allSessions.Count)"
Write-Host ""

foreach ($s in $allSessions) {
    Write-Host "Session: $($s.id)"
    Write-Host "  Title: $($s.title)"
    Write-Host "  User: $($s.user_id)"
    Write-Host "  Status: $($s.status)"
    Write-Host "  Messages: $($s.message_count)"
    Write-Host "  Last Message: $($s.last_message_at)"
    Write-Host ""
}

# Now specifically search for linhnt user
Write-Host "=== Searching for linhnt@geniee.co.jp ==="
$userUrl = "${supabaseUrl}/rest/v1/users?email=eq.linhnt@geniee.co.jp&select=*"
$users = Invoke-RestMethod -Uri $userUrl -Headers @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer ${serviceKey}"
}

Write-Host "Users found: $($users.Count)"
$users | Format-List

if ($users.Count -gt 0) {
    $userId = $users[0].id
    Write-Host "`nUser ID: ${userId}"

    # Search sessions for this specific user
    $userSessionsUrl = "${supabaseUrl}/rest/v1/query_lab_sessions?user_id=eq.${userId}&select=*&order=last_message_at.desc"
    $userSessions = Invoke-RestMethod -Uri $userSessionsUrl -Headers @{
        "apikey" = $serviceKey
        "Authorization" = "Bearer ${serviceKey}"
    }

    Write-Host "Sessions for this user: $($userSessions.Count)"

    if ($userSessions.Count -gt 0) {
        foreach ($s in $userSessions) {
            Write-Host "`n--- Session: $($s.id) ---"
            Write-Host "Title: $($s.title)"
            Write-Host "Status: $($s.status)"
            Write-Host "Created: $($s.created_at)"
            Write-Host "Last Message: $($s.last_message_at)"
            Write-Host "Message Count: $($s.message_count)"

            # Get messages for this session
            $msgUrl = "${supabaseUrl}/rest/v1/query_lab_messages?session_id=eq.$($s.id)&select=*&order=created_at.asc"
            $messages = Invoke-RestMethod -Uri $msgUrl -Headers @{
                "apikey" = $serviceKey
                "Authorization" = "Bearer ${serviceKey}"
            }

            Write-Host "Messages in DB: $($messages.Count)"
            foreach ($m in $messages) {
                Write-Host "  [$($m.role)] $($m.message_type): $($m.created_at)"
                if ($m.content) {
                    $preview = $m.content.Substring(0, [Math]::Min(80, $m.content.Length))
                    Write-Host "    Content: $preview..."
                }
            }
        }
    }
}

# Also try getting the last 50 messages regardless of session
Write-Host "`n=== Last 50 messages in entire system ==="
$allMsgsUrl = "${supabaseUrl}/rest/v1/query_lab_messages?select=*&order=created_at.desc&limit=50"
$allMsgs = Invoke-RestMethod -Uri $allMsgsUrl -Headers @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer ${serviceKey}"
}

Write-Host "Total recent messages: $($allMsgs.Count)"

# Group by session
$grouped = $allMsgs | Group-Object -Property session_id

foreach ($g in $grouped) {
    Write-Host "`nSession: $($g.Name) - $($g.Count) messages"
    $lastMsg = $g.Group[0]
    Write-Host "  Last: $($lastMsg.role) - $($lastMsg.message_type) at $($lastMsg.created_at)"
}
