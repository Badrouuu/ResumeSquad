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
from typing import List, Dict, Any, Optional, Tuple

# Encodage console Windows pour éviter UnicodeEncodeError avec les emojis
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

from playwright.sync_api import sync_playwright, Page, BrowserContext, ElementHandle, TimeoutError as PlaywrightTimeoutError

def is_france_location(loc_str: str) -> bool:
    """
    Vérifie si la localisation est située en France.
    Pour les élèves de l'EILCO, le stage PFE doit obligatoirement être à l'international
    (Suisse, Luxembourg, Belgique, Allemagne, UK, Remote International...).
    Les offres en France doivent être automatiquement rejetées.
    """
    if not loc_str:
        return False
    s = loc_str.lower().strip()

    # Exceptions pays autorisés
    if any(k in s for k in ["suisse", "switzerland", "schweiz", "luxembourg", "belgique", "belgium", "germany", "allemagne", "remote", "télétravail"]):
        return False

    france_indicators = [
        "france", "paris", "poissy", "lyon", "toulouse", "bordeaux", "nantes",
        "lille", "marseille", "rennes", "strasbourg", "montpellier", "nice",
        "grenoble", "sophia", "brest", "rouen", "reims", "clermont",
        "île-de-france", "ile-de-france", "hauts-de-france", "auvergne", "rhône-alpes",
        "occitanie", "nouvelle-aquitaine", "grand est", "pays de la loire", "bretagne",
        "normandie", "normandy", "bourgogne", "centre-val de loire", "corse", "calais", "dunkerque",
        "caligny", "flers", "caen", "le havre", "station f", "station-f"
    ]
    import re
    for ind in france_indicators:
        if re.search(r'\b' + re.escape(ind) + r'\b', s):
            return True
    return False


def detect_offer_language(title: str = "", desc: str = "") -> str:
    """
    Détecte la langue de rédaction de l'offre (0 token / ultra-rapide).
    Retourne 'en' (anglais), 'fr' (français), 'de' (allemand), ou 'nl' (néerlandais).
    """
    combined = f"{title} {desc}".lower()
    de_markers = [
        "und", "oder", "für", "mit", "im", "ihre aufgaben", "wir suchen", "deine aufgaben",
        "praktikum", "praktikant", "werkstudent", "anforderungen", "ab sofort", "m/w/d",
        "kenntnisse", "standort", "über uns", "bewerbung", "qualifikationen"
    ]
    nl_markers = [
        "en", "van", "het", "voor", "met", "wij zoeken", "jouw profiel",
        "functieomschrijving", "stagiair", "nederlands", "opleiding"
    ]
    fr_markers = [
        "le", "la", "les", "des", "dans", "pour", "avec", "stage", "stagiaire",
        "pfe", "missions", "profil recherché", "ingénieur", "vos missions", "notre équipe"
    ]
    en_markers = [
        "the", "and", "with", "for", "internship", "intern", "responsibilities",
        "qualifications", "skills", "experience", "about the role", "what you'll do"
    ]

    de_score = sum(1 for m in de_markers if m in combined)
    nl_score = sum(1 for m in nl_markers if m in combined)
    fr_score = sum(1 for m in fr_markers if m in combined)
    en_score = sum(1 for m in en_markers if m in combined)

    if de_score >= 3 and de_score > en_score and de_score > fr_score:
        return "de"
    if nl_score >= 3 and nl_score > en_score and nl_score > fr_score:
        return "nl"
    if fr_score > en_score and fr_score >= 2:
        return "fr"
    return "en"


def requires_non_en_fr(text: str = "") -> bool:
    """Vérifie si l'offre exige l'allemand ou le néerlandais obligatoire."""
    import re
    t = text.lower()
    patterns = [
        r"\bfluent in german\b",
        r"\bgerman is required\b",
        r"\bgerman language skills\b",
        r"\bsehr gute deutschkenntnisse\b",
        r"\bfließend deutsch\b",
        r"\bdeutschkenntnisse erforderlich\b",
        r"\bfluent in dutch\b",
        r"\bdutch is required\b",
        r"\bnederlands vereist\b",
    ]
    return any(re.search(p, t) for p in patterns)


