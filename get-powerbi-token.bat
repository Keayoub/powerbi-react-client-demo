@echo off
REM Power BI Token Generator - Windows Batch Script

echo.
echo ===========================================
echo    Power BI Azure AD Token Generator
echo ===========================================
echo.

REM Check if Azure CLI is available
az --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Azure CLI not found or not installed
    echo Please install Azure CLI and run: az login
    pause
    exit /b 1
)

REM Check if user is logged in
az account show >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Not logged into Azure CLI
    echo Please run: az login
    pause
    exit /b 1
)

echo Checking Azure account...
for /f "tokens=*" %%i in ('az account show --query "user.name" --output tsv') do set USERNAME=%%i
for /f "tokens=*" %%i in ('az account show --query "name" --output tsv') do set SUBSCRIPTION=%%i

echo.
echo Logged in as: %USERNAME%
echo Subscription: %SUBSCRIPTION%
echo.

echo Getting Power BI access token...
echo.

REM Get the token
for /f "tokens=*" %%i in ('az account get-access-token --resource^=https://analysis.windows.net/powerbi/api --query accessToken --output tsv') do set POWERBI_TOKEN=%%i

if "%POWERBI_TOKEN%"=="" (
    echo ERROR: Failed to get Power BI token
    echo Make sure you have Power BI permissions
    pause
    exit /b 1
)

echo SUCCESS: Power BI Access Token Generated!
echo.
echo ================================================================
echo Your Power BI Access Token:
echo ================================================================
echo %POWERBI_TOKEN%
echo ================================================================
echo.
echo INSTRUCTIONS:
echo 1. Copy the token above
echo 2. Open your React app at: http://localhost:9000/
echo 3. Paste the token into the "Azure AD Access Token" field
echo 4. Fill in your Power BI Report ID and Workspace ID
echo 5. Click "Generate Embed Token"
echo.
echo Token expires in approximately 1 hour
echo.
pause
