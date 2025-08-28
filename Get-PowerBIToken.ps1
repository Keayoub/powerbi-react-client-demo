# Power BI Token Helper Script
# This script helps you get Azure AD tokens for Power BI API access

param(
    [string]$Format = "token-only",  # Options: "token-only", "full", "clipboard"
    [string]$TenantId = $null
)

Write-Host "🔐 Power BI Azure AD Token Generator" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Check if Azure CLI is installed and user is logged in
try {
    $accountInfo = az account show | ConvertFrom-Json
    Write-Host "✅ Logged in as: $($accountInfo.user.name)" -ForegroundColor Green
    Write-Host "📋 Subscription: $($accountInfo.name)" -ForegroundColor Yellow
    Write-Host "🏢 Tenant: $($accountInfo.tenantId)" -ForegroundColor Yellow
    Write-Host ""
} catch {
    Write-Host "❌ Error: Azure CLI not found or not logged in" -ForegroundColor Red
    Write-Host "Please run: az login" -ForegroundColor Yellow
    exit 1
}

# Build the command
$command = "az account get-access-token --resource=https://analysis.windows.net/powerbi/api"

if ($TenantId) {
    $command += " --tenant $TenantId"
    Write-Host "🏢 Using specific tenant: $TenantId" -ForegroundColor Yellow
}

# Execute based on format requested
Write-Host "🔄 Getting Power BI access token..." -ForegroundColor Blue

switch ($Format.ToLower()) {
    "token-only" {
        $token = & cmd /c "$command --query accessToken --output tsv 2>nul"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Token generated successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "📋 Your Power BI Access Token:" -ForegroundColor Cyan
            Write-Host $token -ForegroundColor White
            Write-Host ""
            Write-Host "💡 Copy this token and paste it into your React app's 'Azure AD Access Token' field" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Failed to get token" -ForegroundColor Red
        }
    }
    
    "full" {
        $tokenData = & cmd /c "$command 2>nul" | ConvertFrom-Json
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Token generated successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "📋 Token Details:" -ForegroundColor Cyan
            Write-Host "Token Type: $($tokenData.tokenType)" -ForegroundColor White
            Write-Host "Expires On: $($tokenData.expiresOn)" -ForegroundColor White
            Write-Host "Resource: $($tokenData.resource)" -ForegroundColor White
            Write-Host ""
            Write-Host "🔑 Access Token:" -ForegroundColor Cyan
            Write-Host $tokenData.accessToken -ForegroundColor White
        } else {
            Write-Host "❌ Failed to get token" -ForegroundColor Red
        }
    }
    
    "clipboard" {
        $token = & cmd /c "$command --query accessToken --output tsv 2>nul"
        if ($LASTEXITCODE -eq 0) {
            $token | Set-Clipboard
            Write-Host "✅ Token generated and copied to clipboard!" -ForegroundColor Green
            Write-Host "📋 Token length: $($token.Length) characters" -ForegroundColor Yellow
            Write-Host "💡 Paste it directly into your React app!" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Failed to get token" -ForegroundColor Red
        }
    }
    
    default {
        Write-Host "❌ Invalid format. Use: token-only, full, or clipboard" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📚 Usage Examples:" -ForegroundColor Cyan
Write-Host "  .\Get-PowerBIToken.ps1 -Format token-only" -ForegroundColor Gray
Write-Host "  .\Get-PowerBIToken.ps1 -Format full" -ForegroundColor Gray
Write-Host "  .\Get-PowerBIToken.ps1 -Format clipboard" -ForegroundColor Gray
Write-Host "  .\Get-PowerBIToken.ps1 -Format token-only -TenantId 'your-tenant-id'" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 React App: http://localhost:9000/" -ForegroundColor Green
