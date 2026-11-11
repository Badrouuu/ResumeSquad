@echo off
rem ====================================================================
rem ResumeSquad - Agent Autonome LinkedIn et Portails Carrieres
rem Conforme Mobilite Internationale EILCO : Suisse, Luxembourg, Belgique
rem ====================================================================
cd /d "%~dp0"

echo ====================================================================
echo    ResumeSquad - Agent Autonome LinkedIn et Portails Carrieres
echo    Conformite EILCO : Suisse, Luxembourg, Belgique [France Exclue]
echo ====================================================================
echo.
echo  [1] Lancer le Bot Suisse [Production - Easy Apply + ATS]
echo  [2] Lancer le Bot Luxembourg [Production - Easy Apply + ATS]
echo  [3] Lancer le Bot Belgique [Production - Easy Apply + ATS]
echo  [4] Lancer le Bot en Simulation Suisse [Dry-Run sans envoi]
echo  [5] Connexion Manuelle / Verification Session LinkedIn
echo  [6] Lancer le Dashboard Web [Next.js sur http://localhost:3000]
echo  [7] Quitter
echo.
set /p choice="Votre choix (1-7) : "

if "%choice%"=="1" (
    echo.
    echo [*] Lancement du bot autonome [Cible: Suisse - Easy Apply + ATS]...
    python backend\run_linkedin_easy_apply.py --once --all-jobs --location "Suisse" --exclude-france
    pause
    exit /b
)
if "%choice%"=="2" (
    echo.
    echo [*] Lancement du bot autonome [Cible: Luxembourg - Easy Apply + ATS]...
    python backend\run_linkedin_easy_apply.py --once --all-jobs --location "Luxembourg" --exclude-france
    pause
    exit /b
)
if "%choice%"=="3" (
    echo.
    echo [*] Lancement du bot autonome [Cible: Belgique - Easy Apply + ATS]...
    python backend\run_linkedin_easy_apply.py --once --all-jobs --location "Belgique" --exclude-france
    pause
    exit /b
)
if "%choice%"=="4" (
    echo.
    echo [*] Lancement en mode simulation Dry-Run [Suisse]...
    python backend\run_linkedin_easy_apply.py --once --all-jobs --location "Suisse" --dry-run --exclude-france
    pause
    exit /b
)
if "%choice%"=="5" (
    echo.
    echo [*] Ouverture du navigateur Chromium pour connexion LinkedIn...
    python backend\run_linkedin_easy_apply.py --login
    pause
    exit /b
)
if "%choice%"=="6" (
    echo.
    echo [*] Demarrage du serveur web local Next.js...
    cd frontend
    call npm run dev
    pause
    exit /b
)
if "%choice%"=="7" (
    exit /b
)
