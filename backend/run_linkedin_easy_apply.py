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
        default="Machine Learning Intern English",
        help="Mots-clés de recherche (défaut : 'Machine Learning Intern English')",
    )
    parser.add_argument(
        "--location",
        type=str,
        default="Suisse",
        help="Localisation géographique (défaut : 'Suisse' pour conformité EILCO)",
    )
    parser.add_argument(
        "--exclude-france",
        dest="exclude_france",
        action="store_true",
        default=True,
        help="Exclure strictement la France pour valider la mobilité internationale EILCO (par défaut : True)",
    )
    parser.add_argument(
        "--allow-france",
        dest="exclude_france",
        action="store_false",
        help="Autoriser les offres en France (désactive le filtre de mobilité internationale)",
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
        default=15,
        help="Délai minimal entre deux postulations en secondes (défaut : 15s)",
    )
    parser.add_argument(
        "--max-delay",
        type=int,
        default=35,
        help="Délai maximal entre deux postulations en secondes (défaut : 35s)",
    )
    parser.add_argument(
        "--turbo",
        action="store_true",
        help="Mode ultra-rapide (5 à 12 secondes entre chaque postulation)",
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
    parser.add_argument(
        "--all-jobs",
        action="store_true",
        help="Postule à TOUTES les offres (Candidatures simplifiées ET sites carrières externes ATS)",
    )
    parser.add_argument(
        "--under-10-applicants",
        dest="under_10_applicants",
        action="store_true",
        default=True,
        help="Cibler uniquement les offres à très faible concurrence (<= 10 candidats, filtre LinkedIn f_EA=true)",
    )
    parser.add_argument(
        "--allow-high-competition",
        dest="under_10_applicants",
        action="store_false",
        help="Autoriser les offres à forte concurrence (> 10 candidats)",
    )
    parser.add_argument(
        "--max-applicants",
        type=int,
        default=10,
        help="Nombre maximal de candidats autorisés sur une offre (défaut : 10)",
    )

    parser.add_argument(
        "--time-filter",
        type=str,
        default="24h",
        choices=["24h", "week", "all"],
        help="Filtre temporel des offres : '24h' (f_TPR=r86400, défaut), 'week' (f_TPR=r604800), ou 'all'",
    )

    args = parser.parse_args()

    min_delay = 5 if args.turbo else args.min_delay
    max_delay = 12 if args.turbo else args.max_delay

    orchestrator = LinkedInEasyApplyOrchestrator(
        keywords=args.keywords,
        location=args.location,
        cv_pdf_path=args.cv_pdf,
        user_data_dir=args.user_data_dir,
        cookies_path=args.cookies_file,
        headless=args.headless,
        dry_run=args.dry_run,
        min_delay=min_delay,
        max_delay=max_delay,
        max_applications_per_cycle=args.max_apps,
        all_jobs=args.all_jobs,
        exclude_france=args.exclude_france,
        under_10_applicants=args.under_10_applicants,
        max_applicants=args.max_applicants,
        time_filter=args.time_filter,
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
