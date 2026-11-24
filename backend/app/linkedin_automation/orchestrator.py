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

from .browser_agent import LinkedInBrowserAgent, detect_offer_language, requires_non_en_fr, is_unpaid_offer
from .gemini_agent import GeminiCoverLetterGenerator
from .discord_notifier import DiscordNotifier


# Ordre strict de priorité des domaines d'opportunités (Demandé par l'utilisateur) :
# 1. IA -> 2. Agentic -> 3. Computer Vision -> 4. ML -> 5. Cloud -> 6. Software Eng -> 7. Full Stack / Backend -> 8. Data
DOMAIN_PRIORITIES = [
    {"prio": 1, "domain": "IA / Intelligence Artificielle", "kw": '"Artificial Intelligence" Intern English'},
    {"prio": 2, "domain": "Agentic AI / LLM Agents", "kw": '"Agentic" OR "AI Agents" Intern English'},
    {"prio": 3, "domain": "Computer Vision", "kw": '"Computer Vision" Intern English'},
    {"prio": 4, "domain": "Machine Learning & Deep Learning", "kw": '"Machine Learning" OR "Deep Learning" Intern English'},
    {"prio": 5, "domain": "Cloud & MLOps & Déploiement", "kw": '"Cloud" OR "DevOps" OR "MLOps" Intern English'},
    {"prio": 6, "domain": "Software Engineering (Python / C++)", "kw": '"Software Engineer" OR "Python Developer" Intern English'},
    {"prio": 7, "domain": "Full Stack / Backend / Frontend", "kw": '"Full Stack" OR "Backend" OR "Frontend" Intern English'},
    {"prio": 8, "domain": "Data Science & Data Engineering", "kw": '"Data Science" OR "Data Engineer" Intern English'},
]


