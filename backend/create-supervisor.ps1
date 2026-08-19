# Creates (or resets) a supervisor account.
#
# Supervisors are normally provisioned via the invite-supervisor edge
# function, which deliberately never sets/sees the supervisor's password
# (magic-link invite, they set it themselves on first login). This script
# bypasses that on purpose, for cases where you need a known password up
# front (e.g. a demo/test account) — it creates the auth user directly via
# the service_role key, same as create-admin.ps1 does for admins.
#
# SECURITY NOTE: a fixed, shared password on an account that can see every
# customer's contact details and (by default) escrow/revenue data is a
# meaningfully weaker setup than the invite flow. If this is more than a
# throwaway/demo account, change the password after first login (Supervisor
# dashboard has no self-service password change yet — do it via Supabase
# Dashboard > Authentication > Users > select user > "Send password reset",
# or asaddSupervisor). Never commit the password or service_role key to git.
#
# Usage (PowerShell):
#   $env:SUPABASE_URL = "https://<your-project-ref>.supabase.co"
#   $env:SUPABASE_SERVICE_ROLE_KEY = "<service_role key>"
#   $env:SUPERVISOR_EMAIL = "supervisor@tumamina.co.za"
#   $env:SUPERVISOR_PASSWORD = "Happy@123"
#   $env:SUPERVISOR_NAME = "Supervisor"
#   $env:SUPERVISOR_SURNAME = ""
#   $env:SUPERVISOR_TOWN = ""              # blank/omit = "All towns"
#   $env:SUPERVISOR_CAN_VIEW_FINANCIALS = "true"
#   ./create-supervisor.ps1

$SUPABASE_URL = $env:SUPABASE_URL
$SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY
$SUPERVISOR_EMAIL = $env:SUPERVISOR_EMAIL
$SUPERVISOR_PASSWORD = if ($env:SUPERVISOR_PASSWORD) { $env:SUPERVISOR_PASSWORD } else { "Happy@123" }
$SUPERVISOR_NAME = if ($env:SUPERVISOR_NAME) { $env:SUPERVISOR_NAME } else { "Supervisor" }
$SUPERVISOR_SURNAME = if ($env:SUPERVISOR_SURNAME) { $env:SUPERVISOR_SURNAME } else { "" }
$SUPERVISOR_TOWN = $env:SUPERVISOR_TOWN  # blank -> null -> "All towns"
$CAN_VIEW_FINANCIALS = if ($env:SUPERVISOR_CAN_VIEW_FINANCIALS) { $env:SUPERVISOR_CAN_VIEW_FINANCIALS } else { "true" }

if (-not $SUPABASE_URL) { Write-Error "SUPABASE_URL environment variable is not set."; exit 1 }
if (-not $SERVICE_ROLE_KEY) { Write-Error "SUPABASE_SERVICE_ROLE_KEY environment variable is not set."; exit 1 }
if (-not $SUPERVISOR_EMAIL) { Write-Error "SUPERVISOR_EMAIL environment variable is not set."; exit 1 }

$headers = @{
    "apikey"        = $SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SERVICE_ROLE_KEY"
    "Content-Type"  = "application/json"
}

# 1. Create the auth user directly with the given password. user_metadata
#    here is what handle_new_user (backend/sql/schema fixes.sql) reads to
#    provision the public.profiles row — role = "supervisor" here, matching
#    what invite-supervisor sets for invited supervisors.
$authBody = @{
    email         = $SUPERVISOR_EMAIL
    password      = $SUPERVISOR_PASSWORD
    email_confirm = $true
    user_metadata = @{
        role    = "supervisor"
        name    = $SUPERVISOR_NAME
        surname = $SUPERVISOR_SURNAME
    }
} | ConvertTo-Json

$authResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/auth/v1/admin/users" -Method Post -Headers $headers -Body $authBody -UserAgent "PowerShell-Server-Script/1.0"
$newUserId = $authResponse.id
Write-Output "Created auth user: $newUserId ($SUPERVISOR_EMAIL)"

# 2. handle_new_user only auto-provisions customer_profiles for role =
#    "customer" (see schema fixes.sql) — supervisors are expected to go
#    through invite-supervisor, which inserts supervisor_profiles itself.
#    Since we bypassed that function, insert the row here.
$supervisorProfileBody = @{
    id                   = $newUserId
    town                 = if ($SUPERVISOR_TOWN) { $SUPERVISOR_TOWN } else { $null }
    can_view_financials  = [bool]::Parse($CAN_VIEW_FINANCIALS)
} | ConvertTo-Json

$restHeaders = $headers.Clone()
$restHeaders["Prefer"] = "return=representation"

$profileResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/supervisor_profiles" -Method Post -Headers $restHeaders -Body $supervisorProfileBody
Write-Output "Created supervisor_profiles row:"
$profileResponse

Write-Output ""
Write-Output "Login details:"
Write-Output "  Email:    $SUPERVISOR_EMAIL"
Write-Output "  Password: $SUPERVISOR_PASSWORD"
Write-Output "  Town:     $(if ($SUPERVISOR_TOWN) { $SUPERVISOR_TOWN } else { 'All towns' })"