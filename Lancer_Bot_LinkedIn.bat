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
echo  [1] Lancer le Bot Suisse Rapide [Production - Delais 15-35s]
echo  [2] Lancer le Bot Suisse Turbo [Production - Delais 5-12s]
echo  [3] Lancer le Bot Luxembourg [Production - Easy Apply + ATS]
echo  [4] Lancer le Bot Simulation Dry-Run [Suisse - Sans envoi]
echo  [5] Connexion Manuelle / Verification Session LinkedIn [Sans fermeture]
echo  [6] Lancer le Dashboard Web [Next.js sur http://localhost:3000]
echo  [7] Quitter
echo.
set /p choice="Votre choix (1-7) : "

if "%choice%"=="1" (
    echo.
    echo [*] Lancement du bot autonome Suisse Rapide [Delais: 15-35s]...
    python backend\run_linkedin_easy_apply.py --once --all-jobs --location "Suisse" --exclude-france
    pause
    exit /b
)
if "%choice%"=="2" (
    echo.
    echo [*] Lancement du bot autonome Suisse Turbo [Delais: 5-12s]...
    python backend\run_linkedin_easy_apply.py --once --all-jobs --location "Suisse" --turbo --exclude-france
    pause
    exit /b
)
if "%choice%"=="3" (
    echo.
    echo [*] Lancement du bot autonome Luxembourg...
    python backend\run_linkedin_easy_apply.py --once --all-jobs --location "Luxembourg" --exclude-france
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
    echo [*] Gardez la fenetre ouverte pour valider le code 2FA / e-mail.
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
