#!/usr/bin/env python3
"""
run_linkedin_easy_apply.py — Point d'entrée exécutable pour l'Agent Autonome LinkedIn Easy Apply.

Usage :
    # 1. Premier lancement pour se connecter à LinkedIn (mode visuel interactif) :
    python backend/run_linkedin_easy_apply.py --once

    # 2. Lancement en mode simulation (Dry-Run : remplit tout sans cliquer sur 'Envoyer') :
    python backend/run_linkedin_easy_apply.py --once --dry-run

    # 3. Lancement 100% autonome en tâche de fond (Headless Daemon toutes les 60 min) :
    python backend/run_linkedin_easy_apply.py --daemon --headless --interval 60

    # 4. Cibler des mots-clés ou pays spécifiques :
    python backend/run_linkedin_easy_apply.py --keywords "Computer Vision Stage" --location "Suisse"
"""

import sys
import argparse
from pathlib import Path

# Encodage console Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

# Ajout du dossier racine backend dans le sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app.linkedin_automation import LinkedInEasyApplyOrchestrator


def main():
    parser = argparse.ArgumentParser(
        description="Agent Autonome de Postulation LinkedIn Easy Apply (Playwright + Gemini 1.5 Flash + Discord)"
    )
    parser.add_argument(
        "--keywords",
        type=str,
        default="Machine Learning Stage",
        help="Mots-clés de recherche (défaut : 'Machine Learning Stage')",
    )
    parser.add_argument(
        "--location",
        type=str,
        default="France",
        help="Localisation géographique (défaut : 'France')",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Exécute un seul cycle de candidatures puis s'arrête (par défaut si --daemon n'est pas spécifié)",
    )
    parser.add_argument(
        "--daemon",
        action="store_true",
        help="Exécute le worker en boucle perpétuelle d'arrière-plan",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=60,
        help="Intervalle entre chaque cycle en mode démon (en minutes, défaut : 60)",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Exécute le navigateur sans interface graphique (mode discret en arrière-plan)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Mode simulation : remplit les formulaires et capture l'écran sans soumettre",
    )
    parser.add_argument(
        "--max-apps",
        type=int,
        default=5,
        help="Nombre maximal de candidatures par cycle (défaut : 5)",
    )
    parser.add_argument(
        "--min-delay",
        type=int,
        default=180,
        help="Délai minimal de sécurité entre deux postulations en secondes (défaut : 180s = 3 min)",
    )
    parser.add_argument(
        "--max-delay",
        type=int,
        default=400,
        help="Délai maximal de sécurité entre deux postulations en secondes (défaut : 400s = ~6.5 min)",
    )
    parser.add_argument(
        "--user-data-dir",
        type=str,
        default=None,
        help="Chemin personnalisé vers le profil utilisateur Chromium (persistance de session)",
    )
    parser.add_argument(
        "--cookies-file",
        type=str,
        default=None,
        help="Chemin vers un fichier cookies.json exporté",
    )
    parser.add_argument(
        "--login",
        action="store_true",
        help="Ouvre le navigateur et attend que vous vous connectiez manuellement à LinkedIn (session enregistrée)",
    )
    parser.add_argument(
        "--cv-pdf",
        type=str,
        default=None,
        help="Chemin vers le CV PDF à joindre (défaut : backend/output/CV_Badroudine_Bacar.pdf)",
    )

    args = parser.parse_args()

    orchestrator = LinkedInEasyApplyOrchestrator(
        keywords=args.keywords,
        location=args.location,
        cv_pdf_path=args.cv_pdf,
        user_data_dir=args.user_data_dir,
        cookies_path=args.cookies_file,
        headless=args.headless,
        dry_run=args.dry_run,
        min_delay=args.min_delay,
        max_delay=args.max_delay,
        max_applications_per_cycle=args.max_apps,
    )

    if args.login:
        orchestrator.interactive_login()
        return

    if args.daemon:
        orchestrator.run_daemon(cycle_interval_minutes=args.interval)
    else:
        orchestrator.run_worker_cycle()


if __name__ == "__main__":
    main()
