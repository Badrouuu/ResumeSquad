"""
browser_applicant.py — Bot Autonome d'Automatisation de Navigateur (Playwright RPA)
avec Validation Humaine Pré-Envoi (Human-in-the-Loop & Screenshot Discord).

Fonctionnalités :
1. Pilote un vrai navigateur Chromium (mode visible ou headless) avec contournement furtif (stealth).
2. Détecte et remplit intelligemment les formulaires de candidature (Greenhouse, Lever, SmartRecruiters, Ashby, Welcome to the Jungle, custom forms).
3. Téléverse automatiquement le CV au format PDF (généré si absent).
4. Capture un screenshot haute définition avant soumission et l'envoie sur Discord via Webhook.
5. Met en pause l'exécution pour permettre à l'utilisateur de valider visuellement avant tout clic sur 'Submit'.

Usage :
    python backend/app/browser_applicant.py --url "https://jobs.lever.co/..."
    python backend/app/browser_applicant.py --url "https://boards.greenhouse.io/..." --headless
    python backend/app/browser_applicant.py --url "..." --auto-submit
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any

# Encodage console Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

import requests
from playwright.sync_api import sync_playwright, Page, TimeoutError as PlaywrightTimeoutError

# Chemins de base
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "output"
SCREENSHOTS_DIR = OUTPUT_DIR / "screenshots"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

PROFILE_PATH = DATA_DIR / "sample_profile.json"
ENV_PATH = BASE_DIR / ".env"

# Chargement du fichier d'environnement
if ENV_PATH.exists():
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")


def load_profile() -> dict:
    """Charge le profil du candidat depuis sample_profile.json."""
    if PROFILE_PATH.exists():
        try:
            with open(PROFILE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                basics = data.get("basics", {})
                parts = basics.get("name", "Badroudine Bacar").split()
                first_name = parts[0] if parts else "Badroudine"
                last_name = " ".join(parts[1:]) if len(parts) > 1 else "Bacar"
                return {
                    "first_name": first_name,
                    "last_name": last_name,
                    "full_name": basics.get("name", "Badroudine Bacar"),
                    "email": basics.get("email", "badroudinebacar@gmail.com"),
                    "phone": basics.get("phone", "+33 6 12 34 56 78"),
                    "location": basics.get("location", "France (Mobilité Suisse, Luxembourg, Belgique)"),
                    "linkedin": basics.get("linkedin", "https://www.linkedin.com/in/badroudine-bacar/"),
                    "github": basics.get("github", "https://github.com/Badrouuu"),
                    "school": "EILCO (École d'Ingénieurs du Littoral Côte d'Opale)",
                    "degree": "Diplôme d'Ingénieur Informatique — Spécialité IA & Machine Learning",
                    "summary": basics.get("summary", ""),
                }
        except Exception as e:
            print(f"⚠️ Erreur chargement profile.json : {e}")

    return {
        "first_name": "Badroudine",
        "last_name": "Bacar",
        "full_name": "Badroudine Bacar",
        "email": "badroudinebacar@gmail.com",
        "phone": "+33 6 12 34 56 78",
        "location": "France (Mobilité Suisse, Luxembourg, Belgique)",
        "linkedin": "https://www.linkedin.com/in/badroudine-bacar/",
        "github": "https://github.com/Badrouuu",
        "school": "EILCO",
        "degree": "Diplôme d'Ingénieur en Informatique — Parcours IA",
        "summary": "Élève-Ingénieur en IA, Machine Learning et Vision par Ordinateur à l'EILCO.",
    }


def ensure_cv_pdf(page: Page, profile: dict) -> Path:
    """Garantit l'existence d'un CV PDF élégant pour le téléversement."""
    cv_path = OUTPUT_DIR / "CV_Badroudine_Bacar.pdf"
    if cv_path.exists() and cv_path.stat().st_size > 1000:
        return cv_path

    print("📄 Génération instantanée d'un CV PDF au format A4 exécutif...")
    html_content = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    @page {{ size: A4; margin: 15mm; }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; line-height: 1.45; font-size: 11pt; }}
    .header {{ border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }}
    h1 {{ margin: 0 0 4px; font-size: 22pt; color: #0f172a; }}
    .title {{ font-size: 13pt; font-weight: 600; color: #2563eb; margin-bottom: 8px; }}
    .contact {{ font-size: 9.5pt; color: #475569; display: flex; gap: 15px; flex-wrap: wrap; }}
    .section {{ margin-bottom: 16px; }}
    .section-title {{ font-size: 11pt; font-weight: 700; color: #0f172a; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin-bottom: 8px; }}
    .item {{ margin-bottom: 10px; }}
    .item-header {{ display: flex; justify-content: space-between; font-weight: 600; font-size: 10.5pt; }}
    .item-sub {{ color: #2563eb; font-size: 9.5pt; }}
    ul {{ margin: 4px 0 0 18px; padding: 0; font-size: 9.5pt; }}
    li {{ margin-bottom: 3px; }}
    .skills-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 9.5pt; }}
  </style>
</head>
<body>
  <div class="header">
    <h1>{profile['full_name']}</h1>
    <div class="title">Ingénieur IA & Machine Learning — Stage PFE (6 mois)</div>
    <div class="contact">
      <span>✉️ {profile['email']}</span>
      <span>📱 {profile['phone']}</span>
      <span>📍 {profile['location']}</span>
      <span>🔗 {profile['linkedin']}</span>
      <span>💻 {profile['github']}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Formation Académique</div>
    <div class="item">
      <div class="item-header">
        <span>{profile['school']}</span>
        <span>2024 - 2027</span>
      </div>
      <div class="item-sub">{profile['degree']} (Dernière année / ING3)</div>
      <ul>
        <li>Spécialité : Deep Learning, Vision par Ordinateur, Machine Learning, Architecture Logicielle, MLOps.</li>
        <li>TOEIC certifié C1 (905/990). Mobilité internationale complète (Suisse, Luxembourg, Belgique, Allemagne).</li>
      </ul>
    </div>
    <div class="item">
      <div class="item-header">
        <span>Lycée Antonin Artaud — Marseille</span>
        <span>2022 - 2024</span>
      </div>
      <div class="item-sub">CPGE TSI (Classe Préparatoire aux Grandes Écoles)</div>
      <ul>
        <li>Mathématiques approfondies, Physique appliquée, Sciences de l'Ingénieur et Algorithmique.</li>
      </ul>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Projets d'Ingénierie & Expérience</div>
    <div class="item">
      <div class="item-header">
        <span>Étiquette Jaune — Machine Vision Mobile (Projet Labellisé PÉPITE)</span>
        <span>2025 - 2026</span>
      </div>
      <ul>
        <li>Intégration de modèles de Vision par Ordinateur embarqués (Google ML Kit OCR) pour la détection temps réel de prix et tickets.</li>
        <li>Backend serverless Google Cloud Functions (TypeScript) et synchronisation temps réel Firestore.</li>
      </ul>
    </div>
    <div class="item">
      <div class="item-header">
        <span>VectorWord / Guess-What — API NLP Haute Performance</span>
        <span>2026</span>
      </div>
      <ul>
        <li>Conception d'une API FastAPI servant des calculs de similarité cosinus sur des embeddings de mots (Gensim Word2Vec, latence &lt; 40ms).</li>
        <li>Architecture conteneurisée Docker avec microservices déployés et interface réactive Next.js 15.</li>
      </ul>
    </div>
    <div class="item">
      <div class="item-header">
        <span>ResumeSquad AI — Pipeline Multi-Agents & RAG</span>
        <span>2026</span>
      </div>
      <ul>
        <li>Orchestration asynchrone de 4 agents spécialisés avec Few-Shot Prompting, Pydantic v2 et taux d'hallucination &lt; 2%.</li>
      </ul>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Compétences Techniques</div>
    <div class="skills-grid">
      <div><strong>IA & Vision :</strong> PyTorch, OpenCV, Machine Vision, Google ML Kit, Word2Vec, RAG, Transformers.</div>
      <div><strong>Langages :</strong> Python, TypeScript, SQL, C, Dart, Bash.</div>
      <div><strong>Backend & DevOps :</strong> FastAPI, Docker, Uvicorn, Git, CI/CD, Supabase (PostgreSQL).</div>
      <div><strong>Langues :</strong> Français (Natif), Anglais (Courant C1 / TOEIC 905).</div>
    </div>
  </div>
</body>
</html>"""

    # Utilisation d'une page temporaire pour imprimer le PDF
    temp_page = page.context.new_page()
    temp_page.set_content(html_content)
    temp_page.pdf(path=str(cv_path), format="A4", print_background=True)
    temp_page.close()
    print(f"✅ CV PDF généré : {cv_path} ({cv_path.stat().st_size} octets)")
    return cv_path


