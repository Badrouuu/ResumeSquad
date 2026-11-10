"""
browser_agent.py — Module Playwright pour LinkedIn Easy Apply (Étapes 1, 2 et 4).

Fonctionnalités :
1. Gestion de session & Anti-Bot : Profil persistant (user_data_dir), injection de cookies.json,
   mouvements de souris humains, défilement aléatoire et cadence de frappe naturelle.
2. Scraping du Sourcing : Recherche d'offres ciblées (Machine Learning, PyTorch, Stage)
   filtrées strictement sur 'f_AL=true' (Candidature simplifiée).
3. Soumission du formulaire : Remplissage automatique des champs (Téléphone, Expérience, Visas),
   upload du CV/Lettre PDF généré, capture de validation et soumission.
"""

import os
import sys
import json
import time
import math
import random
from pathlib import Path
from typing import List, Dict, Any, Optional

# Encodage console Windows pour éviter UnicodeEncodeError avec les emojis
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

from playwright.sync_api import sync_playwright, Page, BrowserContext, ElementHandle, TimeoutError as PlaywrightTimeoutError

class LinkedInBrowserAgent:
    """Agent d'automatisation de navigation et candidature LinkedIn via Playwright."""

    def __init__(
        self,
        user_data_dir: Optional[str] = None,
        cookies_path: Optional[str] = None,
        headless: bool = False,
        phone_number: str = "07 67 56 07 86",
        candidate_name: str = "Badroudine Bacar",
        candidate_email: str = "badroudinebacar@gmail.com",
    ):
        self.user_data_dir = user_data_dir or str(
            Path(__file__).resolve().parent.parent.parent / "data" / "linkedin_user_profile"
        )
        self.cookies_path = cookies_path or str(
            Path(__file__).resolve().parent.parent.parent / "data" / "cookies.json"
        )
        self.headless = headless
        self.phone_number = phone_number
        self.candidate_name = candidate_name
        self.candidate_email = candidate_email

        self._playwright = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None

    # =========================================================================
    # ÉTAPE 1 : GESTION DE SESSION & ANTI-BOT
    # =========================================================================

    def initialize_session(self) -> Page:
        """Lance le navigateur Chromium avec profil persistant ou cookies et contournement anti-bot."""
        Path(self.user_data_dir).mkdir(parents=True, exist_ok=True)
        self._playwright = sync_playwright().start()

        # Arguments avancés pour neutraliser les détections d'automatisation Chromium
        launch_args = [
            "--disable-blink-features=AutomationControlled",
            "--disable-infobars",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-default-browser-check",
            "--window-size=1920,1080",
        ]

        print(f"🌐 [Playwright] Initialisation de la session (Profil: {self.user_data_dir})...")
        self.context = self._playwright.chromium.launch_persistent_context(
            user_data_dir=self.user_data_dir,
            headless=self.headless,
            viewport={"width": 1440, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            locale="fr-FR",
            timezone_id="Europe/Paris",
            args=launch_args,
        )

        # Injection de scripts anti-fingerprint dans chaque page
        self.context.add_init_script(
            """
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            window.navigator.chrome = { runtime: {} };
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en-US', 'en'] });
            """
        )

        # Injection des cookies exportés si présents
        if os.path.exists(self.cookies_path):
            try:
                with open(self.cookies_path, "r", encoding="utf-8") as f:
                    cookies = json.load(f)
                    clean_cookies = []
                    for c in cookies:
                        if not c.get("name") or c.get("value") is None:
                            continue
                        cookie = {
                            "name": c["name"],
                            "value": c["value"],
                            "domain": c.get("domain", ".linkedin.com"),
                            "path": c.get("path", "/"),
                        }
                        if "sameSite" in c and c["sameSite"] in ("Strict", "Lax", "None"):
                            cookie["sameSite"] = c["sameSite"]
                        if "secure" in c:
                            cookie["secure"] = bool(c["secure"])
                        if "httpOnly" in c:
                            cookie["httpOnly"] = bool(c["httpOnly"])
                        try:
                            self.context.add_cookies([cookie])
                            clean_cookies.append(cookie)
                        except Exception:
                            pass
                    if clean_cookies:
                        print(f"🍪 [Cookies] {len(clean_cookies)} cookies injectés avec succès.")
            except Exception as e:
                print(f"⚠️ [Cookies] Erreur chargement cookies.json: {e}")

        self.page = self.context.new_page()
        self.page.set_default_timeout(30000)
        return self.page

    def human_delay(self, min_sec: float = 1.0, max_sec: float = 3.0):
        """Pause naturelle aléatoire simulant l'hésitation humaine."""
        delay = random.uniform(min_sec, max_sec)
        time.sleep(delay)

    def human_mouse_move(self, target_x: float, target_y: float, steps: int = 25):
        """Déplace la souris selon une trajectoire courbe naturelle avec micro-variations."""
        if not self.page:
            return
        start_x = random.randint(100, 500)
        start_y = random.randint(100, 500)

        # Génération d'une courbe de Bézier cubique pour mouvement organique
        control_x1 = start_x + (target_x - start_x) * random.uniform(0.1, 0.4) + random.randint(-40, 40)
        control_y1 = start_y + (target_y - start_y) * random.uniform(0.1, 0.4) + random.randint(-40, 40)
        control_x2 = start_x + (target_x - start_x) * random.uniform(0.6, 0.9) + random.randint(-30, 30)
        control_y2 = start_y + (target_y - start_y) * random.uniform(0.6, 0.9) + random.randint(-30, 30)

        for step in range(steps + 1):
            t = step / steps
            # Formule de Bézier cubique
            x = (1 - t)**3 * start_x + 3 * (1 - t)**2 * t * control_x1 + 3 * (1 - t) * t**2 * control_x2 + t**3 * target_x
            y = (1 - t)**3 * start_y + 3 * (1 - t)**2 * t * control_y1 + 3 * (1 - t) * t**2 * control_y2 + t**3 * target_y
            self.page.mouse.move(x, y)
            time.sleep(random.uniform(0.005, 0.015))

    def human_scroll(self, min_scrolls: int = 2, max_scrolls: int = 5):
        """Défilement réaliste de la page de haut en bas avec retours occasionnels."""
        if not self.page:
            return
        scroll_count = random.randint(min_scrolls, max_scrolls)
        for _ in range(scroll_count):
            delta_y = random.randint(200, 450)
            self.page.mouse.wheel(0, delta_y)
            time.sleep(random.uniform(0.4, 0.9))

        # Parfois, l'humain remonte légèrement pour relire
        if random.random() < 0.4:
            self.page.mouse.wheel(0, -random.randint(100, 200))
            time.sleep(random.uniform(0.3, 0.6))

    def human_type(self, selector: str, text: str):
        """Saisie de texte caractère par caractère avec variations de vitesse réalistes."""
        if not self.page:
            return
        elem = self.page.locator(selector).first
        elem.click()
        time.sleep(random.uniform(0.1, 0.3))
        # Efface le champ s'il y a du contenu préexistant
        elem.fill("")
        for char in text:
            elem.press_sequentially(char, delay=random.uniform(35, 110))
            if random.random() < 0.04:
                time.sleep(random.uniform(0.15, 0.35))  # Micro-pause de réflexion

    def verify_linkedin_login(self) -> bool:
        """Vérifie si la session est bien authentifiée sur LinkedIn."""
        if not self.page:
            return False
        try:
            # 1. Vérification par jeton de session maître li_at
            cookies = self.context.cookies() if self.context else []
            has_li_at = any(c.get("name") == "li_at" and len(c.get("value", "")) > 15 for c in cookies)

            print("🔑 [Session] Vérification de la connexion à LinkedIn...")
            self.page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded", timeout=25000)
            self.human_delay(2, 3)

            current_url = self.page.url
            if "login" in current_url or "authwall" in current_url or "signup" in current_url:
                return False

            logged_in_indicator = self.page.locator(
                ".global-nav__me, .search-global-typeahead, nav.global-nav, a[href*='/in/'], .feed-identity-module"
            ).first
            if logged_in_indicator.is_visible(timeout=5000):
                print("✅ [Session] Authentification LinkedIn active et valide !")
                return True

            if has_li_at and "login" not in current_url and "authwall" not in current_url:
                print("✅ [Session] Session confirmée via le jeton de sécurité 'li_at' !")
                return True

            return True
        except Exception as e:
            print(f"⚠️ [Session] Avertissement vérification: {e}")
            return False

    def wait_for_manual_login(self, timeout_sec: int = 300) -> bool:
        """
        Garde le navigateur ouvert et attend que l'utilisateur saisisse ses identifiants.
        Détecte automatiquement la connexion via :
        1. Le jeton maître 'li_at' dans les cookies de session (fiabilité 100%)
        2. Les sélecteurs du DOM (.global-nav, barre de recherche, avatar de profil)
        3. L'URL connectée (/feed, /in/, /home, etc.)
        """
        if not self.page or not self.context:
            return False

        print("\n" + "=" * 70)
        print("🔑 [ACTION REQUISE : CONNEXION À VOTRE COMPTE LINKEDIN]")
        print("La fenêtre Chromium est ouverte devant vous.")
        print("👉 1. Saisissez votre adresse email et votre mot de passe LinkedIn.")
        print("👉 2. Validez le code de sécurité 2FA / CAPTCHA ou les fenêtres 'Ignorer/Plus tard'.")
        print("👉 3. Le bot détecte automatiquement votre session dès que vous êtes connecté.")
        print("=" * 70 + "\n")

        if "login" not in self.page.url and "checkpoint" not in self.page.url:
            try:
                self.page.goto("https://www.linkedin.com/login", wait_until="domcontentloaded", timeout=25000)
            except Exception:
                pass

        start_time = time.time()
        last_logged = 0

        while time.time() - start_time < timeout_sec:
            try:
                if self.page.is_closed():
                    print("🛑 [Navigateur] Fenêtre fermée par l'utilisateur.")
                    return False

                # 1. Vérification par Cookie maître li_at (session LinkedIn active)
                cookies = self.context.cookies()
                has_li_at = any(c.get("name") == "li_at" and len(c.get("value", "")) > 15 for c in cookies)

                # 2. Vérification par URL sur toutes les pages ouvertes du contexte
                urls = [p.url for p in self.context.pages if not p.is_closed()]
                current_url = self.page.url
                is_on_auth_page = any(
                    any(term in u for term in ("/login", "/signup", "/uas/login", "/authwall"))
                    for u in urls
                )
                is_on_app_page = any(
                    any(term in u for term in ("/feed", "/mynetwork", "/jobs", "/in/", "/messaging", "/home", "/check/add-phone", "checkpoint/lg"))
                    for u in urls
                )

                # 3. Vérification des éléments du DOM connectés
                dom_connected = False
                for p in self.context.pages:
                    if not p.is_closed():
                        try:
                            loc = p.locator(
                                ".global-nav__me, nav.global-nav, .search-global-typeahead, a[href*='/in/'], .feed-identity-module, [data-control-name='nav.settings_signout']"
                            ).first
                            if loc.is_visible(timeout=400):
                                dom_connected = True
                                break
                        except Exception:
                            pass

                # Déclenchement dès que le jeton li_at est là ET qu'on n'est plus sur la page de login,
                # OU dès que le DOM connecté est visible
                if (has_li_at and not is_on_auth_page) or dom_connected or (has_li_at and is_on_app_page):
                    print("\n🎉 [Succès] Connexion LinkedIn confirmée !")

                    # Redirection proactive vers /feed si resté sur une page intermédiaire
                    if not is_on_auth_page and "/feed" not in current_url:
                        try:
                            print("🧭 [Navigation] Accès au fil d'actualité LinkedIn (/feed)...")
                            self.page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded", timeout=15000)
                            time.sleep(2)
                        except Exception:
                            pass

                    # Sauvegarde des cookies pour réutilisation transparente
                    try:
                        clean_cookies = self.context.cookies()
                        with open(self.cookies_path, "w", encoding="utf-8") as f:
                            json.dump(clean_cookies, f, indent=2)
                        print(f"🍪 [Cookies] {len(clean_cookies)} cookies exportés dans '{self.cookies_path}'.")
                        print(f"📁 [Profil] Session sauvegardée dans '{self.user_data_dir}'.")
                    except Exception as ce:
                        print(f"ℹ️ [Note cookies]: {ce}")
                    return True

                # Message d'avancement toutes les 10 secondes
                elapsed = int(time.time() - start_time)
                if elapsed - last_logged >= 10:
                    last_logged = elapsed
                    rem = int(timeout_sec - elapsed)
                    if has_li_at:
                        print(f"⏳ Jeton de connexion détecté ! Finalisation de la session... ({rem}s restantes)")
                    else:
                        print(f"⏳ En attente de votre connexion... ({rem}s restantes)")

            except Exception:
                pass
            time.sleep(1.5)

        print("⏱️ [Délai dépassé] Temps d'attente de connexion expiré (5 minutes).")
        return False

    # =========================================================================
    # ÉTAPE 2 : SCRAPING DE LA FILE D'ATTENTE (SOURCING EASY APPLY)
    # =========================================================================

    def search_easy_apply_jobs(
        self,
        keywords: str = "Machine Learning Stage",
        location: str = "France",
        max_jobs: int = 15,
        applied_ids: Optional[set] = None,
        easy_apply_only: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Navigue sur LinkedIn Jobs avec ou sans filtre 'Candidature simplifiée' (f_AL=true),
        scanne la liste des offres fraîches et extrait les métadonnées.
        """
        if not self.page:
            raise RuntimeError("La page Playwright n'est pas initialisée.")

        applied_ids = applied_ids or set()
        jobs_queue: List[Dict[str, Any]] = []

        # Construction de l'URL avec filtres :
        # f_AL=true : Easy Apply uniquement (si easy_apply_only=True)
        # sortBy=DD : Tri par date décroissante (offres fraîches)
        import urllib.parse
        encoded_kw = urllib.parse.quote(keywords)
        encoded_loc = urllib.parse.quote(location)
        al_param = "&f_AL=true" if easy_apply_only else ""
        search_url = (
            f"https://www.linkedin.com/jobs/search/?keywords={encoded_kw}"
            f"&location={encoded_loc}{al_param}&sortBy=DD"
        )

        filter_label = "Easy Apply uniquement" if easy_apply_only else "Toutes offres (Easy Apply + Portails Externes)"
        print(f"\n🔍 [Sourcing] Navigation vers les offres LinkedIn ({filter_label}) : {keywords} ({location})")
        self.page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
        self.human_delay(2.5, 4.0)
        self.human_scroll(min_scrolls=3, max_scrolls=6)

        # Sélection des cartes d'offres (support LinkedIn 2026 connecté et interfaces classiques)
        cards_selectors = [
            "[componentkey*='job-card-component-ref-']",
            "div[role='button'][componentkey*='job-card']",
            ".jobs-search-results-list ul li[data-occludable-job-id]",
            ".scaffold-layout__list-container li.jobs-search-results__list-item",
            "div.job-card-container",
            "li[data-occludable-job-id]",
        ]

        found_cards = []
        for sel in cards_selectors:
            elements = self.page.locator(sel).all()
            if elements:
                found_cards = elements
                break

        print(f"📋 [Sourcing] {len(found_cards)} carte(s) d'emploi identifiée(s) sur la page.")

        seen_ids = set()
        import re

        for card in found_cards:
            if len(jobs_queue) >= max_jobs:
                break
            try:
                # 1. Extraction du Job ID
                raw_id = ""
                comp_key = card.get_attribute("componentkey") or ""
                if "job-card-component-ref-" in comp_key:
                    raw_id = comp_key.split("job-card-component-ref-")[-1].strip()

                if not raw_id:
                    raw_id = card.get_attribute("data-job-id") or card.get_attribute("data-occludable-job-id") or ""

                if not raw_id:
                    link_elem = card.locator("a[href*='/jobs/view/'], a.job-card-list__title--link").first
                    href = link_elem.get_attribute("href") or ""
                    if "/view/" in href:
                        raw_id = href.split("/view/")[1].split("/")[0].split("?")[0]

                if not raw_id or raw_id in applied_ids or raw_id in seen_ids:
                    continue

                # 2. Extraction structurée Titre, Entreprise, Lieu
                full_text = card.inner_text().strip()
                lines = [
                    l.strip()
                    for l in full_text.split("\n")
                    if l.strip() and not l.strip().startswith("Consulté") and not l.strip().startswith("Promu")
                ]

                raw_title = lines[0] if lines else "Poste IA / Data"
                clean_title = re.sub(r"^(Sélectionné,\s*|Nouveau\s*|Recherche\s*)", "", raw_title, flags=re.IGNORECASE)
                clean_title = re.sub(r"\(offre d’emploi vérifiée\)", "", clean_title, flags=re.IGNORECASE).strip()

                company = lines[1] if len(lines) > 1 else "Entreprise Internationale"
                loc = lines[2] if len(lines) > 2 else location

                job_url = f"https://www.linkedin.com/jobs/view/{raw_id}/"
                seen_ids.add(raw_id)

                jobs_queue.append({
                    "id": raw_id,
                    "title": clean_title,
                    "company": company,
                    "location": loc,
                    "url": job_url,
                })
            except Exception as e:
                continue

        print(f"✨ [Sourcing] File d'attente prête : {len(jobs_queue)} nouvelle(s) offre(s) retenue(s).")
        return jobs_queue

    # =========================================================================
    # ÉTAPE 4 : SOUMISSION DU FORMULAIRE (CANDIDATURE SIMPLIFIÉE)
    # =========================================================================

    def scrape_job_description(self, job_url: str) -> str:
        """Navigue sur l'URL d'une offre et extrait la description brute du poste."""
        if not self.page:
            return ""
        try:
            self.page.goto(job_url, wait_until="domcontentloaded", timeout=25000)
            self.human_delay(2, 3)
            self.human_scroll(min_scrolls=2, max_scrolls=4)

            # Clic éventuel sur "Voir plus" / "Show more"
            show_more = self.page.locator("button.jobs-description__footer-button, button[aria-label*='plus']").first
            if show_more.is_visible():
                show_more.click()
                time.sleep(0.5)

            desc_elem = self.page.locator(".jobs-description__content, .jobs-box__html-content, #job-details").first
            if desc_elem.is_visible():
                return desc_elem.inner_text().strip()
            return ""
        except Exception as e:
            print(f"⚠️ [Description] Erreur extraction texte offre: {e}")
            return ""

    def detect_job_apply_type(self) -> Dict[str, Any]:
        """
        Détermine si l'offre sur la page courante est 'easy_apply' ou 'external',
        et extrait l'élément interactif correspondant.
        """
        if not self.page:
            return {"type": "none"}

        # 1. Vérification Easy Apply (Candidature simplifiée)
        for sel in [
            "button.jobs-apply-button:has-text('Candidature simplifiée')",
            "button.jobs-apply-button:has-text('Easy Apply')",
            "button:has-text('Candidature simplifiée')",
            "button:has-text('Easy Apply')",
        ]:
            elem = self.page.locator(sel).first
            if elem.is_visible():
                return {"type": "easy_apply", "locator": elem}

        # 2. Vérification bouton externe (Apply on company website)
        for sel in [
            "a.jobs-apply-button",
            "button.jobs-apply-button",
            "a[href*='linkedin.com/jobs/view/externalApply']",
            "button:has-text('Postuler')",
            "button:has-text('Apply')",
            "a:has-text('Postuler')",
            "a:has-text('Apply')",
        ]:
            elem = self.page.locator(sel).first
            if elem.is_visible():
                href = elem.get_attribute("href") or ""
                return {"type": "external", "href": href, "locator": elem}

        return {"type": "unknown"}

    def extract_external_apply_url(self) -> Optional[str]:
        """
        Extrait l'URL externe de postulation sur le site recruteur en inspectant le lien
        ou en observant la redirection d'onglet.
        """
        if not self.page:
            return None
        try:
            # 1. Lien direct href dans le bouton externe
            for sel in [
                "a.jobs-apply-button[href]",
                "a[data-job-id][href*='apply']",
                "a[href*='externalApply']",
                "a:has-text('Postuler')[href]",
                "a:has-text('Apply')[href]",
            ]:
                link = self.page.locator(sel).first
                if link.is_visible():
                    href = link.get_attribute("href")
                    if href and href.startswith("http"):
                        return href

            # 2. Clic sur bouton externe avec attente d'ouverture d'un nouvel onglet
            ext_btn = self.page.locator(
                "button.jobs-apply-button, button:has-text('Postuler'), button:has-text('Apply')"
            ).first
            if ext_btn.is_visible():
                with self.page.expect_popup(timeout=8000) as popup_info:
                    ext_btn.click()
                popup_page = popup_info.value
                popup_page.wait_for_load_state("domcontentloaded", timeout=12000)
                ext_url = popup_page.url
                popup_page.close()
                return ext_url
        except Exception as e:
            print(f"ℹ️ [Externe] Détection URL via popup : {e}")
        return None

    def submit_easy_apply(
        self,
        job_info: Dict[str, Any],
        cv_pdf_path: str,
        cover_letter_pdf_path: Optional[str] = None,
        dry_run: bool = False,
        screenshots_dir: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Exécute le workflow complet 'Candidature simplifiée' :
        - Clique sur le bouton Easy Apply
        - Rapproche les champs obligatoires (Téléphone, Expérience, Choix booléens)
        - Uploade les documents PDF (CV / Lettre)
        - Capture l'écran pré-envoi
        - Soumet la candidature
        """
        if not self.page:
            return {"success": False, "error": "Navigateur non initialisé"}

        screenshots_dir = screenshots_dir or str(
            Path(__file__).resolve().parent.parent.parent / "output" / "screenshots"
        )
        Path(screenshots_dir).mkdir(parents=True, exist_ok=True)

        job_id = job_info.get("id", "unknown")
        company = job_info.get("company", "Entreprise")
        title = job_info.get("title", "Poste")

        print(f"\n🚀 [Easy Apply] Démarrage de la postulation pour {company} — {title}")

        # 1. Détection du bouton Candidature Simplifiée
        apply_btn_selectors = [
            "button.jobs-apply-button",
            "button:has-text('Candidature simplifiée')",
            "button:has-text('Easy Apply')",
            ".jobs-apply-button--top-card button",
        ]

        apply_btn = None
        for sel in apply_btn_selectors:
            b = self.page.locator(sel).first
            if b.is_visible():
                apply_btn = b
                break

        if not apply_btn:
            print("❌ [Easy Apply] Aucun bouton 'Candidature simplifiée' trouvé sur cette page.")
            return {"success": False, "error": "Bouton Easy Apply introuvable"}

        # Clic avec délai humain
        bbox = apply_btn.bounding_box()
        if bbox:
            self.human_mouse_move(bbox["x"] + bbox["width"] / 2, bbox["y"] + bbox["height"] / 2)
        apply_btn.click()
        self.human_delay(2, 3)

        # 2. Gestion de la modale multi-étapes
        modal = self.page.locator("div.jobs-easy-apply-modal, div[role='dialog']").first
        if not modal.is_visible():
            print("⚠️ [Easy Apply] La modale de candidature ne s'est pas affichée.")
            return {"success": False, "error": "Modale non affichée"}

        max_steps = 9
        current_step = 0
        screenshot_path = None

        while current_step < max_steps:
            current_step += 1
            print(f"   👉 [Étape {current_step}] Analyse des champs requis...")
            self.human_delay(1.5, 2.5)

            # A. Téléphone
            phone_inputs = self.page.locator("input[id*='phoneNumber'], input[type='tel']").all()
            for p_in in phone_inputs:
                if p_in.is_visible():
                    val = p_in.input_value()
                    if not val or len(val) < 8:
                        p_in.fill(self.phone_number)
                        print(f"      📞 Téléphone rempli : {self.phone_number}")

            # B. Upload du CV ou de la Lettre PDF
            file_inputs = self.page.locator("input[type='file']").all()
            for f_in in file_inputs:
                try:
                    # Choix du document pertinent (lettre si demandée, sinon CV principal)
                    file_to_upload = cover_letter_pdf_path if (cover_letter_pdf_path and os.path.exists(cover_letter_pdf_path)) else cv_pdf_path
                    if os.path.exists(file_to_upload):
                        f_in.set_input_files(file_to_upload)
                        print(f"      📎 Document PDF joint : {os.path.basename(file_to_upload)}")
                        self.human_delay(1.0, 2.0)
                except Exception as up_err:
                    print(f"      ⚠️ Note upload: {up_err}")

            # C. Champs numériques d'expérience (ex: 'How many years of experience with Python?')
            num_inputs = self.page.locator("input[type='text'], input[type='number']").all()
            for n_in in num_inputs:
                try:
                    if not n_in.is_visible():
                        continue
                    lbl = (n_in.get_attribute("aria-label") or "").lower()
                    parent_text = (n_in.locator("xpath=..").inner_text() or "").lower()
                    combined_label = f"{lbl} {parent_text}"

                    if "years" in combined_label or "années" in combined_label or "expérience" in combined_label:
                        if not n_in.input_value():
                            n_in.fill("2")
                            print("      ⏳ Années d'expérience renseignées : 2")
                    elif "gpa" in combined_label or "moyenne" in combined_label:
                        if not n_in.input_value():
                            n_in.fill("4.0")
                except Exception:
                    pass

            # D. Radio buttons / Sélecteurs booléens (Visas, travail légal, permis)
            radio_buttons = self.page.locator("input[type='radio']").all()
            for r_btn in radio_buttons:
                try:
                    if not r_btn.is_visible():
                        continue
                    r_id = r_btn.get_attribute("id") or ""
                    r_val = (r_btn.get_attribute("value") or "").lower()
                    label_elem = self.page.locator(f"label[for='{r_id}']").first
                    label_txt = (label_elem.inner_text() if label_elem.is_visible() else "").lower()

                    # Questions de sponsoring/visa : répondre Non
                    if "sponsor" in label_txt or "visa" in label_txt:
                        if "non" in label_txt or "no" in label_txt or r_val == "no":
                            r_btn.check()
                    # Questions d'autorisation légale ou de déplacement : répondre Oui
                    elif "authorized" in label_txt or "autorisé" in label_txt or "commute" in label_txt:
                        if "oui" in label_txt or "yes" in label_txt or r_val == "yes":
                            r_btn.check()
                except Exception:
                    pass

            # E. Détection de l'état final : Bouton "Envoyer la candidature" / "Submit application"
            submit_btn = self.page.locator(
                "button:has-text('Envoyer la candidature'), button:has-text('Submit application'), button[aria-label*='Envoyer']"
            ).first

            if submit_btn.is_visible():
                print("   🎯 Écran final de vérification atteint !")
                # Capture d'écran pré-soumission
                timestamp = time.strftime("%Y%m%d_%H%M%S")
                clean_comp = "".join(c for c in company if c.isalnum() or c in ('_', '-'))
                screenshot_path = os.path.join(screenshots_dir, f"linkedin_easyapply_{clean_comp}_{timestamp}.png")
                self.page.screenshot(path=screenshot_path, full_page=True)
                print(f"   📸 Capture de validation enregistrée : {screenshot_path}")

                if dry_run:
                    print("   🧪 [Dry-Run] Mode simulation actif : Annulation avant clic final.")
                    self._dismiss_modal()
                    return {"success": True, "dry_run": True, "screenshot": screenshot_path}

                # Clic sur le bouton de soumission final
                submit_btn.click()
                self.human_delay(3.0, 5.0)

                # Fermer la boîte de dialogue de confirmation si affichée
                self._dismiss_modal()
                print(f"   ✅ Candidature pour {company} envoyée avec succès sur LinkedIn !")
                return {"success": True, "dry_run": False, "screenshot": screenshot_path}

            # F. Passer à l'étape suivante : "Vérifier" (Review) ou "Suivant" (Next)
            review_btn = self.page.locator("button:has-text('Vérifier'), button:has-text('Review')").first
            next_btn = self.page.locator("button:has-text('Suivant'), button:has-text('Next')").first

            if review_btn.is_visible():
                review_btn.click()
            elif next_btn.is_visible():
                next_btn.click()
            else:
                print("   ⚠️ Aucun bouton d'avancement visible. Annulation de la modale.")
                self._dismiss_modal()
                return {"success": False, "error": "Blocage modale"}

        self._dismiss_modal()
        return {"success": False, "error": "Nombre maximal d'étapes atteint"}

    def _dismiss_modal(self):
        """Ferme proprement la modale de candidature en cours."""
        if not self.page:
            return
        try:
            close_btn = self.page.locator(
                "button[aria-label='Ignorer'], button[aria-label='Dismiss'], button.artdeco-modal__dismiss"
            ).first
            if close_btn.is_visible():
                close_btn.click()
                time.sleep(0.5)
                # Confirmer l'abandon si demandé
                discard_btn = self.page.locator("button[data-control-name='discard_application_confirm_btn'], button:has-text('Abandonner')").first
                if discard_btn.is_visible():
                    discard_btn.click()
        except Exception:
            pass

    def close(self):
        """Ferme proprement la session Playwright."""
        if self.context:
            try:
                self.context.close()
            except Exception:
                pass
        if self._playwright:
            try:
                self._playwright.stop()
            except Exception:
                pass
        print("🛑 [Playwright] Session arrêtée.")
