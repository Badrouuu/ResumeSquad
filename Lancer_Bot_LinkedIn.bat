@echo off
rem ====================================================================
rem ResumeSquad - Agent Autonome LinkedIn et Portails Carrieres
rem Conforme Mobilite Internationale EILCO : Suisse, Luxembourg, Belgique
rem Multi-PC Ready (PC 1 & PC 2) - Auto-Setup & Portabilite Totale
rem ====================================================================
chcp 65001 >nul
cd /d "%~dp0"

echo ====================================================================
echo    ResumeSquad - Agent Autonome LinkedIn [Mode Volume MAX]
echo    Conformite EILCO : Suisse, Luxembourg, Belgique [France Exclue]
echo    Support Multi-PC : PC 1 & PC 2 [Auto-Setup integre]
echo ====================================================================

rem 1. Verification de Python
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERREUR] Python n'est pas detecte dans votre PATH sur ce PC !
    echo Veuillez installer Python (version 3.10 ou superieure) depuis python.org
    echo en pensant a COCHER la case "Add Python to PATH".
    echo.
    pause
    exit /b 1
)

rem 2. Verification automatique des dependances (pour nouveaux PC)
python -c "import playwright, reportlab, google.genai" >nul 2>&1
if errorlevel 1 (
    echo.
    echo [*] Configuration initiale detectee sur cette machine...
    echo [*] Installation automatique des dependances Python...
    python -m pip install -r backend\requirements.txt
    echo [*] Installation du navigateur Chromium Playwright...
    python -m playwright install chromium
    echo [OK] Environnement configure avec succes sur ce PC !
    echo.
)

rem 3. Verification du fichier .env
if not exist "backend\.env" if not exist ".env" (
    if exist "backend\.env.example" (
        copy "backend\.env.example" "backend\.env" >nul
        echo [INFO MULTI-PC] Fichier backend\.env initialise depuis le template.
        echo [ATTENTION] N'oubliez pas d'indiquer votre cle GEMINI_API_KEY dans backend\.env !
        echo.
    )
)

rem 4. Verification de la session LinkedIn sur cette machine
set HAS_SESSION=1
if not exist "backend\data\cookies.json" (
    if not exist "backend\data\linkedin_user_profile\Default" (
        set HAS_SESSION=0
    )
)
if "%HAS_SESSION%"=="0" (
    echo [INFO MULTI-PC] Aucune session LinkedIn locale detectee sur ce PC.
    echo [CONSEIL] Utilisez l'option [5] ci-dessous pour vous connecter une premiere
    echo           fois a LinkedIn et memoriser la session sur cette machine.
    echo.
)

echo.
echo  [1] Mode Volume MAX Suisse [Turbo 5-10s, 25 offres, <= 10 Candidats, Easy Apply + ATS]
echo  [2] Mode Easy Apply Exclusif Suisse [100%% sur LinkedIn, <= 10 Candidats, zero redirection]
echo  [3] Mode Volume MAX Luxembourg [Turbo 5-10s, 25 offres, <= 10 Candidats]
echo  [4] Mode Simulation Dry-Run [Suisse - Sans envoi reel, <= 10 Candidats]
echo  [5] Connexion Manuelle / Verification Session LinkedIn [Fenetre ouverte]
echo  [6] Lancer le Dashboard Web [Next.js sur http://localhost:3000]
echo  [7] Diagnostiquer / Reinstaller les dependances sur ce PC
echo  [8] Quitter
echo.
set /p choice="Votre choix (1-8) : "

if "%choice%"=="1" (
    echo.
    echo [*] Lancement du Mode Volume MAX Suisse [Turbo - 25 candidatures, <= 10 candidats]...
    python backend\run_linkedin_easy_apply.py --once --all-jobs --location "Suisse" --max-apps 25 --turbo --exclude-france --under-10-applicants --max-applicants 10
    pause
    exit /b
)
if "%choice%"=="2" (
    echo.
    echo [*] Lancement du Mode Easy Apply Exclusif Suisse [<= 10 candidats]...
    python backend\run_linkedin_easy_apply.py --once --location "Suisse" --max-apps 25 --turbo --exclude-france --under-10-applicants --max-applicants 10
    pause
    exit /b
)
if "%choice%"=="3" (
    echo.
    echo [*] Lancement du Mode Volume MAX Luxembourg [Turbo - 25 candidatures, <= 10 candidats]...
    python backend\run_linkedin_easy_apply.py --once --all-jobs --location "Luxembourg" --max-apps 25 --turbo --exclude-france --under-10-applicants --max-applicants 10
    pause
    exit /b
)
if "%choice%"=="4" (
    echo.
    echo [*] Lancement en mode simulation Dry-Run [Suisse, <= 10 candidats]...
    python backend\run_linkedin_easy_apply.py --once --all-jobs --location "Suisse" --dry-run --exclude-france --under-10-applicants --max-applicants 10
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
    echo.
    echo [*] Reinstallation complete des dependances Python et Playwright...
    python -m pip install --upgrade -r backend\requirements.txt
    python -m playwright install chromium
    echo [OK] Diagnostic et reinstallation termines !
    pause
    exit /b
)
if "%choice%"=="8" (
    exit /b
)
