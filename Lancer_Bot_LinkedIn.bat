@echo off
chcp 65001 > nul
title ResumeSquad - Agent Autonome LinkedIn
cd /d "%~dp0"

echo ======================================================================
echo    🤖 ResumeSquad - Agent Autonome LinkedIn & Portails Carrières
echo ======================================================================
echo.
echo  [1] Lancer le Bot (Production - Toutes offres Easy Apply + ATS)
echo  [2] Lancer le Bot en Simulation (Dry-Run avec captures d'écran)
echo  [3] Lancer le Dashboard Web (Next.js sur http://localhost:3000)
echo  [4] Connexion Manuelle / Vérification de Session
echo  [5] Quitter
echo.
set /p choice="Votre choix (1/2/3/4/5) : "

if "%choice%"=="1" (
    echo.
    echo 🚀 Lancement du bot autonome en production...
    python backend/run_linkedin_easy_apply.py --once --all-jobs
    pause
    exit /b
)
if "%choice%"=="2" (
    echo.
    echo 🧪 Lancement en mode simulation (Dry-Run)...
    python backend/run_linkedin_easy_apply.py --once --all-jobs --dry-run
    pause
    exit /b
)
if "%choice%"=="3" (
    echo.
    echo 🌐 Démarrage du serveur web Next.js...
    cd frontend
    npm run dev
    pause
    exit /b
)
if "%choice%"=="4" (
    echo.
    echo 🔑 Ouverture du navigateur pour connexion...
    python backend/run_linkedin_easy_apply.py --login
    pause
    exit /b
)
