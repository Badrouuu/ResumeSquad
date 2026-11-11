@echo off
rem ====================================================================
rem ResumeSquad - Agent Autonome LinkedIn et Portails Carrieres
rem Conforme Mobilite Internationale EILCO : Suisse, Luxembourg, Belgique
rem ====================================================================
cd /d "%~dp0"

echo ====================================================================
echo    ResumeSquad - Agent Autonome LinkedIn [Mode Volume MAX]
echo    Conformite EILCO : Suisse, Luxembourg, Belgique [France Exclue]
echo ====================================================================
echo.
echo  [1] Mode Volume MAX Suisse [Turbo 5-10s, 25 offres, Easy Apply + ATS directs]
echo  [2] Mode Easy Apply Exclusif Suisse [100% sur LinkedIn, zero redirection]
echo  [3] Mode Volume MAX Luxembourg [Turbo 5-10s, 25 offres]
echo  [4] Mode Simulation Dry-Run [Suisse - Sans envoi reel]
echo  [5] Connexion Manuelle / Verification Session LinkedIn [Fenetre ouverte]
echo  [6] Lancer le Dashboard Web [Next.js sur http://localhost:3000]
echo  [7] Quitter
echo.
set /p choice="Votre choix (1-7) : "

if "%choice%"=="1" (
    echo.
    echo [*] Lancement du Mode Volume MAX Suisse [Turbo - 25 candidatures]...
    python backend\run_linkedin_easy_apply.py --once --all-jobs --location "Suisse" --max-apps 25 --turbo --exclude-france
    pause
    exit /b
)
if "%choice%"=="2" (
    echo.
    echo [*] Lancement du Mode Easy Apply Exclusif Suisse [100% sur LinkedIn]...
    python backend\run_linkedin_easy_apply.py --once --location "Suisse" --max-apps 25 --turbo --exclude-france
    pause
    exit /b
)
if "%choice%"=="3" (
    echo.
    echo [*] Lancement du Mode Volume MAX Luxembourg [Turbo - 25 candidatures]...
    python backend\run_linkedin_easy_apply.py --once --all-jobs --location "Luxembourg" --max-apps 25 --turbo --exclude-france
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
    echo [*] Gardez la fenetre ouverte pour valider le code 2FA / e-mail si demande.
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