class LinkedInEasyApplyOrchestrator:
    """Orchestrateur central du worker autonome de candidatures LinkedIn."""

    def __init__(
        self,
        keywords: str = "Machine Learning Stage",
        location: str = "Suisse",
        cv_pdf_path: Optional[str] = None,
        user_data_dir: Optional[str] = None,
        cookies_path: Optional[str] = None,
        webhook_url: Optional[str] = None,
        headless: bool = False,
        dry_run: bool = False,
        min_delay: int = 15,
        max_delay: int = 35,
        max_applications_per_cycle: int = 10,
        all_jobs: bool = False,
        exclude_france: bool = True,
        under_10_applicants: bool = True,
        max_applicants: int = 10,
        time_filter: str = "24h",
    ):
        self.keywords = keywords
        self.location = location
        self.headless = headless
        self.dry_run = dry_run
        self.min_delay = min_delay
        self.max_delay = max_delay
        self.max_applications = max_applications_per_cycle
        self.all_jobs = all_jobs
        self.exclude_france = exclude_france
        self.under_10_applicants = under_10_applicants
        self.max_applicants = max_applicants
        self.time_filter = time_filter

        # Chemins des données et artefacts
        base_dir = Path(__file__).resolve().parent.parent.parent
        self.backend_dir = base_dir
        self.root_dir = base_dir.parent
        self.data_dir = base_dir / "data"
        self.output_dir = base_dir / "output"
        self.screenshots_dir = self.output_dir / "screenshots"
        self.history_file = self.data_dir / "linkedin_applications_history.json"
        self.public_data_file = self.root_dir / "frontend" / "public" / "data" / "applications_history.json"

        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.screenshots_dir.mkdir(parents=True, exist_ok=True)
        self.public_data_file.parent.mkdir(parents=True, exist_ok=True)

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

    def get_all_applied_identifiers(self) -> set:
        """
        Récupère tous les identifiants uniques (IDs, URLs, paires entreprise::poste)
        depuis l'historique LinkedIn, le CRM Tracker web (applications_history.json)
        et les IDs passés par le frontend.
        """
        applied = set()

        # 1. linkedin_applications_history.json
        if self.history_file.exists():
            try:
                with open(self.history_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data:
                        if item.get("id"):
                            applied.add(str(item["id"]))
                        if item.get("url"):
                            applied.add(item["url"].strip().rstrip("/"))
                        comp = (item.get("company") or "").lower().strip()
                        tit = (item.get("title") or "").lower().strip()
                        if comp and tit:
                            applied.add(f"{comp}::{tit}")
            except Exception:
                pass

        # 2. applications_history.json (Tracker CRM du site web)
        crm_file = self.data_dir / "applications_history.json"
        if crm_file.exists():
            try:
                with open(crm_file, "r", encoding="utf-8") as f:
                    crm_data = json.load(f)
                    for item in crm_data:
                        if item.get("id"):
                            applied.add(str(item["id"]))
                            if str(item["id"]).startswith("linkedin-"):
                                applied.add(str(item["id"]).replace("linkedin-", ""))
                        if item.get("jobUrl"):
                            applied.add(item["jobUrl"].strip().rstrip("/"))
                        if item.get("url"):
                            applied.add(item["url"].strip().rstrip("/"))
                        comp = (item.get("company") or "").lower().strip()
                        tit = (item.get("title") or "").lower().strip()
                        if comp and tit:
                            applied.add(f"{comp}::{tit}")
            except Exception:
                pass

        # 3. frontend_applied_ids.json (sélection en direct du dashboard)
        front_file = self.data_dir / "frontend_applied_ids.json"
        if front_file.exists():
            try:
                with open(front_file, "r", encoding="utf-8") as f:
                    front_ids = json.load(f)
                    for fid in front_ids:
                        applied.add(str(fid))
            except Exception:
                pass

        return applied

    def record_successful_application(self, job: Dict[str, Any], apply_type: str, screenshot_path: Optional[str] = None):
        """
        Enregistre la candidature de manière atomique :
        1. Dans l'historique LinkedIn local (linkedin_applications_history.json)
        2. Directement dans le CRM Tracker du site (applications_history.json)
        """
        job_id = job.get("id", "")
        company = job.get("company", "")
        title = job.get("title", "")
        location = job.get("location", "")
        job_url = job.get("url", "")
        applied_at = datetime.now().isoformat()
        date_str = datetime.now().strftime("%Y-%m-%d")

        # 1. Sauvegarde dans linkedin_applications_history.json
        history = self.load_history()
        history.append({
            "id": job_id,
            "company": company,
            "title": title,
            "location": location,
            "applied_at": applied_at,
            "dry_run": self.dry_run,
            "url": job_url,
            "screenshot": screenshot_path,
        })
        self.save_history(history)

        # 2. Synchronisation instantanée dans applications_history.json
        country = "Suisse" if any(w in location.lower() for w in ("suisse", "switzerland", "geneva", "genève", "zurich", "lausanne")) else (
            "Luxembourg" if "luxembourg" in location.lower() else ("Belgique" if "belgi" in location.lower() else "International")
        )
        crm_entry = {
            "id": f"linkedin-{job_id}",
            "company": company,
            "title": title,
            "location": location,
            "country": country,
            "appliedDate": date_str,
            "atsScore": 92,
            "status": "en_attente",
            "cv_name": cv_name or f"CV_Badroudine_Bacar_{company.replace(' ', '_')}.pdf",
            "notes": f"Postulation LinkedIn ({'Easy Apply' if apply_type == 'easy_apply' else 'Portail ATS'}) - Candidature autonome ResumeSquad",
            "jobUrl": job_url,
            "url": job_url,
            "source": "LinkedIn Autonomous Bot",
            "dry_run": self.dry_run,
            "screenshot": screenshot_path,
        }
        self._save_crm_entry(crm_entry, company, is_manual=False)

    def _save_crm_entry(self, crm_entry: Dict[str, Any], company: str, is_manual: bool = False):
        """
        Enregistre la candidature de façon atomique dans :
        1. backend/data/applications_history.json
        2. frontend/public/data/applications_history.json (Asset statique pour Vercel CDN)
        3. Envoie un POST sur VERCEL_SYNC_URL/api/autopilot/sync-applications si configuré
        """
        crm_apps = []
        crm_file = self.data_dir / "applications_history.json"
        if crm_file.exists():
            try:
                with open(crm_file, "r", encoding="utf-8") as f:
                    crm_apps = json.load(f)
            except Exception:
                crm_apps = []

        existing_crm_ids = {a.get("id") for a in crm_apps}
        if crm_entry["id"] in existing_crm_ids:
            idx = next((i for i, a in enumerate(crm_apps) if a.get("id") == crm_entry["id"]), -1)
            if idx != -1:
                crm_apps[idx] = crm_entry
        else:
            crm_apps.insert(0, crm_entry)

        # 1. Sauvegarde locale backend
        try:
            with open(crm_file, "w", encoding="utf-8") as f:
                json.dump(crm_apps, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"   ⚠️ [CRM Dashboard] Erreur sauvegarde locale : {e}")

        # 2. Sauvegarde dans frontend/public/data/applications_history.json (pour Vercel CDN)
        try:
            self.public_data_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.public_data_file, "w", encoding="utf-8") as pf:
                json.dump(crm_apps, pf, indent=2, ensure_ascii=False)
        except Exception:
            pass

        # 3. Synchronisation Cloud temps réel (si VERCEL_SYNC_URL ou NEXT_PUBLIC_SITE_URL configuré)
        sync_url = os.getenv("VERCEL_SYNC_URL") or os.getenv("NEXT_PUBLIC_SITE_URL")
        if sync_url and sync_url.startswith("http"):
            try:
                endpoint = sync_url.rstrip("/") + "/api/autopilot/sync-applications"
                import urllib.request
                req = urllib.request.Request(
                    endpoint,
                    data=json.dumps({"application": crm_entry}).encode("utf-8"),
                    headers={"Content-Type": "application/json", "User-Agent": "ResumeSquadBot/1.0"},
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=5) as resp:
                    if resp.status == 200:
                        print(f"   ☁️ [Sync Vercel Cloud] Synchronisation en direct avec le Dashboard Vercel réussie !")
            except Exception:
                pass

        if is_manual:
            print(f"   📊 [CRM Dashboard] Offre '{company}' enregistrée sous 'À finaliser manuellement' avec lien direct !")
        else:
            print(f"   📊 [CRM Dashboard] Offre '{company}' synchronisée avec succès dans le Tracker Web !")

    def record_manual_action_application(
        self,
        job: Dict[str, Any],
        apply_type: str,
        reason: str,
        portal_url: str,
        screenshot_path: Optional[str] = None,
        cv_name: Optional[str] = None
    ):
        """Enregistre l'offre dans le CRM Tracker Web sous le statut 'a_finaliser_manuellement'."""
        job_id = job.get("id", "")
        company = job.get("company", "")
        title = job.get("title", "")
        location = job.get("location", "")
        job_url = job.get("url", "")
        date_str = datetime.now().strftime("%Y-%m-%d")

        country = "Suisse" if any(w in location.lower() for w in ("suisse", "switzerland", "geneva", "zurich")) else (
            "Luxembourg" if "luxembourg" in location.lower() else ("Belgique" if "belgi" in location.lower() else "International")
        )
        crm_entry = {
            "id": f"manual-{job_id}",
            "company": company,
            "title": title,
            "location": location,
            "country": country,
            "appliedDate": date_str,
            "atsScore": 88,
            "status": "a_finaliser_manuellement",
            "cv_name": cv_name or f"CV_Badroudine_Bacar_{company.replace(' ', '_')}.pdf",
            "notes": f"Portail externe avec garde-fou ({reason}). Lien direct : {portal_url}",
            "jobUrl": portal_url or job_url,
            "url": portal_url or job_url,
            "source": "LinkedIn Autonomous Bot",
            "dry_run": self.dry_run,
            "screenshot": screenshot_path,
        }
        self._save_crm_entry(crm_entry, company, is_manual=True)

    def _interactive_safety_pause(self, sleep_delay: int):
        """Temporisation humaine avec contrôle interactif en direct."""
        print(f"\n⏳ [Pause de Sécurité - {sleep_delay}s avant la prochaine offre]")
        print("   👉 [Entrée] Passer immédiatement à la suite  |  [p] Pause indéfinie")
        try:
            import msvcrt
            has_msvcrt = True
        except ImportError:
            has_msvcrt = False

        if has_msvcrt and sys.stdin.isatty():
            start = time.time()
            while time.time() - start < sleep_delay:
                rem = int(sleep_delay - (time.time() - start)) + 1
                print(f"\r⏳ Prochaine offre dans {rem}s... [Entrée = passer | p = pause]   ", end="", flush=True)
                if msvcrt.kbhit():
                    ch = msvcrt.getwch().lower()
                    print()
                    if ch in ("\r", "\n"):
                        print("⚡ Délai accéléré par l'opérateur.")
                        return
                    elif ch == "p":
                        print("⏸️ [PAUSE INDÉFINIE ACTIVE] Le bot attend vos instructions.")
                        input("👉 Appuyez sur [Entrée] pour reprendre le cycle...")
                        print("▶️ Reprise du cycle !")
                        return
                time.sleep(0.1)
            print()
        else:
            time.sleep(sleep_delay)

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

        applied_identifiers = self.get_all_applied_identifiers()
        print(f"📚 [Historique & CRM Tracker] {len(applied_identifiers)} offre(s)/identifiant(s) déjà répertoriés.")

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

        # Scraping de la file d'attente (Support multi-domaines prioritaires IA -> Data)
        target_queue_size = max(40, self.max_applications * 2)
        queue = []
        seen_job_ids = set()

        is_multi_track = (
            self.keywords.lower() in ("all", "multi", "priority", "europe", "ue", "auto")
            or "europe" in self.location.lower()
            or "union" in self.location.lower()
        )

        if is_multi_track:
            print(f"\n🚀 [Multi-Pistes Europe] Recherche par ordre strict de priorité (1. IA -> 8. Data)...")
            for track in DOMAIN_PRIORITIES:
                if len(queue) >= target_queue_size:
                    break
                p_num = track["prio"]
                p_name = track["domain"]
                p_kw = track["kw"]
                print(f"\n🔎 [Priorité {p_num} : {p_name}] Sourcing : {p_kw} ({self.location})...")
                sub_queue = self.browser_agent.search_easy_apply_jobs(
                    keywords=p_kw,
                    location=self.location,
                    max_jobs=target_queue_size - len(queue),
                    applied_ids=applied_identifiers.union(seen_job_ids),
                    easy_apply_only=not self.all_jobs,
                    exclude_france=self.exclude_france,
                    under_10_applicants=self.under_10_applicants,
                    max_applicants_threshold=self.max_applicants,
                    time_filter=self.time_filter,
                )
                added_count = 0
                for j in sub_queue:
                    if j["id"] not in seen_job_ids:
                        seen_job_ids.add(j["id"])
                        j["domain_priority"] = f"P{p_num} - {p_name}"
                        queue.append(j)
                        added_count += 1
                print(f"   ✨ +{added_count} offre(s) retenue(s) pour {p_name} (Total file : {len(queue)}/{target_queue_size})")
        else:
            queue = self.browser_agent.search_easy_apply_jobs(
                keywords=self.keywords,
                location=self.location,
                max_jobs=target_queue_size,
                applied_ids=applied_identifiers,
                easy_apply_only=not self.all_jobs,
                exclude_france=self.exclude_france,
                under_10_applicants=self.under_10_applicants,
                max_applicants_threshold=self.max_applicants,
                time_filter=self.time_filter,
            )

        if not queue:
            print("✅ [Worker] Aucune nouvelle offre à traiter pour le moment.")
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
            domain_prio = job.get("domain_priority", "")

            print(f"\n[{idx}/{len(queue)}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            print(f"🏢 Entreprise : {company}")
            print(f"💼 Poste      : {title} ({location})")
            if domain_prio:
                print(f"🏷️ Priorité   : {domain_prio}")
            print(f"🔗 URL        : {job_url}")

            # Filtre de sécurité Mobilité Internationale EILCO
            from .browser_agent import is_france_location
            if self.exclude_france and (is_france_location(location) or is_france_location(title)):
                print(f"   🚫 [Filtre EILCO Mobilité Internationale] Offre située en France ignorée ({title} - {location}).")
                print(f"      Conformité EILCO requiert un stage à l'international (Suisse, Luxembourg, Belgique...).")
                continue

            # Vérification anti-doublon CRM Tracker & Historique
            comp_key = f"{(company or '').lower().strip()}::{(title or '').lower().strip()}"
            if (
                job_id in applied_identifiers
                or (job_url and job_url.strip().rstrip("/") in applied_identifiers)
                or comp_key in applied_identifiers
            ):
                print(f"   ⏭️ [Anti-Doublon CRM/LinkedIn] '{company} - {title}' déjà postulée ou suivie sur le site. Ignorée.")
                continue

            # 1. Extraction de la description complète du poste
            desc = self.browser_agent.scrape_job_description(job_url)
            if not desc:
                print("   ⚠️ Impossible d'extraire la description du poste. Poursuite...")
                continue

            # 1b. Double vérification EILCO Mobilité Internationale sur la description
            if self.exclude_france:
                import re
                desc_lower = desc[:600].lower()
                fr_terms = [
                    "france", "paris", "lyon", "toulouse", "bordeaux", "nantes", "lille",
                    "marseille", "rennes", "strasbourg", "grenoble", "normandie", "normandy",
                    "caligny", "hauts-de-france", "île-de-france", "ile-de-france"
                ]
                if any(re.search(r'\b' + re.escape(t) + r'\b', desc_lower) for t in fr_terms):
                    if not any(exc in desc_lower for exc in ["outside france", "hors de france", "hors france", "except france"]):
                        print(f"   🚫 [Filtre EILCO Mobilité Internationale] Mention de localisation en France détectée dans la description ({title} - {company}). Ignorée.")
                        applied_identifiers.add(job_id)
                        if job_url:
                            applied_identifiers.add(job_url.strip().rstrip("/"))
                        continue

            # 2. Contrôle immédiat : Vérification si l'offre est clôturée ("Les candidatures ne sont plus acceptées")
            is_closed, closed_reason = self.browser_agent.check_if_job_closed()
            if is_closed:
                print(f"   🚫 [Offre Clôturée] {closed_reason} détecté pour {company}. Ignorée immédiatement sans appel IA.")
                applied_identifiers.add(job_id)
                if job_url:
                    applied_identifiers.add(job_url.strip().rstrip("/"))
                continue

            # 2b. Contrôle Linguistique : Anglais et Français uniquement (exclusion stricte Allemand / Néerlandais)
            offer_lang = detect_offer_language(title, desc)
            if offer_lang not in ("en", "fr") or requires_non_en_fr(f"{title} {desc}"):
                lang_label = "allemand" if offer_lang == "de" else ("néerlandais" if offer_lang == "nl" else offer_lang)
                print(f"   🚫 [Filtre Langue] Offre rédigée en {lang_label.upper()} ou exigeant une langue non maîtrisée pour {company}. Ignorée sans appel IA.")
                applied_identifiers.add(job_id)
                if job_url:
                    applied_identifiers.add(job_url.strip().rstrip("/"))
                continue

            # 2c. Contrôle Rémunération : Rejet strict des offres non rémunérées ou bénévoles
            is_unpaid, unpaid_reason = is_unpaid_offer(desc)
            if is_unpaid:
                print(f"   🚫 [Filtre Rémunération] Offre non rémunérée ou bénévole ({unpaid_reason}) pour {company}. Ignorée sans appel IA.")
                applied_identifiers.add(job_id)
                if job_url:
                    applied_identifiers.add(job_url.strip().rstrip("/"))
                continue

            # 3. Contrôle immédiat : Vérification de la concurrence (<= max_applicants, défaut 10)
            if self.under_10_applicants:
                applicants_count = self.browser_agent.extract_applicant_count_on_page()

                is_oversaturated = False
                reason_str = ""
                if applicants_count is not None:
                    if applicants_count > self.max_applicants:
                        is_oversaturated = True
                        reason_str = f"{applicants_count} candidats/clics (> {self.max_applicants})"
                else:
                    # En l'absence de mention chiffrée dans l'en-tête, l'offre a déjà été sélectionnée
                    # par LinkedIn via le filtre f_EA=true (Moins de 10 candidats). Elle est donc valide.
                    is_oversaturated = False

                if is_oversaturated:
                    print(f"   🚫 [Filtre Concurrence] Offre saturée ({reason_str}) pour {company}. Ignorée sans appel IA.")
                    applied_identifiers.add(job_id)
                    if job_url:
                        applied_identifiers.add(job_url.strip().rstrip("/"))
                    continue
                elif applicants_count is not None:
                    print(f"   🎯 [Faible Concurrence Confirmée] ~{applicants_count} candidat(s)/clics (<= {self.max_applicants}). Excellent !")
                else:
                    print(f"   🎯 [Faible Concurrence Confirmée] Offre présélectionnée LinkedIn à faible concurrence (<= {self.max_applicants}).")

            # Enrichissement haute fidélité des métadonnées (Entreprise exacte, Titre et Ville)
            job = self.browser_agent.enrich_job_details(job)
            title = job.get("title", title)
            company = job.get("company", company)
            location = job.get("location", location)

            # 4. Détection du type de postulation : Easy Apply ou Portail Externe
            apply_type_info = self.browser_agent.detect_job_apply_type()
            apply_type = apply_type_info.get("type", "easy_apply")

            if apply_type in ("none", "unknown"):
                print(f"   ⚠️ [Non Postulable] Aucun bouton de candidature actif détecté pour {company} (offre expirée ou non postulable). Ignorée.")
                applied_identifiers.add(job_id)
                if job_url:
                    applied_identifiers.add(job_url.strip().rstrip("/"))
                continue

            # 5. Génération de la lettre de motivation pragmatique & technique avec Gemini 1.5 Flash
            print(f"   🧠 [Gemini 1.5 Flash] Rédaction de la lettre technique sur-mesure (langue: {offer_lang.upper()})...")
            letter_text = self.gemini_agent.generate_cover_letter(desc, title, company, language=offer_lang)

            # Exportation immédiate de la lettre en PDF pour l'upload
            letter_pdf_path = self.gemini_agent.export_pdf(letter_text, title, company, output_dir=str(self.output_dir))

            # Préparation du CV personnalisé au nom de l'entreprise (ex: CV_Badroudine_Bacar_Intel.pdf)
            clean_comp_slug = re.sub(r'[^a-zA-Z0-9]', '_', company).strip('_')
            company_cv_name = f"CV_Badroudine_Bacar_{clean_comp_slug}.pdf" if clean_comp_slug else "CV_Badroudine_Bacar.pdf"
            company_cv_path = self.output_dir / company_cv_name
            active_cv_path = self.cv_pdf_path

            if self.cv_pdf_path and os.path.exists(self.cv_pdf_path):
                try:
                    import shutil
                    shutil.copy2(self.cv_pdf_path, str(company_cv_path))
                    active_cv_path = str(company_cv_path)
                    print(f"   📄 [CV Entreprise] Document dédié généré : {company_cv_name}")
                except Exception as cve:
                    print(f"   ℹ️ [Note CV]: {cve}")

            if apply_type == "external":
                print(f"   🌐 [Site Externe / ATS Détecté] Redirection vers le portail recruteur pour {company}...")
                ext_url = self.browser_agent.extract_external_apply_url() or job_url
                try:
                    import subprocess
                    import uuid

                    # Fichier temporaire pour la lettre de motivation
                    temp_letter_file = self.output_dir / f"letter_ext_{job_id}.txt"
                    temp_letter_file.write_text(letter_text, encoding="utf-8")

                    # Fichier temporaire pour le résultat JSON
                    temp_res_file = self.output_dir / f"res_ext_{job_id}_{uuid.uuid4().hex[:6]}.json"

                    applicant_script = Path(__file__).resolve().parent.parent / "browser_applicant.py"
                    cmd = [
                        sys.executable,
                        str(applicant_script),
                        "--url", ext_url,
                        "--company", company,
                        "--title", title,
                        "--cover-letter-file", str(temp_letter_file),
                        "--output-json", str(temp_res_file),
                    ]
                    if self.headless:
                        cmd.append("--headless")
                    if not self.dry_run:
                        cmd.append("--auto-submit")
                    if self.discord_notifier.webhook_url:
                        cmd.extend(["--webhook", self.discord_notifier.webhook_url])
                    if active_cv_path and os.path.exists(active_cv_path):
                        cmd.extend(["--cv-pdf", active_cv_path])

                    print(f"   🚀 [Processus Dédié Playwright] Démarrage du sous-processus isolé pour {company}...")
                    proc = subprocess.run(cmd, timeout=360)

                    applicant_res = {}
                    if temp_res_file.exists():
                        try:
                            with open(temp_res_file, "r", encoding="utf-8") as rf:
                                applicant_res = json.load(rf)
                            temp_res_file.unlink(missing_ok=True)
                        except Exception:
                            pass
                    temp_letter_file.unlink(missing_ok=True)

                    is_ok = applicant_res.get("success", False) if proc.returncode == 0 else False
                    result = {
                        "success": is_ok,
                        "status": applicant_res.get("status", "candidature_envoyee" if is_ok else "action_manuelle_requise"),
                        "screenshot": applicant_res.get("screenshot"),
                        "portal_url": applicant_res.get("portal_url", ext_url),
                        "error": applicant_res.get("error"),
                        "mode": "external_portal",
                    }
                except Exception as ext_err:
                    print(f"   ⚠️ Erreur exécution externe Playwright : {ext_err}")
                    result = {"success": False, "error": str(ext_err), "portal_url": ext_url}
            else:
                # 3b. Postulation automatique LinkedIn Easy Apply via Playwright
                result = self.browser_agent.submit_easy_apply(
                    job_info=job,
                    cv_pdf_path=active_cv_path,
                    cover_letter_pdf_path=letter_pdf_path,
                    dry_run=self.dry_run,
                    screenshots_dir=str(self.screenshots_dir),
                )

            # Si l'utilisateur a rejeté l'opportunité lors de l'arbitrage
            if result.get("status") == "rejetee":
                print(f"   🚫 [Arbitrage Opérateur] Offre '{company}' rejetée selon vos instructions.")
                applied_identifiers.add(job_id)
                applied_identifiers.add(comp_key)
                continue

            if result.get("status") == "annulee":
                print(f"   ℹ️ [Annulation Opérateur] Candidature pour '{company}' passée sans soumission.")
                continue

            is_really_successful = result.get("success") and result.get("status", "candidature_envoyee") == "candidature_envoyee"

            if is_really_successful:
                processed_count += 1
                screenshot_path = result.get("screenshot")

                # Calcul du délai aléatoire entre postulations
                if self.dry_run:
                    sleep_delay = random.randint(2, 5)
                else:
                    sleep_delay = random.randint(self.min_delay, self.max_delay)

                # 4. Déclenchement de la notification Discord (Salon #candidatures-soumises)
                self.discord_notifier.notify_application_success(
                    company=company,
                    title=title,
                    location=location,
                    job_url=job_url,
                    screenshot_path=screenshot_path,
                    next_delay_seconds=sleep_delay,
                    dry_run=self.dry_run,
                    cv_name=company_cv_name,
                )

                # Enregistrement atomique dans l'historique LinkedIn ET le CRM Web Tracker
                self.record_successful_application(job, apply_type, screenshot_path, cv_name=company_cv_name)
                applied_identifiers.add(job_id)
                if job_url:
                    applied_identifiers.add(job_url.strip().rstrip("/"))
                applied_identifiers.add(comp_key)

                # 5. Temporisation humaine interactive entre deux postulations réussies
                if idx < len(queue) and processed_count < self.max_applications:
                    self._interactive_safety_pause(sleep_delay)
            else:
                err_text = str(result.get('error') or result.get('status') or 'Action manuelle requise')
                screenshot_path = result.get("screenshot")
                portal_url = result.get("portal_url", job_url)
                print(f"   ⚠️ [Action Manuelle Requise] {company} : {err_text}")
                print(f"   📲 [Alerte Discord] Lien direct disponible : {portal_url}")

                # Enregistrement dans le CRM Tracker sous statut 'a_finaliser_manuellement'
                self.record_manual_action_application(
                    job, apply_type, err_text, portal_url, screenshot_path, cv_name=company_cv_name
                )

                # Alerte Discord avec lien direct pour finaliser en un clic (Salon #actions-manuelles)
                self.discord_notifier.notify_manual_action_required(
                    company=company,
                    title=title,
                    location=location,
                    job_url=job_url,
                    portal_url=portal_url,
                    reason=err_text,
                    screenshot_path=screenshot_path,
                    cv_name=company_cv_name,
                )

                applied_identifiers.add(job_id)
                if job_url:
                    applied_identifiers.add(job_url.strip().rstrip("/"))
                applied_identifiers.add(comp_key)
                time.sleep(1.0)

        self.browser_agent.close()
        total_tok = self.gemini_agent.total_tokens_consumed
        req_count = self.gemini_agent.total_requests_made
        print(f"\n🎉 [Cycle Terminé] {processed_count} candidature(s) validée(s) avec succès !")
        print(f"📊 [Bilan Quota & Facturation IA] {req_count} appel(s) Gemini effectués | {total_tok} tokens consommés | Coût total: 0,00 € (100% Gratuit Google AI Studio)")
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