def is_unpaid_offer(desc: str = "") -> Tuple[bool, str]:
    """
    Vérifie si l'offre mentionne explicitement qu'elle est non rémunérée ou bénévole.
    Retourne (True, raison) si non rémunérée, (False, '') sinon.
    """
    import re
    t = desc.lower()
    unpaid_patterns = [
        (r"\bunpaid\b", "Non rémunéré ('unpaid')"),
        (r"\bnon[\s-]r[ée]mun[ée]r[ée]\b", "Non rémunéré"),
        (r"\bvoluntary\b", "Bénévole / volontaire ('voluntary')"),
        (r"\bvolunteer\b", "Bénévole ('volunteer')"),
        (r"\buncompensated\b", "Non indemnisé ('uncompensated')"),
        (r"\bno\s+compensation\b", "Aucune compensation ('no compensation')"),
        (r"\bno\s+salary\b", "Aucun salaire ('no salary')"),
        (r"\bfor\s+college\s+credit\s+only\b", "Uniquement crédits académiques ('college credit only')"),
        (r"\bb[ée]n[ée]vole\b", "Bénévolat"),
    ]
    for pat, label in unpaid_patterns:
        if re.search(pat, t):
            # Vérifier qu'il ne s'agit pas d'une négation (ex: 'not unpaid')
            if not re.search(r"\b(?:not|never|no)\s+" + pat, t):
                return True, label
    return False, ""



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

    def dismiss_cookie_banner(self, target_page=None) -> bool:
        """Détecte et accepte ou refuse automatiquement le bandeau de consentement cookies LinkedIn."""
        p = target_page or self.page
        if not p or p.is_closed():
            return False
        for sel in [
            'button:has-text("Accepter")',
            'button:has-text("Accept")',
            'button[action-type="ACCEPT"]',
            'button[data-control-name="ga-cookie-consent-accept"]',
            'button:has-text("Tout accepter")',
            'button:has-text("Refuser")',
            'button:has-text("Reject")',
        ]:
            try:
                btn = p.locator(sel).first
                if btn.count() > 0 and btn.is_visible():
                    print("   🍪 [Cookies] Fermeture automatique du bandeau de consentement LinkedIn...")
                    btn.click(timeout=1500)
                    time.sleep(0.5)
                    return True
            except Exception:
                pass
        return False

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

                # Termes signalant une page d'authentification ou de vérification de sécurité en cours
                auth_terms = (
                    "/login", "/signup", "/uas/login", "/authwall",
                    "checkpoint/challenge", "checkpoint/v2", "checkpoint/rp",
                    "/checkpoint/", "security/challenge", "captcha", "challenge"
                )
                is_on_auth_page = any(
                    any(term in u.lower() for term in auth_terms)
                    for u in urls
                )
                is_on_app_page = any(
                    any(term in u for term in ("/feed", "/mynetwork", "/jobs", "/in/", "/messaging", "/home"))
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

                # Déclenchement UNIQUEMENT si on est réellement sorti des pages de login/checkpoint
                if (dom_connected and not is_on_auth_page) or (has_li_at and not is_on_auth_page and is_on_app_page):
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
                    if any("checkpoint" in u.lower() or "challenge" in u.lower() for u in urls):
                        print(f"🛡️ [Vérification Sécurité / 2FA] Code ou validation e-mail détecté. Veuillez valider sur l'écran ! ({rem}s restantes)")
                    elif has_li_at:
                        print(f"⏳ Jeton détecté, finalisation de la session en cours... ({rem}s restantes)")
                    else:
                        print(f"⏳ En attente de vos identifiants LinkedIn... ({rem}s restantes)")

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
        location: str = "Suisse",
        max_jobs: int = 15,
        applied_ids: Optional[set] = None,
        easy_apply_only: bool = True,
        exclude_france: bool = True,
        under_10_applicants: bool = True,
        max_applicants_threshold: int = 10,
        time_filter: str = "24h",
    ) -> List[Dict[str, Any]]:
        """
        Navigue sur LinkedIn Jobs avec filtres 'Candidature simplifiée' (f_AL=true),
        'Moins de 10 candidatures' (f_EA=true), 'Dernières 24h' (f_TPR=r86400) et geoId précis.
        Scanne la liste des offres fraîches, écarte impérativement les offres expirées/fermées
        et celles à forte concurrence.
        """
        if not self.page:
            raise RuntimeError("La page Playwright n'est pas initialisée.")

        applied_ids = applied_ids or set()
        jobs_queue: List[Dict[str, Any]] = []

        # Construction de l'URL avec filtres :
        # f_AL=true : Easy Apply uniquement (si easy_apply_only=True)
        # f_EA=true : Moins de 10 candidatures (si under_10_applicants=True)
        # f_TPR=r86400 : Dernières 24 heures (si time_filter="24h")
        # geoId : Verrouillage géographique strict du pays cible sur LinkedIn
        # sortBy=DD : Tri par date décroissante (offres fraîches)
        import urllib.parse
        encoded_kw = urllib.parse.quote(keywords)
        encoded_loc = urllib.parse.quote(location)
        al_param = "&f_AL=true" if easy_apply_only else ""
        ea_param = "&f_EA=true" if under_10_applicants else ""

        # Paramètre temporel LinkedIn (24h = r86400, semaine = r604800)
        tpr_param = ""
        if time_filter == "24h":
            tpr_param = "&f_TPR=r86400"
        elif time_filter == "week":
            tpr_param = "&f_TPR=r604800"

        # Mapping geoId LinkedIn officiel
        GEO_IDS = {
            "europe": "91000002",
            "union européenne": "91000002",
            "european union": "91000002",
            "ue": "91000002",
            "suisse": "106693272",
            "switzerland": "106693272",
            "schweiz": "106693272",
            "luxembourg": "104042105",
            "belgique": "100565514",
            "belgium": "100565514",
            "allemagne": "101282230",
            "germany": "101282230",
            "pays-bas": "102890719",
            "netherlands": "102890719",
            "irlande": "104738515",
            "ireland": "104738515",
            "suède": "105117694",
            "sweden": "105117694",
            "espagne": "105646813",
            "spain": "105646813",
            "italie": "103350119",
            "italy": "103350119",
            "france": "105015875",
        }
        loc_key = (location or "").lower().strip()
        geo_id = GEO_IDS.get(loc_key)
        geo_param = f"&geoId={geo_id}" if geo_id else ""

        search_url = (
            f"https://www.linkedin.com/jobs/search/?keywords={encoded_kw}"
            f"&location={encoded_loc}{geo_param}{al_param}{ea_param}{tpr_param}&sortBy=DD"
        )

        filter_parts = []
        if easy_apply_only:
            filter_parts.append("Easy Apply")
        else:
            filter_parts.append("Easy Apply + Portails Externes")
        if under_10_applicants:
            filter_parts.append(f"Moins de {max_applicants_threshold} candidats (f_EA=true)")
        if time_filter == "24h":
            filter_parts.append("Dernières 24h (f_TPR=r86400)")
        elif time_filter == "week":
            filter_parts.append("Semaine passée (f_TPR=r604800)")
        filter_label = " | ".join(filter_parts)

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

                # 2. Extraction du texte brut de la carte pour détection rapide
                full_text = card.inner_text().strip()
                lower_text = full_text.lower()

                # FILTRE A : Détection d'offres fermées ou déjà postulées directement sur la carte
                closed_card_keywords = (
                    "les candidatures ne sont plus acceptées",
                    "no longer accepting applications",
                    "candidatures fermées",
                    "offre fermée",
                    "offre expirée",
                    "candidature envoyée",
                    "déjà postulé",
                )
                if any(cw in lower_text for cw in closed_card_keywords):
                    print(f"   🚫 [Carte Offre Fermée / Déjà Postulée] Ignorée dès la liste : {raw_id}")
                    continue

                # FILTRE B : Détection et exclusion immédiate des offres saturées (> max_applicants_threshold, défaut 10)
                if under_10_applicants:
                    is_oversaturated = False
                    reported_count = 0
                    if (
                        "plus de 100" in lower_text
                        or "over 100" in lower_text
                        or "100+ " in lower_text
                        or "> 100" in lower_text
                        or ">100" in lower_text
                        or "plus de 200" in lower_text
                    ):
                        is_oversaturated = True
                        reported_count = 100
                    elif "plus de 50" in lower_text or "over 50" in lower_text or "50+ " in lower_text or "> 50" in lower_text:
                        is_oversaturated = True
                        reported_count = 50
                    elif "plus de 25" in lower_text or "over 25" in lower_text or "25+ " in lower_text or "> 25" in lower_text:
                        is_oversaturated = True
                        reported_count = 25
                    else:
                        cand_m = re.search(r"(\d+)\s*(?:candidatures|candidats|applicants|postulants|personnes?\s+ont\s+cliqu|people\s+clicked)", lower_text)
                        if cand_m:
                            n = int(cand_m.group(1))
                            if n > max_applicants_threshold:
                                is_oversaturated = True
                                reported_count = n

                    # Les mentions explicites de faible concurrence (< 10) annulent la saturation
                    if (
                        "moins de 10" in lower_text
                        or "under 10" in lower_text
                        or "early applicant" in lower_text
                        or "premiers candidats" in lower_text
                        or "premier candidat" in lower_text
                        or "soyez l'un des 10 premiers" in lower_text
                    ):
                        is_oversaturated = False

                    if is_oversaturated:
                        print(f"   🚫 [Filtre Concurrence] Écartée dès la recherche : {reported_count} candidats/clics (> {max_applicants_threshold}).")
                        continue

                lines = [
                    l.strip()
                    for l in full_text.split("\n")
                    if l.strip() and not l.strip().startswith("Consulté") and not l.strip().startswith("Promu")
                ]

                # Titre précis
                clean_title = ""
                try:
                    title_elem = card.locator(".job-card-list__title--link, a.job-card-container__link, [data-control-name='job_card_title'], strong").first
                    if title_elem.count() > 0:
                        clean_title = title_elem.inner_text().strip()
                except Exception:
                    pass
                if not clean_title:
                    raw_title = lines[0] if lines else "Poste IA / Data"
                    clean_title = re.sub(r"^(Sélectionné,\s*|Nouveau\s*|Recherche\s*)", "", raw_title, flags=re.IGNORECASE)
                    clean_title = re.sub(r"\(offre d’emploi vérifiée\)", "", clean_title, flags=re.IGNORECASE).strip()

                # Entreprise précise
                company = ""
                try:
                    comp_elem = card.locator(".artdeco-entity-lockup__subtitle, .job-card-container__primary-description, [class*='company-name']").first
                    if comp_elem.count() > 0:
                        company = comp_elem.inner_text().strip()
                except Exception:
                    pass
                if not company:
                    company = lines[1] if len(lines) > 1 else "Entreprise Internationale"

                # Localisation précise
                loc = ""
                try:
                    loc_elem = card.locator(".artdeco-entity-lockup__caption, .job-card-container__metadata-item, [class*='job-card-container__metadata']").first
                    if loc_elem.count() > 0:
                        loc = loc_elem.inner_text().strip()
                except Exception:
                    pass
                if not loc:
                    loc = lines[2] if len(lines) > 2 else location

                # 3. Filtre EILCO Mobilité Internationale (Interdiction de postuler en France)
                if exclude_france and (is_france_location(loc) or is_france_location(clean_title)):
                    print(f"   🚫 [Filtre EILCO] Offre en France écartée : {clean_title} ({loc})")
                    continue

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

        print(f"✨ [Sourcing] File d'attente prête : {len(jobs_queue)} nouvelle(s) offre(s) retenue(s) (Faible concurrence & Actives).")
        return jobs_queue

    # =========================================================================
    # ÉTAPE 3 : CONTRÔLE PRÉALABLE (CLÔTURE & CONCURRENCE DE L'OFFRE)
    # =========================================================================

    def check_if_job_closed(self) -> Tuple[bool, str]:
        """
        Vérifie sur la page de détail si l'offre est expirée ou si les candidatures ne sont plus acceptées.
        Retourne (is_closed: bool, reason: str).
        """
        if not self.page:
            return False, ""
        try:
            # 1. Vérification des bannières et messages d'erreur explicites de LinkedIn
            closed_selectors = [
                ".artdeco-inline-feedback--error",
                ".artdeco-inline-feedback",
                ".jobs-details-top-card__apply-error",
                "span:has-text('Les candidatures ne sont plus acceptées')",
                "span:has-text('No longer accepting applications')",
                "div:has-text('Cette offre d’emploi est fermée')",
                "div:has-text('Cette offre n’est plus disponible')",
                "div:has-text('This job is closed')",
                "div:has-text('This job is no longer accepting applications')",
                "p:has-text('No longer accepting applications')",
                "p:has-text('Les candidatures ne sont plus acceptées')",
            ]
            for sel in closed_selectors:
                loc = self.page.locator(sel).first
                if loc.is_visible():
                    txt = loc.inner_text().strip()
                    if any(term in txt.lower() for term in (
                        "ne sont plus acceptées",
                        "no longer accepting",
                        "est fermée",
                        "is closed",
                        "n'est plus disponible",
                        "candidature envoyée",
                        "already applied",
                    )):
                        return True, txt

            # 2. Vérification du texte global dans la zone d'en-tête de l'offre
            for header_sel in [
                ".job-details-jobs-unified-top-card",
                ".jobs-unified-top-card",
                ".jobs-box__html-content",
                "main",
            ]:
                header_elem = self.page.locator(header_sel).first
                if header_elem.is_visible():
                    header_txt = header_elem.inner_text().lower()
                    if "les candidatures ne sont plus acceptées" in header_txt:
                        return True, "Les candidatures ne sont plus acceptées"
                    if "no longer accepting applications" in header_txt:
                        return True, "No longer accepting applications"
                    if "cette offre d'emploi est fermée" in header_txt or "cette offre est fermée" in header_txt:
                        return True, "Cette offre est fermée"
                    if "candidature envoyée" in header_txt or "already applied" in header_txt:
                        return True, "Candidature déjà envoyée par le passé"
        except Exception:
            pass
        return False, ""

    def extract_applicant_count_on_page(self) -> Optional[int]:
        """
        Extrait le nombre réel de candidats ou de clics sur postuler affiché sur la page de détail de l'offre.
        Évite strictement les faux positifs (comme la taille de l'entreprise '50 employés' ou '50 autres offres').
        Gère à 100% :
        - Les candidatures Easy Apply directes ("Plus de 100 candidatures", "4 candidats")
        - Les offres avec redirection externe ("Plus de 100 personnes ont cliqué sur Postuler")
        - Les statuts de faible concurrence ("Moins de 10 candidatures", "Be among the first 25 applicants")
        Retourne le nombre (ex: 5 pour 'Moins de 10', 100 pour 'Plus de 100') ou None.
        """
        if not self.page:
            return None
        import re
        try:
            # 1. Sélecteurs stricts limités à l'en-tête de l'offre (JAMAIS 'main' qui lit toute la page)
            top_card_selectors = [
                ".job-details-jobs-unified-top-card__primary-description",
                ".jobs-unified-top-card__primary-description",
                ".jobs-unified-top-card__subtitle-secondary-grouping",
                ".jobs-unified-top-card__job-insight",
                ".job-details-jobs-unified-top-card",
                ".jobs-unified-top-card",
            ]
            for t_sel in top_card_selectors:
                elements = self.page.locator(t_sel).all()
                for tc in elements:
                    if not tc.is_visible():
                        continue
                    txt = tc.inner_text().strip().lower()

                    # Élimination immédiate des mentions parasites non liées aux candidatures
                    if any(ign in txt for ign in [
                        "offres d'emploi", "autres offres", "other jobs", "jobs available",
                        "employés", "employees", "salariés", "taille de l'entreprise", "company size"
                    ]):
                        continue

                    # Priorité A : Détection des badges de candidature précoce / faible concurrence (< 10 ou < 25)
                    if any(early in txt for early in [
                        "moins de 10", "under 10", "10 premiers", "first 10",
                        "first 25 applicants", "25 premiers candidats",
                        "be among the first", "soyez parmi les premiers",
                        "early applicant", "premier candidat", "premiers candidats"
                    ]):
                        return 5

                    # Priorité B : Détection d'alerte haute concurrence strictement liée aux candidatures/clics
                    if any(s in txt for s in [
                        "plus de 100 personnes ont cliqué", "over 100 people clicked",
                        "plus de 100 candidatures", "plus de 100 candidats",
                        "over 100 applicants", "over 100 applications",
                        "100+ applicants", "100+ candidatures", "> 100 candidats"
                    ]):
                        return 100

                    if any(s in txt for s in [
                        "plus de 50 personnes ont cliqué", "over 50 people clicked",
                        "plus de 50 candidatures", "plus de 50 candidats",
                        "over 50 applicants", "over 50 applications",
                        "50+ applicants", "50+ candidatures"
                    ]):
                        return 50

                    if any(s in txt for s in [
                        "plus de 25 personnes ont cliqué", "over 25 people clicked",
                        "plus de 25 candidatures", "plus de 25 candidats",
                        "over 25 applicants", "over 25 applications"
                    ]):
                        return 25

                    # Priorité C : Extraction regex précise liant le nombre à un terme de postulation
                    click_m = re.search(
                        r"(\d+)\s*(?:personnes?\s+ont\s+cliqu|people\s+clicked|candidatures?|candidats?|applicants?|postulants?)",
                        txt
                    )
                    if click_m:
                        return int(click_m.group(1))

                    over_m = re.search(
                        r"(?:plus de|over|\+ de|>)\s*(\d+)\s*(?:personnes|people|candidat|applicant|postul)",
                        txt
                    )
                    if over_m:
                        return int(over_m.group(1)) + 5
        except Exception:
            pass
        return None

    # =========================================================================
    # ÉTAPE 4 : SOUMISSION DU FORMULAIRE (CANDIDATURE SIMPLIFIÉE)
    # =========================================================================

    def scrape_job_description(self, job_url: str) -> str:
        """Extrait la description brute du poste (sans rechargement si la page est déjà sur l'offre)."""
        if not self.page:
            return ""
        try:
            current = self.page.url
            # Si on n'est pas encore sur cette offre, naviguer vers l'URL
            if job_url not in current and ("/view/" not in current or job_url.split("/view/")[-1].split("/")[0] not in current):
                self.page.goto(job_url, wait_until="domcontentloaded", timeout=25000)
                self.human_delay(1.5, 2.5)
                self.human_scroll(min_scrolls=2, max_scrolls=4)

            # Clic éventuel sur "Voir plus" / "Show more"
            show_more = self.page.locator("button.jobs-description__footer-button, button[aria-label*='plus']").first
            if show_more.is_visible():
                show_more.click()
                time.sleep(0.5)

            for sel in [
                ".jobs-description__content",
                ".jobs-box__html-content",
                "#job-details",
                ".jobs-description",
                "article",
                "main#workspace",
                "main",
            ]:
                desc_elem = self.page.locator(sel).first
                if desc_elem.is_visible():
                    text = desc_elem.inner_text().strip()
                    if len(text) > 50:
                        return text
            return ""
        except Exception as e:
            print(f"⚠️ [Description] Erreur extraction texte offre: {e}")
            return ""

    def enrich_job_details(self, job: Dict[str, Any]) -> Dict[str, Any]:
        """Extrait les informations exactes de l'entreprise, du titre et du lieu depuis la vue détaillée de l'offre."""
        if not self.page:
            return job
        try:
            # 1. Titre exact
            for sel in ["h1.job-details-jobs-unified-top-card__job-title", "h1.top-card-layout__title", "h1", ".jobs-unified-top-card__job-title"]:
                elem = self.page.locator(sel).first
                if elem.is_visible():
                    t = elem.inner_text().strip()
                    if t and len(t) > 3:
                        job["title"] = t
                        break

            # 2. Entreprise exacte
            for sel in [
                ".job-details-jobs-unified-top-card__company-name a",
                ".job-details-jobs-unified-top-card__primary-description a",
                "a.topcard__org-name-link",
                ".jobs-unified-top-card__company-name",
                "div[class*='primary-description'] a",
            ]:
                elem = self.page.locator(sel).first
                if elem.is_visible():
                    c = elem.inner_text().strip()
                    if c and len(c) > 1 and not any(w in c.lower() for w in ("intern", "stage", "engineer", "poste")):
                        job["company"] = c
                        break

            # 3. Localisation exacte
            for sel in [
                ".job-details-jobs-unified-top-card__bullet",
                ".job-details-jobs-unified-top-card__primary-description span:nth-child(2)",
                "span.topcard__flavor--bullet",
                ".jobs-unified-top-card__bullet",
            ]:
                elem = self.page.locator(sel).first
                if elem.is_visible():
                    l = elem.inner_text().strip()
                    if l and len(l) > 2:
                        job["location"] = l
                        break
        except Exception:
            pass
        return job

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
        Extrait l'URL externe réelle de postulation sur le site recruteur :
        - Inspecte le bouton externe (href direct).
        - Ouvre le popup si nécessaire.
        - Franchit automatiquement le bandeau cookies LinkedIn ("LinkedIn respecte votre confidentialité").
        - Franchit automatiquement l'interstitiel LinkedIn ("Vous quittez LinkedIn" / "Si vous faites confiance à ce lien").
        - Récupère l'URL de redirection finale sur le site employeur / ATS.
        """
        if not self.page:
            return None
        try:
            # 1. Vérification si un lien direct externe (non-LinkedIn) est présent dans le DOM
            for sel in [
                "a.jobs-apply-button[href]",
                "a[data-job-id][href*='apply']",
                "a:has-text('Postuler')[href]",
                "a:has-text('Apply')[href]",
            ]:
                try:
                    link = self.page.locator(sel).first
                    if link.count() > 0 and link.is_visible():
                        href = link.get_attribute("href") or ""
                        # Si le lien pointe déjà directement vers un domaine tiers
                        if href.startswith("http") and "linkedin.com" not in href:
                            return href
                except Exception:
                    pass

            # 2. Clic sur le bouton de candidature externe avec écoute de popup
            ext_btn = self.page.locator(
                "button.jobs-apply-button, a.jobs-apply-button, button:has-text('Postuler'), button:has-text('Apply'), a:has-text('Postuler'), a:has-text('Apply')"
            ).first

            if ext_btn.count() > 0 and ext_btn.is_visible():
                popup_page = None
                try:
                    with self.page.expect_popup(timeout=8000) as popup_info:
                        ext_btn.click()
                    popup_page = popup_info.value
                except Exception:
                    pass

                if popup_page:
                    try:
                        popup_page.wait_for_load_state("domcontentloaded", timeout=12000)
                        time.sleep(1.5)

                        # Étape A : Fermeture du bandeau cookies LinkedIn sur le popup
                        self.dismiss_cookie_banner(popup_page)

                        # Étape B : Détection de l'interstitiel "Vous quittez LinkedIn"
                        body_txt = popup_page.inner_text("body").lower() if popup_page.locator("body").count() > 0 else ""
                        is_leaving = "quittez linkedin" in body_txt or "leaving linkedin" in body_txt or "externalapply" in popup_page.url.lower()

                        if is_leaving:
                            print("   🔄 [Interstitiel Détecté] Page 'Vous quittez LinkedIn' détectée dans le popup...")
                            # Recherche du lien cliquable affiché au centre de la page (ex: recruitics, company career)
                            redirect_elem = popup_page.locator("a[href^='http']:not([href*='linkedin.com'])").first
                            if redirect_elem.count() > 0 and redirect_elem.is_visible():
                                target_url = redirect_elem.get_attribute("href") or ""
                                print(f"   👉 [Lien Sortant Trouvé] {target_url[:80]}...")
                                try:
                                    redirect_elem.click(timeout=3000)
                                    popup_page.wait_for_load_state("domcontentloaded", timeout=10000)
                                    time.sleep(2.0)
                                    final_url = popup_page.url
                                    if "linkedin.com" not in final_url:
                                        target_url = final_url
                                except Exception:
                                    pass

                                popup_page.close()
                                return target_url

                        # Attente d'éventuelle redirection HTTP automatique vers le site employeur
                        for _ in range(5):
                            if "linkedin.com" not in popup_page.url:
                                break
                            time.sleep(1.0)

                        final_url = popup_page.url
                        popup_page.close()
                        return final_url
                    except Exception as pe:
                        print(f"ℹ️ [Popup Traitement] : {pe}")
                        if popup_page and not popup_page.is_closed():
                            popup_page.close()
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

        # 2. Gestion de la modale multi-étapes (support balise <dialog> HTML5 et conteneurs classiques)
        modal = None
        for sel in ["dialog", "div.jobs-easy-apply-modal", "[data-test-modal]", ".artdeco-modal", "div[role='dialog']:visible"]:
            m = self.page.locator(sel).first
            try:
                if m.is_visible():
                    modal = m
                    break
                m.wait_for(state="visible", timeout=3000)
                modal = m
                break
            except Exception:
                continue

        if not modal or not modal.is_visible():
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
            phone_inputs = (modal or self.page).locator("input[id*='phoneNumber'], input[type='tel']").all()
            for p_in in phone_inputs:
                if p_in.is_visible():
                    val = p_in.input_value()
                    if not val or len(val) < 8:
                        p_in.fill(self.phone_number)
                        print(f"      📞 Téléphone rempli : {self.phone_number}")

            # B. Localisation (Ville / Commune obligatoire)
            city_inputs = (modal or self.page).locator(
                "input[id*='city' i], input[name*='city' i], input[placeholder*='ville' i], input[placeholder*='city' i], input[aria-label*='city' i], input[aria-label*='ville' i]"
            ).all()
            for c_in in city_inputs:
                try:
                    if c_in.is_visible() and not c_in.input_value():
                        target_city = "Genève"
                        c_in.fill(target_city)
                        time.sleep(0.8)
                        opt = self.page.locator("div[role='option'], .basic-typeahead__selectable-list li, [class*='typeahead-result']").first
                        if opt.is_visible(timeout=1500):
                            opt.click()
                            print(f"      📍 Ville renseignée : {target_city}")
                except Exception:
                    pass

            # C. Lettre de motivation (textarea)
            textareas = (modal or self.page).locator("textarea").all()
            for ta in textareas:
                try:
                    if ta.is_visible() and not ta.input_value():
                        snippet = (
                            f"Madame, Monsieur,\n\n"
                            f"Actuellement en dernière année d'école d'ingénieurs à l'EILCO (spécialité IA & Machine Learning), "
                            f"je souhaite vivement rejoindre {company} pour mon stage de fin d'études. "
                            f"Mon profil en Computer Vision et pipelines RAG est directement aligné avec vos défis techniques.\n\n"
                            f"Restant à votre entière disposition,\n{self.candidate_name}"
                        )
                        ta.fill(snippet)
                        print("      ✍️ Lettre de motivation insérée dans le champ dédié.")
                except Exception:
                    pass

            # D. Upload du CV ou de la Lettre PDF
            file_inputs = (modal or self.page).locator("input[type='file']").all()
            for f_in in file_inputs:
                try:
                    p_text = (f_in.locator("xpath=..").inner_text() or "").lower()
                    aria = (f_in.get_attribute("aria-label") or "").lower()
                    combined_info = f"{p_text} {aria}"

                    # Si le champ demande expressément une lettre de motivation
                    if any(w in combined_info for w in ("lettre", "cover", "motivation")):
                        target_file = cover_letter_pdf_path if (cover_letter_pdf_path and os.path.exists(cover_letter_pdf_path)) else cv_pdf_path
                    else:
                        # Sur LinkedIn Easy Apply, le champ principal d'upload est STRICTEMENT le CV !
                        target_file = cv_pdf_path if (cv_pdf_path and os.path.exists(cv_pdf_path)) else cover_letter_pdf_path

                    if target_file and os.path.exists(target_file):
                        f_in.set_input_files(target_file)
                        print(f"      📎 Document PDF joint : {os.path.basename(target_file)}")
                        self.human_delay(1.0, 2.0)
                except Exception as up_err:
                    print(f"      ⚠️ Note upload: {up_err}")

            # C. Champs numériques d'expérience (ex: 'How many years of experience with Python?')
            num_inputs = (modal or self.page).locator("input[type='text'], input[type='number']").all()
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

            # D. Groupes de questions (Radios et Checkboxes avec sélection robuste compatible LinkedIn Artdeco)
            # 1. Regroupement intelligent de tous les boutons radio par 'name' (groupe HTML standard)
            all_radios = (modal or self.page).locator("input[type='radio']").all()
            radio_groups: Dict[str, List[Any]] = {}
            for r in all_radios:
                try:
                    grp_name = r.get_attribute("name") or "default_group"
                    radio_groups.setdefault(grp_name, []).append(r)
                except Exception:
                    pass

            for grp_name, r_list in radio_groups.items():
                try:
                    # Si déjà coché, passer au groupe suivant
                    if any(r.is_checked() for r in r_list):
                        continue

                    # Détection du texte de la question pour ce groupe radio
                    q_text = ""
                    first_r = r_list[0]
                    for q_sel in [
                        "xpath=ancestor::fieldset[1]//legend",
                        "xpath=ancestor::div[contains(@class,'fb-form-element')][1]//label",
                        "xpath=ancestor::div[contains(@class,'form-element')][1]//legend",
                        "xpath=ancestor::fieldset[1]",
                        "xpath=ancestor::div[@data-test-form-builder-radio-button-form-component][1]",
                        "xpath=ancestor::div[contains(@class,'jobs-easy-apply')][1]",
                    ]:
                        try:
                            q_cand = first_r.locator(q_sel).first
                            if q_cand.count() > 0:
                                q_text = q_cand.inner_text().strip().lower()
                                if q_text:
                                    break
                        except Exception:
                            pass

                    # Détermination de la réponse attendue (Yes par défaut, No uniquement pour parrainage/visa/handicap)
                    desired = "yes"
                    negative_keywords = ["sponsor", "visa", "parrainage", "disability", "handicap", "require sponsorship"]
                    if any(nk in q_text for nk in negative_keywords):
                        desired = "no"

                    # Recherche du bouton radio correspondant au choix souhaité
                    chosen_radio = None
                    for r in r_list:
                        r_id = r.get_attribute("id") or ""
                        r_val = (r.get_attribute("value") or "").strip().lower()
                        lbl_txt = ""

                        # Extraction du libellé du bouton radio (label[for] ou parent)
                        if r_id:
                            lbl_elem = (modal or self.page).locator(f"label[for='{r_id}']").first
                            if lbl_elem.count() > 0:
                                try:
                                    lbl_txt = lbl_elem.inner_text().strip().lower()
                                except Exception:
                                    pass
                        if not lbl_txt:
                            try:
                                parent_elem = r.locator("xpath=ancestor::label[1] | xpath=following-sibling::label[1] | xpath=..").first
                                if parent_elem.count() > 0:
                                    lbl_txt = parent_elem.inner_text().strip().lower()
                            except Exception:
                                pass

                        is_yes = any(w in lbl_txt for w in ("yes", "oui", "true", "vrai")) or r_val in ("yes", "oui", "true", "1")
                        is_no = any(w in lbl_txt for w in ("no", "non", "false", "faux")) or r_val in ("no", "non", "false", "0")

                        if desired == "yes" and is_yes:
                            chosen_radio = r
                            break
                        elif desired == "no" and is_no:
                            chosen_radio = r
                            break

                    # Fallback si aucun libellé explicite n'a matché
                    if not chosen_radio:
                        chosen_radio = r_list[0] if desired == "yes" else r_list[-1]

                    # Activation robuste du bouton radio (clic sur le label + input + JS event)
                    target_id = chosen_radio.get_attribute("id") or ""
                    clicked = False

                    if target_id:
                        lbl_to_click = (modal or self.page).locator(f"label[for='{target_id}']").first
                        if lbl_to_click.count() > 0 and lbl_to_click.is_visible():
                            try:
                                lbl_to_click.scroll_into_view_if_needed(timeout=1000)
                                lbl_to_click.click(force=True, timeout=2000)
                                clicked = True
                            except Exception:
                                pass

                    if not clicked:
                        try:
                            parent_lbl = chosen_radio.locator("xpath=ancestor::label[1] | xpath=following-sibling::label[1] | xpath=..").first
                            if parent_lbl.count() > 0:
                                parent_lbl.scroll_into_view_if_needed(timeout=1000)
                                parent_lbl.click(force=True, timeout=2000)
                                clicked = True
                        except Exception:
                            pass

                    if not clicked:
                        try:
                            chosen_radio.click(force=True, timeout=2000)
                        except Exception:
                            pass

                    # Forçage des propriétés DOM et événements de validation LinkedIn
                    try:
                        chosen_radio.check(force=True)
                    except Exception:
                        pass
                    try:
                        chosen_radio.evaluate("""el => {
                            el.checked = true;
                            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                        }""")
                    except Exception:
                        pass

                    display_q = (q_text[:50] + "...") if len(q_text) > 50 else (q_text or "Question d'éligibilité")
                    print(f"      🔘 Option radio validée : '{desired.upper()}' ({display_q})")
                except Exception as r_err:
                    print(f"      ⚠️ Note radio: {r_err}")

            # 2. Checkboxes non cochées
            checkboxes = (modal or self.page).locator("input[type='checkbox']").all()
            for cb in checkboxes:
                try:
                    if not cb.is_checked():
                        cb_id = cb.get_attribute("id") or ""
                        if cb_id:
                            lbl_cb = (modal or self.page).locator(f"label[for='{cb_id}']").first
                            if lbl_cb.count() > 0 and lbl_cb.is_visible():
                                lbl_cb.click(force=True, timeout=1500)
                        try:
                            cb.check(force=True)
                        except Exception:
                            pass
                        cb.evaluate("""el => {
                            el.checked = true;
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                        }""")
                        print(f"      ☑️ Case à cocher validée ({cb_id or 'ok'})")
                except Exception:
                    pass

            # E. Listes déroulantes (select)
            selects = (modal or self.page).locator("select").all()
            for sel in selects:
                try:
                    if sel.is_visible():
                        val = sel.input_value()
                        if not val or val == "0" or "select" in val.lower():
                            options = sel.locator("option").all()
                            selected = False
                            for opt in options:
                                ot = (opt.inner_text() or "").lower()
                                ov = (opt.get_attribute("value") or "").lower()
                                if "yes" in ot or "oui" in ot or ov in ("yes", "oui", "true"):
                                    sel.select_option(value=opt.get_attribute("value"))
                                    selected = True
                                    break
                            if not selected and len(options) > 1:
                                sel.select_option(index=1)
                except Exception:
                    pass

            # F. Détection de l'état final : Bouton "Envoyer la candidature" / "Submit application"
            submit_btn = (modal or self.page).locator(
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

            # G. Passer à l'étape suivante : "Vérifier" (Review) ou "Suivant" (Next)
            review_btn = (modal or self.page).locator("button:has-text('Vérifier'), button:has-text('Review')").first
            next_btn = (modal or self.page).locator("button:has-text('Suivant'), button:has-text('Next')").first

            if review_btn.is_visible():
                review_btn.click()
            elif next_btn.is_visible():
                next_btn.click()
            else:
                print("   ⚠️ Aucun bouton d'avancement visible. Annulation de la modale.")
                self._dismiss_modal()
                return {"success": False, "error": "Blocage modale"}

            self.human_delay(1.5, 2.0)

            # Filet de sécurité : Détection et résolution immédiate d'erreurs résiduelles (ex: "Ce champ est obligatoire")
            try:
                err_feedback = (modal or self.page).locator(
                    ".artdeco-inline-feedback--error, [data-test-form-element-error-messages], p:has-text('obligatoire'), p:has-text('required')"
                )
                if err_feedback.count() > 0 and err_feedback.first.is_visible():
                    print("      ⚠️ Champ obligatoire manqué détecté. Correction forcée immédiate...")
                    for unchk in (modal or self.page).locator("input[type='radio']:not(:checked)").all():
                        try:
                            u_id = unchk.get_attribute("id") or ""
                            if u_id:
                                lbl = (modal or self.page).locator(f"label[for='{u_id}']").first
                                if lbl.count() > 0:
                                    lbl.click(force=True, timeout=1000)
                            unchk.evaluate("""el => {
                                el.checked = true;
                                el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                                el.dispatchEvent(new Event('change', { bubbles: true }));
                            }""")
                        except Exception:
                            pass
                    self.human_delay(1.0, 1.5)
                    if review_btn.is_visible():
                        review_btn.click()
                    elif next_btn.is_visible():
                        next_btn.click()
            except Exception:
                pass

        self._dismiss_modal()
        return {"success": False, "error": "Nombre maximal d'étapes atteint"}

    def _dismiss_modal(self):
        """Ferme proprement la modale de candidature en cours."""
        if not self.page:
            return
        try:
            close_btn = self.page.locator(
                "dialog button[aria-label='Ignorer'], button[aria-label='Ignorer'], button[aria-label='Dismiss'], button[aria-label='Fermer'], button.artdeco-modal__dismiss, [data-test-modal-close-btn]"
            ).first
            if close_btn.is_visible():
                close_btn.click()
                time.sleep(0.8)
                # Confirmer l'abandon si demandé
                discard_btn = self.page.locator(
                    "button[data-control-name='discard_application_confirm_btn'], button:has-text('Abandonner'), button:has-text('Discard'), [data-test-dialog-primary-btn]"
                ).first
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
