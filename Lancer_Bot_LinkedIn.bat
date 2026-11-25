@echo off
rem ====================================================================
rem ResumeSquad - Agent Autonome LinkedIn et Portails Carrieres
rem Conforme Mobilite Internationale EILCO : Suisse, Luxembourg, Belgique
rem Multi-PC Ready (PC 1 et PC 2) - Auto-Setup et Portabilite Totale
rem ====================================================================
chcp 65001 >nul
cd /d "%~dp0"

:menu
echo ====================================================================
echo    ResumeSquad - Agent Autonome LinkedIn [Mode Volume Europe + UE]
echo    Couverture : Toute l'Union Europeenne + Suisse [France Exclue - EILCO]
echo    Priorite   : IA / Agentic / Vision / ML / Cloud / Dev / Data
echo    Filtres    : Anglais Uniquement, Offres Remunerees, Concurrence max 35
echo ====================================================================

rem 1. Verification de Python (support python et py launcher)
set "PY_CMD=python"
python --version >nul 2>&1
if errorlevel 1 (
    py --version >nul 2>&1
    if not errorlevel 1 (
        set "PY_CMD=py"
    ) else (
        echo.
        echo [ERREUR] Python n'est pas detecte dans votre PATH sur ce PC !
        echo Veuillez installer Python - version 3.10 ou superieure - depuis python.org
        echo en pensant a COCHER la case "Add Python to PATH".
        echo.
        pause
        exit /b 1
    )
)

rem 2. Verification automatique des dependances (pour nouveaux PC)
%PY_CMD% -c "import playwright, reportlab, google.genai" >nul 2>&1
if errorlevel 1 (
    echo.
    echo [*] Configuration initiale detectee sur cette machine...
    echo [*] Installation automatique des dependances Python...
    %PY_CMD% -m pip install -r backend\requirements.txt
    echo [*] Installation du navigateur Chromium Playwright...
    %PY_CMD% -m playwright install chromium
    echo [OK] Environnement configure avec succes sur ce PC !
    echo.
)

rem 3. Verification du fichier .env
if not exist "backend\.env" if not exist ".env" if exist "backend\.env.example" (
    copy "backend\.env.example" "backend\.env" >nul
    echo [INFO MULTI-PC] Fichier backend\.env initialise depuis le template.
    echo [ATTENTION] N'oubliez pas d'indiquer votre cle GEMINI_API_KEY dans backend\.env
    echo.
)

rem 4. Verification de la session LinkedIn sur cette machine
set HAS_SESSION=1
if not exist "backend\data\cookies.json" if not exist "backend\data\linkedin_user_profile\Default" set HAS_SESSION=0
if "%HAS_SESSION%"=="0" (
    echo [INFO MULTI-PC] Aucune session LinkedIn locale detectee sur ce PC.
    echo [CONSEIL] Utilisez l'option [5] ci-dessous pour vous connecter une premiere
    echo           fois a LinkedIn et memoriser la session sur cette machine.
    echo.
)

echo.
echo  [1] Mode Volume MAX Europe + UE [Priorite IA vers Data, 25 offres, 24h auto-7j, Remunere, Anglais]
echo  [2] Mode Easy Apply Exclusif Europe [100%% sur LinkedIn, 24h auto-7j, Priorite IA vers Data, max 35 clics]
echo  [3] Mode Cible Suisse + Luxembourg [25 offres, 7 jours, Priorite IA vers Data, max 35 clics]
echo  [4] Mode Simulation Dry-Run Europe [Sans envoi reel, audit des formulaires et offres]
echo  [5] Connexion Manuelle / Verification Session LinkedIn [Fenetre ouverte]
echo  [6] Lancer le Dashboard Web [Next.js sur http://localhost:3000]
echo  [7] Diagnostiquer / Reinstaller les dependances sur ce PC
echo  [8] Quitter
echo.
set "choice="
set /p choice="Votre choix (1-8) : "

if "%choice%"=="1" (
    echo.
    echo [*] Lancement du Mode Volume MAX Europe + UE [Priorite P1-P8, 25 candidatures, max 35 clics, Anglais, Remunere]...
    %PY_CMD% backend\run_linkedin_easy_apply.py --once --all-jobs --location "Europe" --keywords "all" --time-filter 24h --max-apps 25 --turbo --exclude-france --under-10-applicants --max-applicants 35
    echo.
    pause
    goto menu
)
if "%choice%"=="2" (
    echo.
    echo [*] Lancement du Mode Easy Apply Exclusif Europe [Priorite P1-P8, max 35 clics, Anglais, Remunere]...
    %PY_CMD% backend\run_linkedin_easy_apply.py --once --location "Europe" --keywords "all" --time-filter 24h --max-apps 25 --turbo --exclude-france --under-10-applicants --max-applicants 35
    echo.
    pause
    goto menu
)
if "%choice%"=="3" (
    echo.
    echo [*] Lancement du Mode Cible Suisse + Luxembourg [7 jours, Priorite P1-P8, 25 candidatures, max 35 clics]...
    %PY_CMD% backend\run_linkedin_easy_apply.py --once --all-jobs --location "Suisse" --keywords "all" --time-filter week --max-apps 25 --turbo --exclude-france --under-10-applicants --max-applicants 35
    echo.
    pause
    goto menu
)
if "%choice%"=="4" (
    echo.
    echo [*] Lancement en mode simulation Dry-Run Europe [Sans envoi reel, max 35 clics, Anglais, Remunere]...
    %PY_CMD% backend\run_linkedin_easy_apply.py --once --all-jobs --location "Europe" --keywords "all" --time-filter 24h --dry-run --exclude-france --under-10-applicants --max-applicants 35
    echo.
    pause
    goto menu
)
if "%choice%"=="5" (
    echo.
    echo [*] Ouverture du navigateur Chromium pour connexion LinkedIn...
    echo [*] Gardez la fenetre ouverte pour valider le code 2FA / e-mail si demande.
    %PY_CMD% backend\run_linkedin_easy_apply.py --login
    echo.
    pause
    goto menu
)
if "%choice%"=="6" (
    echo.
    echo [*] Demarrage du serveur web local Next.js...
    pushd "%~dp0frontend"
    call npm run dev
    popd
    echo.
    pause
    goto menu
)
if "%choice%"=="7" (
    echo.
    echo [*] Reinstallation complete des dependances Python et Playwright...
    %PY_CMD% -m pip install --upgrade -r backend\requirements.txt
    %PY_CMD% -m playwright install chromium
    echo [OK] Diagnostic et reinstallation termines !
    echo.
    pause
    goto menu
)
if "%choice%"=="8" (
    exit /b 0
)

echo.
echo [!] Choix "%choice%" non reconnu. Veuillez choisir un chiffre entre 1 et 8.
echo.
pause
goto menu
