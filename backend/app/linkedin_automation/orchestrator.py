"""
orchestrator.py — Boucle principale Worker d'automatisation LinkedIn Easy Apply (Étape 5).

Fonctionnalités :
1. Coordination complète : BrowserAgent -> GeminiAgent -> DiscordNotifier.
2. Délais aléatoires de protection anti-ban (180 à 400 secondes entre chaque postulation).
3. Journalisation persistante dans backend/data/linkedin_applications_history.json.
4. Mode démon (daemon) pour exécution continue en arrière-plan avec gestion propre de l'arrêt.
"""

import os
import sys
import json
import time
import random
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any

from .browser_agent import LinkedInBrowserAgent
from .gemini_agent import GeminiCoverLetterGenerator
from .discord_notifier import DiscordNotifier


class LinkedInEasyApplyOrchestrator:
    """Orchestrateur central du worker autonome de candidatures LinkedIn."""

    def __init__(
        self,
        keywords: str = "Machine Learning Stage",
        location: str = "France",
        cv_pdf_path: Optional[str] = None,
        user_data_dir: Optional[str] = None,
        cookies_path: Optional[str] = None,
        webhook_url: Optional[str] = None,
        headless: bool = False,
        dry_run: bool = False,
        min_delay: int = 180,
        max_delay: int = 400,
        max_applications_per_cycle: int = 10,
    ):
        self.keywords = keywords
        self.location = location
        self.headless = headless
        self.dry_run = dry_run
        self.min_delay = min_delay
        self.max_delay = max_delay
        self.max_applications = max_applications_per_cycle

        # Chemins des données et artefacts
        base_dir = Path(__file__).resolve().parent.parent.parent
        self.data_dir = base_dir / "data"
        self.output_dir = base_dir / "output"
        self.screenshots_dir = self.output_dir / "screenshots"
        self.history_file = self.data_dir / "linkedin_applications_history.json"

        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.screenshots_dir.mkdir(parents=True, exist_ok=True)

        # CV principal de Badroudine Bacar
        default_cv = self.output_dir / "CV_Badroudine_Bacar.pdf"
        self.cv_pdf_path = cv_pdf_path or (str(default_cv) if default_cv.exists() else "")

        # Initialisation des sous-modules
        self.browser_agent = LinkedInBrowserAgent(
            user_data_dir=user_data_dir,
            cookies_path=cookies_path,
            headless=headless,
        )
        self.gemini_agent = GeminiCoverLetterGenerator()
        self.discord_notifier = DiscordNotifier(webhook_url=webhook_url)

    def load_history(self) -> List[Dict[str, Any]]:
        """Charge l'historique des candidatures pour ne jamais postuler en double."""
        if self.history_file.exists():
            try:
                with open(self.history_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return []
        return []

    def save_history(self, history: List[Dict[str, Any]]):
        """Enregistre l'historique sur le disque."""
        with open(self.history_file, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2, ensure_ascii=False)

    def run_worker_cycle(self) -> int:
        """
        Exécute un cycle de travail complet :
        1. Connexion & initialisation Playwright
        2. Recherche des offres Easy Apply fraîches
        3. Pour chaque offre : extraction, lettre Gemini, remplissage, envoi, Discord, pause aléatoire
        """
        print("\n" + "=" * 70)
        print(f"🤖 [LinkedIn Worker] Démarrage du cycle à {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🎯 Mots-clés : '{self.keywords}' | Lieu : '{self.location}' | Mode : {'Simulation (Dry-Run)' if self.dry_run else 'Production 100% Autonome'}")
        print("=" * 70)

        history = self.load_history()
        applied_ids = {item.get("id") for item in history}
        print(f"📚 [Historique] {len(applied_ids)} offre(s) déjà traitée(s) par le passé.")

        if not self.cv_pdf_path or not os.path.exists(self.cv_pdf_path):
            print(f"⚠️ [Avertissement] Aucun CV PDF trouvé à l'emplacement '{self.cv_pdf_path}'.")

        # Initialisation du navigateur Playwright
        self.browser_agent.initialize_session()

        # Vérification de l'authentification
        is_logged_in = self.browser_agent.verify_linkedin_login()
        if not is_logged_in:
            if self.headless:
                print("❌ [Arrêt] La session n'est pas connectée et le mode headless est activé.")
                print("💡 Lancez d'abord la commande de connexion interactive (la fenêtre restera ouverte) :")
                print("   python backend/run_linkedin_easy_apply.py --login")
                self.browser_agent.close()
                return 0
            else:
                # Mode visuel : le bot attend que l'utilisateur saisisse ses identifiants
                logged_in_ok = self.browser_agent.wait_for_manual_login(timeout_sec=300)
                if not logged_in_ok:
                    print("❌ [Arrêt] Connexion non effectuée. Arrêt du cycle.")
                    self.browser_agent.close()
                    return 0

        # Scraping de la file d'attente Easy Apply
        queue = self.browser_agent.search_easy_apply_jobs(
            keywords=self.keywords,
            location=self.location,
            max_jobs=self.max_applications,
            applied_ids=applied_ids,
        )

        if not queue:
            print("✅ [Worker] Aucune nouvelle offre Easy Apply à traiter pour le moment.")
            self.browser_agent.close()
            return 0

        processed_count = 0

        for idx, job in enumerate(queue, start=1):
            if processed_count >= self.max_applications:
                print(f"🏁 Quota de {self.max_applications} candidatures atteint pour ce cycle.")
                break

            job_id = job["id"]
            title = job["title"]
            company = job["company"]
            location = job["location"]
            job_url = job["url"]

            print(f"\n[{idx}/{len(queue)}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print(f"🏢 Entreprise : {company}")
            print(f"💼 Poste      : {title} ({location})")
            print(f"🔗 URL        : {job_url}")

            # 1. Extraction de la description complète du poste
            desc = self.browser_agent.scrape_job_description(job_url)
            if not desc:
                print("   ⚠️ Impossible d'extraire la description du poste. Poursuite...")
                continue

            # 2. Génération de la lettre de motivation pragmatique & technique avec Gemini 1.5 Flash
            print("   🧠 [Gemini 1.5 Flash] Rédaction de la lettre technique sur-mesure...")
            # Détection succincte de la langue
            lang = "en" if any(w in desc.lower() for w in ("responsibilities", "requirements", "skills", "experience")) else "fr"
            letter_text = self.gemini_agent.generate_cover_letter(desc, title, company, language=lang)

            # Exportation immédiate en PDF pour l'upload
            letter_pdf_path = self.gemini_agent.export_pdf(letter_text, title, company, output_dir=str(self.output_dir))

            # 3. Postulation automatique via Playwright
            result = self.browser_agent.submit_easy_apply(
                job_info=job,
                cv_pdf_path=self.cv_pdf_path,
                cover_letter_pdf_path=letter_pdf_path,
                dry_run=self.dry_run,
                screenshots_dir=str(self.screenshots_dir),
            )

            if result.get("success"):
                processed_count += 1
                screenshot_path = result.get("screenshot")

                # Calcul du délai aléatoire de sécurité humaine (180 à 400 secondes)
                sleep_delay = random.randint(self.min_delay, self.max_delay)

                # 4. Déclenchement de la notification Discord
                self.discord_notifier.notify_application_success(
                    company=company,
                    title=title,
                    location=location,
                    job_url=job_url,
                    screenshot_path=screenshot_path,
                    next_delay_seconds=sleep_delay,
                    dry_run=self.dry_run,
                )

                # Sauvegarde immédiate dans l'historique
                history.append({
                    "id": job_id,
                    "company": company,
                    "title": title,
                    "location": location,
                    "applied_at": datetime.now().isoformat(),
                    "dry_run": self.dry_run,
                    "url": job_url,
                    "screenshot": screenshot_path,
                })
                self.save_history(history)

                # 5. Temporisation humaine aléatoire anti-rate-limit
                if idx < len(queue) and processed_count < self.max_applications:
                    print(f"⏳ [Sécurité Anti-Bot] Pause humaine de {sleep_delay}s (~{sleep_delay // 60} min) avant la prochaine offre...")
                    # Décompte progressif
                    start_sleep = time.time()
                    while time.time() - start_sleep < sleep_delay:
                        remaining = int(sleep_delay - (time.time() - start_sleep))
                        if remaining % 60 == 0 and remaining > 0:
                            print(f"   ⏱️ Reprise dans {remaining // 60} min...")
                        time.sleep(min(10, max(1, remaining)))
            else:
                print(f"   ❌ Échec candidature {company}: {result.get('error', 'Erreur inconnue')}")

        self.browser_agent.close()
        print(f"\n🎉 [Cycle Terminé] {processed_count} candidature(s) validée(s) avec succès !")
        return processed_count

    def run_daemon(self, cycle_interval_minutes: int = 60):
        """Lance l'orchestrateur en boucle d'arrière-plan perpétuelle (daemon)."""
        print(f"🔄 [Daemon Mode] Le worker tournera en continu toutes les {cycle_interval_minutes} minutes.")
        print("💡 Appuyez sur Ctrl+C pour arrêter le worker proprement.\n")

        try:
            while True:
                self.run_worker_cycle()
                wait_seconds = cycle_interval_minutes * 60 + random.randint(30, 180)
                print(f"\n😴 [Veille] Prochain scan d'offres dans {wait_seconds // 60} minutes...")
                time.sleep(wait_seconds)
        except KeyboardInterrupt:
            print("\n🛑 [Arrêt Manuel] Interruption reçue. Arrêt propre du worker.")
            self.browser_agent.close()

    def interactive_login(self, timeout_sec: int = 300) -> bool:
        """Lance une fenêtre visuelle et attend patiemment que l'utilisateur saisisse ses identifiants."""
        print("\n" + "=" * 70)
        print("🌐 [Mode Connexion LinkedIn Interactive]")
        print("=" * 70)
        self.browser_agent.headless = False
        self.browser_agent.initialize_session()
        ok = self.browser_agent.wait_for_manual_login(timeout_sec=timeout_sec)
        self.browser_agent.close()
        return ok