def send_discord_hitl_report(
    webhook_url: str,
    company: str,
    title: str,
    job_url: str,
    screenshot_path: Path,
    filled_fields: list,
    cv_filename: Optional[str] = None,
):
    """Envoie un rapport riche avec capture d'écran sur Discord pour validation humaine."""
    if not webhook_url or not webhook_url.startswith("https://discord.com/api/webhooks/"):
        return False

    summary_text = "\n".join([f"• **{f['label']}** : `{f['value']}`" for f in filled_fields[:8]])
    used_cv = cv_filename or "CV_Badroudine_Bacar.pdf"

    payload_json = {
        "username": "ResumeSquad Assistant",
        "avatar_url": "https://cdn-icons-png.flaticon.com/512/4712/4712109.png",
        "embeds": [
            {
                "title": f"📸 [Pré-Validation Formulaire] {company} — {title}",
                "description": (
                    f"Badroudine, l'agent Playwright a analysé le portail et a pré-rempli **{len(filled_fields)} champs** avec ton profil.\n\n"
                    f"**Extrait des champs complétés :**\n{summary_text}\n\n"
                    f"⚠️ **Statut :** Formulaire prêt. Capture d'écran jointe ci-dessous."
                ),
                "color": 0x2563eb,
                "fields": [
                    {"name": "🏢 Entreprise", "value": f"**{company}**", "inline": True},
                    {"name": "💼 Intitulé", "value": title or "Poste Ciblé", "inline": True},
                    {"name": "📄 CV Sur-Mesure Téléversé", "value": f"📄 **`{used_cv}`**", "inline": False},
                    {"name": "🔗 Page Directe du Formulaire", "value": f"[Accéder à l'offre]({job_url})", "inline": False},
                ],
                "image": {"url": "attachment://pre_submission_screenshot.png"},
                "footer": {"text": "ResumeSquad • Salon Validation & Arbitrage Opérateur"},
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
        ],
    }

    try:
        with open(screenshot_path, "rb") as f:
            files = {
                "file": ("pre_submission_screenshot.png", f, "image/png"),
            }
            resp = requests.post(
                webhook_url,
                data={"payload_json": json.dumps(payload_json)},
                files=files,
                timeout=20,
            )
            return resp.status_code in (200, 204)
    except Exception as e:
        print(f"⚠️ Erreur transmission capture Discord : {e}")
        return False


def prompt_operator_decision(
    company: str,
    title: str,
    cv_filename: str,
    screenshot_path: Path,
    filled_count: int,
    auto_submit: bool = True,
    countdown_seconds: int = 5,
) -> str:
    """
    Interface d'arbitrage interactif opérateur :
    - 'submit' : Confirme l'envoi direct
    - 'manual' : Déplace immédiatement dans 'À faire moi-même' (alerte Discord + CRM)
    - 'reject' : Rejette / ignore cette offre
    - 'cancel' : Annule sans soumettre
    """
    print("\n" + "=" * 72)
    print(f"📋 [CANDIDATURE PRÊTE] {company} — {title}")
    print(f"   🏢 Entreprise : {company}")
    print(f"   💼 Poste      : {title}")
    print(f"   📄 CV Dédié   : {cv_filename}")
    print(f"   ✍️ Champs     : {filled_count} champ(s) renseigné(s)")
    print(f"   📸 Capture    : {screenshot_path.name}")
    print("-" * 72)
    print("⚡ OPTIONS OPÉRATEUR :")
    if auto_submit:
        print(f"   👉 [Entrée / Attendre {countdown_seconds}s] Confirmer l'envoi automatique")
    else:
        print("   👉 [Entrée] Confirmer et envoyer la candidature")
    print("   👉 [m] ✋ Déplacer dans 'À faire moi-même' (Escalade Discord + CRM)")
    print("   👉 [r] 🚫 Rejeter / Ignorer cette opportunité (ne pas postuler)")
    print("   👉 [p] ⏸️ Pause indéfinie (prendre le temps d'examiner l'écran)")
    print("=" * 72)

    try:
        import msvcrt
        has_msvcrt = True
    except ImportError:
        has_msvcrt = False

    # Mode semi-automatique : saisie bloquante standard
    if not auto_submit:
        try:
            choice = input("\nVotre choix [Entrée = Envoyer / m = Manuel / r = Rejeter] : ").strip().lower()
            if choice == "m":
                return "manual"
            elif choice == "r":
                return "reject"
            elif choice in ("q", "cancel"):
                return "cancel"
            return "submit"
        except (KeyboardInterrupt, EOFError):
            return "cancel"

    # Mode Auto-Submit avec compte à rebours interactif non-bloquant
    if has_msvcrt and sys.stdin.isatty():
        start_time = time.time()
        while time.time() - start_time < countdown_seconds:
            remaining = int(countdown_seconds - (time.time() - start_time)) + 1
            print(f"\r⏳ [Auto-Submit dans {remaining}s...] [m = manuel | r = rejeter | p = pause | Entrée = direct]  ", end="", flush=True)
            if msvcrt.kbhit():
                ch = msvcrt.getwch().lower()
                print()
                if ch in ("\r", "\n"):
                    print("🚀 Envoi immédiat confirmé.")
                    return "submit"
                elif ch == "m":
                    print("✋ Basculement en mode 'À faire moi-même' validé par l'opérateur.")
                    return "manual"
                elif ch == "r":
                    print("🚫 Offre rejetée par l'opérateur. Passage à la suite.")
                    return "reject"
                elif ch == "p":
                    print("\n⏸️ [PAUSE INDÉFINIE ACTIVE] Prenez votre temps pour examiner le navigateur et la capture.")
                    try:
                        p_choice = input("Votre décision [Entrée = Envoyer / m = Manuel / r = Rejeter] : ").strip().lower()
                        if p_choice == "m":
                            return "manual"
                        elif p_choice == "r":
                            return "reject"
                        return "submit"
                    except (KeyboardInterrupt, EOFError):
                        return "cancel"
            time.sleep(0.1)
        print("\n🚀 [Auto-Submit] Délai écoulé : Validation automatique de l'envoi.")
        return "submit"
    else:
        time.sleep(1.0)
        return "submit"


def fill_input(page: Page, selectors: list, value: str, field_name: str, filled_list: list) -> bool:
    """Tente de trouver et remplir un champ de saisie texte."""
    for sel in selectors:
        try:
            locator = page.locator(sel).first
            if locator.count() > 0 and locator.is_visible():
                locator.click(timeout=1500)
                locator.fill(value, timeout=2000)
                filled_list.append({"label": field_name, "value": value})
                print(f"   ✓ {field_name} renseigné : {value}")
                time.sleep(0.15)
                return True
        except Exception:
            continue
    return False


def upload_resume_file(page: Page, file_path: Path, filled_list: list) -> bool:
    """Repère les inputs de type fichier et téléverse le CV PDF."""
    file_selectors = [
        'input[type="file"][name*="resume" i]',
        'input[type="file"][id*="resume" i]',
        'input[type="file"][name*="cv" i]',
        'input[type="file"][accept*="pdf" i]',
        'input[type="file"]',
    ]

    for sel in file_selectors:
        try:
            inputs = page.locator(sel)
            if inputs.count() > 0:
                first_input = inputs.first
                first_input.set_input_files(str(file_path), timeout=3000)
                filled_list.append({"label": "CV Téléversé", "value": file_path.name})
                print(f"   ✓ CV PDF attaché avec succès : {file_path.name}")
                time.sleep(0.5)
                return True
        except Exception:
            continue
    return False


def answer_common_questions(page: Page, filled_list: list):
    """Répond aux questions de conformité fréquentes (autorisation de travail, visa, stage)."""
    # 1. Autorisation de travail dans l'UE / Suisse
    try:
        auth_selectors = [
            'input[name*="authorized" i][value*="yes" i]',
            'input[name*="authorized" i][value*="true" i]',
            'input[id*="authorized" i]',
            'input[aria-label*="authorized to work" i]',
        ]
        for sel in auth_selectors:
            loc = page.locator(sel).first
            if loc.count() > 0 and loc.is_visible():
                loc.check(timeout=1500)
                filled_list.append({"label": "Droit de travail", "value": "Oui (Citoyen UE)"})
                print("   ✓ Droit de travail coché : Oui")
                break
    except Exception:
        pass

    # 2. Besoin de parrainage de visa
    try:
        sponsorship_selectors = [
            'input[name*="sponsorship" i][value*="no" i]',
            'input[name*="sponsorship" i][value*="false" i]',
            'input[id*="sponsorship" i]',
        ]
        for sel in sponsorship_selectors:
            loc = page.locator(sel).first
            if loc.count() > 0 and loc.is_visible():
                loc.check(timeout=1500)
                filled_list.append({"label": "Besoin de visa", "value": "Non"})
                print("   ✓ Parrainage de visa : Non")
                break
    except Exception:
        pass


def run_browser_applicant(
    url: str,
    company: str = "Entreprise",
    title: str = "Ingénieur IA & ML",
    headless: bool = False,
    auto_submit: bool = False,
    webhook_url: str = DISCORD_WEBHOOK_URL,
    custom_cover_letter: str = "",
    cv_pdf_path: Optional[str] = None,
) -> dict:
    """
    Exécute le cycle complet d'automatisation Playwright avec Human-in-the-Loop.
    """
    profile = load_profile()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filled_fields = []

    print("\n" + "=" * 70)
    print(f"🤖 Démarrage du Bot Navigateur Playwright pour {company}")
    print(f"🔗 URL Cible : {url}")
    print(f"👁️ Mode Affichage : {'Arrière-plan (Headless)' if headless else 'Visible (Fenêtre Chrome active)'}")
    print(f"🛡️ Validation Humaine : {'Désactivée (Auto-Submit)' if auto_submit else 'Activée (Screenshot Discord + Pause)'}")
    print("=" * 70)

    with sync_playwright() as p:
        # Lancement de Chromium avec résolution réaliste
        browser = p.chromium.launch(
            headless=headless,
            args=[
                "--start-maximized",
                "--disable-blink-features=AutomationControlled",
            ],
        )

        context = browser.new_context(
            viewport={"width": 1366, "height": 768},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        )

        page = context.new_page()

        # Étape 0 : S'assurer que le CV PDF existe
        if not cv_pdf_path or not os.path.exists(cv_pdf_path):
            cv_pdf_path = ensure_cv_pdf(page, profile)
        else:
            print(f"📎 [CV] Utilisation du CV PDF spécifié : {cv_pdf_path}")

        # Étape 1 : Navigation vers l'offre
        print(f"\n🌐 [1/5] Connexion à la page de candidature...")
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            time.sleep(2.0)
        except Exception as e:
            print(f"❌ Impossible de charger l'URL {url} : {e}")
            browser.close()
            return {"success": False, "error": f"Erreur de chargement : {e}"}

        # Étape 1b : Traitement proactif du bandeau cookies et de l'interstitiel "Vous quittez LinkedIn"
        try:
            # 1. Gestion des bandeaux de consentement cookies (LinkedIn, OneTrust, Cookiebot, etc.)
            for c_sel in [
                'button:has-text("Accepter")',
                'button:has-text("Accept")',
                'button:has-text("Tout accepter")',
                'button:has-text("Accept all")',
                '#onetrust-accept-btn-handler',
                'button#onetrust-accept-btn-handler',
                'button[action-type="ACCEPT"]',
                'button[data-control-name="ga-cookie-consent-accept"]',
                'button:has-text("Refuser")',
                'button:has-text("Reject")',
            ]:
                try:
                    c_btn = page.locator(c_sel).first
                    if c_btn.count() > 0 and c_btn.is_visible():
                        print("   🍪 [Cookies] Fermeture automatique du bandeau de consentement...")
                        c_btn.click(timeout=1500)
                        time.sleep(1.0)
                        break
                except Exception:
                    pass

            # 2. Détection de l'interstitiel LinkedIn "Vous quittez LinkedIn" / "externalApply"
            page_text = page.inner_text("body").lower() if page.locator("body").count() > 0 else ""
            if "quittez linkedin" in page_text or "leaving linkedin" in page_text or "externalapply" in page.url.lower():
                print("   🔄 [Interstitiel Détecté] Écran 'Vous quittez LinkedIn' affiché. Franchissement automatique...")
                dest_found = False
                ext_links = page.locator("a[href^='http']:not([href*='linkedin.com'])")
                if ext_links.count() > 0:
                    for i in range(ext_links.count()):
                        l = ext_links.nth(i)
                        href = l.get_attribute("href") or ""
                        if href and "linkedin.com" not in href:
                            print(f"   👉 [Lien Sortant Détecté] Navigation vers le portail recruteur : {href[:90]}...")
                            try:
                                page.goto(href, wait_until="domcontentloaded", timeout=45000)
                                time.sleep(3.0)
                                dest_found = True
                                break
                            except Exception as nav_e:
                                print(f"   ⚠️ Navigation directe ({nav_e}), clic sur le lien...")
                                l.click(timeout=3000)
                                time.sleep(3.0)
                                dest_found = True
                                break

                # Si non trouvé par le sélecteur ci-dessus, parcourir tous les liens http
                if not dest_found:
                    for l in page.locator("a[href]").all():
                        h = l.get_attribute("href") or ""
                        if h.startswith("http") and "linkedin.com" not in h:
                            print(f"   👉 [Lien Sortant Alternatif] Navigation vers : {h[:90]}...")
                            page.goto(h, wait_until="domcontentloaded", timeout=45000)
                            time.sleep(3.0)
                            break
        except Exception as inter_err:
            print(f"   ℹ️ [Interstitiel] Traitement de redirection : {inter_err}")

        # Étape 2 : Détection d'un bouton 'Postuler' intermédiaire
        print("🔍 [2/5] Détection du formulaire de postulation...")
        apply_buttons = [
            'a:has-text("Postuler")',
            'button:has-text("Postuler")',
            'a:has-text("Apply for this job")',
            'button:has-text("Apply for this job")',
            'a:has-text("Apply Now")',
            'button:has-text("Apply Now")',
            'a:has-text("Apply")',
            'button:has-text("Apply")',
        ]
        for sel in apply_buttons:
            try:
                loc = page.locator(sel).first
                if loc.count() > 0 and loc.is_visible():
                    print(f"   👉 Clic sur le bouton d'accès au formulaire : {sel}")
                    loc.click(timeout=3000)
                    time.sleep(2.0)
                    break
            except Exception:
                continue

        # Détection rapide de barrière de compte / mot de passe / captcha / Workday
        is_barrier = False
        barrier_reason = ""
        if page.locator('input[type="password"]').count() > 0:
            is_barrier = True
            barrier_reason = "Création de compte / Mot de passe obligatoire (Workday ou portail sécurisé)"
        elif page.locator('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], div.g-recaptcha, div.h-captcha').count() > 0:
            is_barrier = True
            barrier_reason = "Captcha tiers détecté"
        elif "create account" in (page.inner_text("body").lower() if page.locator("body").count() > 0 else ""):
            is_barrier = True
            barrier_reason = "Création de compte requise"

        if is_barrier:
            print(f"   ⚠️ [Garde-fou Détecté] {barrier_reason}. Envoi d'une alerte Discord pour finalisation en 1 clic...")
            barrier_screenshot = SCREENSHOTS_DIR / f"barrier_{clean_comp}_{timestamp}.png"
            try:
                page.screenshot(path=str(barrier_screenshot), full_page=True)
            except Exception:
                page.screenshot(path=str(barrier_screenshot), full_page=False)

            if webhook_url:
                try:
                    from app.linkedin_automation.discord_notifier import DiscordNotifier
                    dn = DiscordNotifier(webhook_url=webhook_url)
                    dn.notify_manual_action_required(
                        company=company,
                        title=title,
                        location="",
                        job_url=url,
                        portal_url=page.url,
                        reason=barrier_reason,
                        screenshot_path=str(barrier_screenshot),
                    )
                except Exception as de:
                    print(f"   ℹ️ Note Discord: {de}")

            browser.close()
            return {
                "success": False,
                "status": "action_manuelle_requise",
                "skipped": True,
                "error": barrier_reason,
                "portal_url": page.url,
                "screenshot": str(barrier_screenshot),
            }

        # Étape 3 : Remplissage automatique des champs de saisie
        print("\n✍️ [3/5] Remplissage automatique des coordonnées du candidat...")

        # Prénom
        fill_input(
            page,
            [
                'input[name*="first_name" i]',
                'input[name*="prenom" i]',
                'input[id*="first_name" i]',
                'input[placeholder*="prénom" i]',
                'input[placeholder*="first name" i]',
                'input[autocomplete="given-name"]',
            ],
            profile["first_name"],
            "Prénom",
            filled_fields,
        )

        # Nom
        fill_input(
            page,
            [
                'input[name*="last_name" i]',
                'input[name*="nom" i]:not([name*="prenom" i])',
                'input[id*="last_name" i]',
                'input[placeholder*="nom de famille" i]',
                'input[placeholder*="last name" i]',
                'input[autocomplete="family-name"]',
            ],
            profile["last_name"],
            "Nom",
            filled_fields,
        )

        # Nom complet (si un seul champ présent)
        if not any(f["label"] in ("Prénom", "Nom") for f in filled_fields):
            fill_input(
                page,
                [
                    'input[name*="full_name" i]',
                    'input[name="name"]',
                    'input[id*="name" i]:not([id*="first" i]):not([id*="last" i])',
                    'input[placeholder*="full name" i]',
                    'input[placeholder*="nom complet" i]',
                ],
                profile["full_name"],
                "Nom Complet",
                filled_fields,
            )

        # Email
        fill_input(
            page,
            [
                'input[type="email"]',
                'input[name*="email" i]',
                'input[id*="email" i]',
                'input[placeholder*="email" i]',
            ],
            profile["email"],
            "Email",
            filled_fields,
        )

        # Téléphone
        fill_input(
            page,
            [
                'input[type="tel"]',
                'input[name*="phone" i]',
                'input[name*="telephone" i]',
                'input[id*="phone" i]',
                'input[placeholder*="phone" i]',
                'input[placeholder*="téléphone" i]',
            ],
            profile["phone"],
            "Téléphone",
            filled_fields,
        )

        # Profil LinkedIn
        fill_input(
            page,
            [
                'input[name*="linkedin" i]',
                'input[id*="linkedin" i]',
                'input[placeholder*="linkedin" i]',
            ],
            profile["linkedin"],
            "LinkedIn",
            filled_fields,
        )

        # Profil GitHub / Portfolio
        fill_input(
            page,
            [
                'input[name*="github" i]',
                'input[name*="portfolio" i]',
                'input[name*="website" i]',
                'input[id*="github" i]',
                'input[placeholder*="github" i]',
            ],
            profile["github"],
            "GitHub",
            filled_fields,
        )

        # Ville / Localisation
        fill_input(
            page,
            [
                'input[name*="city" i]',
                'input[name*="location" i]',
                'input[placeholder*="city" i]',
                'input[placeholder*="ville" i]',
            ],
            "Calais, France (Mobilité Internationale)",
            "Localisation",
            filled_fields,
        )

        # Téléversement du CV PDF
        print("\n📎 Téléversement du CV PDF...")
        upload_resume_file(page, cv_pdf_path, filled_fields)

        # Lettre de motivation (si champ présent)
        cover_text = custom_cover_letter or f"Madame, Monsieur,\n\nActuellement en dernière année d'école d'ingénieurs à l'EILCO (Bac+5 spécialité IA & Machine Learning), je souhaite vivement rejoindre {company} pour mon stage de fin d'études. Mon parcours en Vision par Ordinateur et pipelines RAG est directement aligné avec vos défis techniques.\n\nRestant à votre entière disposition,\nBadroudine Bacar"
        fill_input(
            page,
            [
                'textarea[name*="cover_letter" i]',
                'textarea[name*="letter" i]',
                'textarea[name*="comments" i]',
                'textarea[placeholder*="motivation" i]',
                'textarea[placeholder*="cover letter" i]',
            ],
            cover_text,
            "Lettre de Motivation",
            filled_fields,
        )

        # Questions fréquentes (droit de travail, visa)
        answer_common_questions(page, filled_fields)

        # Pause courte pour laisser le formulaire se stabiliser
        time.sleep(2.0)

        # Étape 4 : Capture d'écran Pré-Envoi
        clean_comp = "".join(c for c in company if c.isalnum() or c in ("-", "_")).lower()
        screenshot_filename = f"pre_submit_{clean_comp}_{timestamp}.png"
        screenshot_path = SCREENSHOTS_DIR / screenshot_filename

        print(f"\n📸 [4/5] Capture d'écran haute résolution du formulaire pré-rempli...")
        try:
            page.screenshot(path=str(screenshot_path), full_page=True)
            print(f"   ✓ Capture enregistrée : {screenshot_path}")
        except Exception as e:
            print(f"   ⚠️ Capture d'écran réduite (viewport) : {e}")
            page.screenshot(path=str(screenshot_path), full_page=False)

        # Étape 5 : Rapport et Alerte Discord Webhook
        print(f"\n📲 [5/5] Transmission du rapport et de la capture sur Discord...")
        cv_filename = os.path.basename(str(cv_pdf_path)) if cv_pdf_path else "CV_Badroudine_Bacar.pdf"
        discord_sent = False
        if webhook_url:
            discord_sent = send_discord_hitl_report(
                webhook_url, company, title, url, screenshot_path, filled_fields, cv_filename=cv_filename
            )
            if discord_sent:
                print(f"   ✅ Notification envoyée sur Discord avec CV : {cv_filename}")
            else:
                print("   ⚠️ Échec de transmission du webhook Discord.")

        # =========================================================================
        # ARBITRAGE HUMAIN (HUMAN-IN-THE-LOOP) & INTERFACE OPÉRATEUR
        # =========================================================================
        decision = prompt_operator_decision(
            company=company,
            title=title,
            cv_filename=cv_filename,
            screenshot_path=screenshot_path,
            filled_count=len(filled_fields),
            auto_submit=auto_submit,
            countdown_seconds=5,
        )

        if decision == "manual":
            if webhook_url:
                try:
                    from app.linkedin_automation.discord_notifier import DiscordNotifier
                    dn = DiscordNotifier(webhook_url=webhook_url)
                    dn.notify_manual_action_required(
                        company=company,
                        title=title,
                        location="International",
                        job_url=url,
                        portal_url=url,
                        reason="Déplacé dans 'À faire moi-même' par décision de l'opérateur",
                        screenshot_path=str(screenshot_path),
                        cv_name=cv_filename,
                    )
                except Exception:
                    pass
            return {
                "success": False,
                "status": "a_finaliser_manuellement",
                "portal_url": url,
                "screenshot": str(screenshot_path),
                "cv_name": cv_filename,
                "error": "Basculé dans 'À faire moi-même' par l'utilisateur",
                "filled_fields": filled_fields,
            }

        if decision == "reject":
            return {
                "success": False,
                "status": "rejetee",
                "portal_url": url,
                "screenshot": str(screenshot_path),
                "cv_name": cv_filename,
                "error": "Opportunité rejetée par l'opérateur",
                "filled_fields": filled_fields,
            }

        if decision == "cancel":
            print("\n❌ Annulation de la soumission par l'utilisateur.")
            return {
                "success": False,
                "status": "annulee",
                "portal_url": url,
                "screenshot": str(screenshot_path),
                "cv_name": cv_filename,
                "error": "Annulation opérateur",
                "filled_fields": filled_fields,
            }

        should_submit = (decision == "submit")
        result_status = "valide_non_soumis"
        post_screenshot_path = None

        if should_submit:
            print("\n🚀 Clic sur le bouton de soumission finale...")
            submit_selectors = [
                'button[type="submit"]',
                'button:has-text("Submit Application")',
                'button:has-text("Submit application")',
                'button:has-text("Envoyer la candidature")',
                'button:has-text("Postuler")',
                'button:has-text("Soumettre")',
                'input[type="submit"]',
            ]
            submitted = False
            for sel in submit_selectors:
                try:
                    loc = page.locator(sel).first
                    if loc.count() > 0 and loc.is_visible():
                        print(f"   👉 Clic sur : {sel}")
                        loc.click(timeout=5000)
                        submitted = True
                        time.sleep(3.5)
                        break
                except Exception:
                    continue

            if submitted:
                result_status = "candidature_envoyee"
                post_screenshot_filename = f"post_submit_{clean_comp}_{timestamp}.png"
                post_screenshot_path = SCREENSHOTS_DIR / post_screenshot_filename
                try:
                    page.screenshot(path=str(post_screenshot_path), full_page=True)
                except Exception:
                    page.screenshot(path=str(post_screenshot_path), full_page=False)

                print(f"🎉 Candidature soumise avec succès pour {company} !")
                print(f"📸 Capture de confirmation : {post_screenshot_path}")

                # Notification Discord enrichie
                if webhook_url:
                    try:
                        from app.linkedin_automation.discord_notifier import DiscordNotifier
                        dn = DiscordNotifier(webhook_url=webhook_url)
                        dn.notify_application_success(
                            company=company,
                            title=title,
                            location="International",
                            job_url=url,
                            screenshot_path=str(post_screenshot_path),
                            cv_name=cv_filename,
                        )
                    except Exception:
                        pass
            else:
                fail_reason = "Bouton de soumission introuvable ou compte requis (action manuelle)"
                print(f"⚠️ {fail_reason}. Envoi de l'alerte Discord avec lien direct...")
                if webhook_url:
                    try:
                        from app.linkedin_automation.discord_notifier import DiscordNotifier
                        dn = DiscordNotifier(webhook_url=webhook_url)
                        dn.notify_manual_action_required(
                            company=company,
                            title=title,
                            location="",
                            job_url=url,
                            portal_url=page.url,
                            reason=fail_reason,
                            screenshot_path=str(screenshot_path),
                            cv_name=cv_filename,
                        )
                    except Exception as de:
                        print(f"   ℹ️ Note Discord: {de}")
                time.sleep(2)
        else:
            print(f"🛡️ Envoi annulé. La candidature n'a pas été soumise.")

        if not headless and not should_submit:
            print("💡 La fenêtre de navigation reste ouverte 10 secondes pour consultation...")
            time.sleep(10)

        browser.close()

        is_real_success = (result_status == "candidature_envoyee" and len(filled_fields) > 0)

        return {
            "success": is_real_success,
            "status": result_status if is_real_success else "action_manuelle_requise",
            "company": company,
            "title": title,
            "cv_name": cv_filename,
            "filled_fields": filled_fields,
            "screenshot": str(screenshot_path),
            "portal_url": page.url,
            "post_screenshot": str(post_screenshot_path) if post_screenshot_path else None,
            "error": None if is_real_success else "Candidature à finaliser manuellement sur le portail recruteur",
        }


def main():
    parser = argparse.ArgumentParser(description="ResumeSquad Playwright Browser Applicant")
    parser.add_argument("--url", type=str, required=True, help="URL de la page d'offre d'emploi")
    parser.add_argument("--company", type=str, default="Entreprise", help="Nom de l'entreprise")
    parser.add_argument("--title", type=str, default="Ingénieur IA & ML", help="Intitulé du poste")
    parser.add_argument("--headless", action="store_true", help="Lancer en arrière-plan sans ouvrir la fenêtre visible")
    parser.add_argument("--auto-submit", action="store_true", help="Soumettre directement sans attendre la validation humaine")
    parser.add_argument("--webhook", type=str, default=DISCORD_WEBHOOK_URL, help="URL du Webhook Discord")
    parser.add_argument("--cv-pdf", type=str, default="", help="Chemin du CV PDF personnalisé")
    parser.add_argument("--cover-letter-text", type=str, default="", help="Texte de la lettre de motivation")
    parser.add_argument("--cover-letter-file", type=str, default="", help="Chemin du fichier texte de la lettre de motivation")
    parser.add_argument("--output-json", type=str, default="", help="Chemin du fichier JSON de sortie")
    args = parser.parse_args()

    cover_text = args.cover_letter_text
    if args.cover_letter_file and os.path.exists(args.cover_letter_file):
        try:
            with open(args.cover_letter_file, "r", encoding="utf-8", errors="replace") as f:
                cover_text = f.read()
        except Exception as e:
            print(f"⚠️ Avertissement lecture fichier lettre: {e}")

    result = run_browser_applicant(
        url=args.url,
        company=args.company,
        title=args.title,
        headless=args.headless,
        auto_submit=args.auto_submit,
        webhook_url=args.webhook,
        custom_cover_letter=cover_text,
        cv_pdf_path=args.cv_pdf if args.cv_pdf else None,
    )

    if args.output_json:
        try:
            with open(args.output_json, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"⚠️ Avertissement écriture résultat JSON: {e}")


if __name__ == "__main__":
    main()
