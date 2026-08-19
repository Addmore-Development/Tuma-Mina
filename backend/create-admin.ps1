# Creates the first admin account.
#
# SECURITY: this used to have a live Supabase service_role key and the admin
# password committed directly in this file. That key can bypass every RLS
# policy in the project — treat it as compromised: rotate it in
# Supabase Dashboard > Project Settings > API > "Reset service_role secret"
# before relying on this script again, and never commit secrets to git.
#
# Usage (PowerShell):
#   $env:SUPABASE_URL = "https://<your-project-ref>.supabase.co"
#   $env:SUPABASE_SERVICE_ROLE_KEY = "<paste after rotating>"
#   $env:ADMIN_EMAIL = "admin@tumamina.co.za"
#   $env:ADMIN_PASSWORD = "<a strong password>"
#   ./create-admin.ps1

$SUPABASE_URL = $env:SUPABASE_URL
$SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY
$ADMIN_EMAIL = $env:ADMIN_EMAIL
$ADMIN_PASSWORD = $env:ADMIN_PASSWORD

if (-not $SUPABASE_URL) {
    Write-Error "SUPABASE_URL environment variable is not set."
    exit 1
}
if (-not $SERVICE_ROLE_KEY) {
    Write-Error "SUPABASE_SERVICE_ROLE_KEY environment variable is not set."
    exit 1
}
if (-not $ADMIN_EMAIL -or -not $ADMIN_PASSWORD) {
    Write-Error "ADMIN_EMAIL and ADMIN_PASSWORD environment variables must both be set."
    exit 1
}

$headers = @{
    "apikey" = $SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

# user_metadata here is what backend/sql/schema_fixes.sql's handle_new_user
# trigger reads to provision the public.profiles row with role = 'admin' —
# without it the trigger defaults new signups to 'customer', which is what
# silently broke the admin dashboard before (a profiles row existed with the
# wrong role, so is_admin() returned false and RLS blocked every query).
$body = @{
    email = $ADMIN_EMAIL
    password = $ADMIN_PASSWORD
    email_confirm = $true
    user_metadata = @{
        role = "admin"
        name = "Admin"
        surname = ""
    }
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$SUPABASE_URL/auth/v1/admin/users" -Method Post -Headers $headers -Body $body -UserAgent "PowerShell-Server-Script/1.0"
$response
$response.id