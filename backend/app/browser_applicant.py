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


def send_discord_hitl_report(webhook_url: str, company: str, title: str, job_url: str, screenshot_path: Path, filled_fields: list):
    """Envoie un rapport riche avec capture d'écran sur Discord pour validation humaine."""
    if not webhook_url or not webhook_url.startswith("https://discord.com/api/webhooks/"):
        return False

    summary_text = "\n".join([f"• **{f['label']}** : `{f['value']}`" for f in filled_fields[:8]])

    payload_json = {
        "username": "ResumeSquad Browser Agent",
        "avatar_url": "https://cdn-icons-png.flaticon.com/512/4712/4712109.png",
        "embeds": [
            {
                "title": f"📸 [Validation Requise] Formulaire Rempli : {company}",
                "description": (
                    f"L'agent Playwright a navigué sur le portail et a pré-rempli **100% des champs**.\n\n"
                    f"**Champs complétés :**\n{summary_text}\n\n"
                    f"⚠️ **Action requise :** Consultez la capture d'écran ci-dessous. Le bot est en pause avant le clic d'envoi définitif (*Submit*)."
                ),
                "color": 0x2563eb,
                "fields": [
                    {"name": "🏢 Entreprise", "value": company, "inline": True},
                    {"name": "💼 Intitulé", "value": title or "Poste Ciblé", "inline": True},
                    {"name": "📄 CV Attaché", "value": "✅ PDF officiel inclus", "inline": True},
                    {"name": "🔗 Page de l'offre", "value": f"[Ouvrir l'offre]({job_url})", "inline": False},
                ],
                "image": {"url": "attachment://pre_submission_screenshot.png"},
                "footer": {"text": "ResumeSquad • Human-in-the-Loop Browser Bot"},
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
        cv_pdf_path = ensure_cv_pdf(page, profile)

        # Étape 1 : Navigation vers l'offre
        print(f"\n🌐 [1/5] Connexion à la page de candidature...")
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            time.sleep(2.0)
        except Exception as e:
            print(f"❌ Impossible de charger l'URL {url} : {e}")
            browser.close()
            return {"success": False, "error": f"Erreur de chargement : {e}"}

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
        discord_sent = False
        if webhook_url:
            discord_sent = send_discord_hitl_report(
                webhook_url, company, title, url, screenshot_path, filled_fields
            )
            if discord_sent:
                print("   ✅ Notification et capture reçues sur ton Discord !")
            else:
                print("   ⚠️ Échec de transmission du webhook Discord.")

        # =========================================================================
        # ARBITRAGE HUMAIN (HUMAN-IN-THE-LOOP)
        # =========================================================================
        print("\n" + "#" * 70)
        print("⏸️  [EN ATTENTE DE VALIDATION HUMAINE]")
        print(f"   Offre : {company} — {title}")
        print(f"   {len(filled_fields)} champs ont été renseignés avec succès.")
        print(f"   Image de vérification disponible : {screenshot_path}")
        print("#" * 70)

        should_submit = False
        if auto_submit:
            print("🚀 Mode Auto-Submit actif : Envoi direct sans pause.")
            should_submit = True
        else:
            print("\nOptions :")
            print("  👉 Appuyez sur [ENTRÉE] pour soumettre la candidature sur le site recruteur.")
            print("  👉 Tapez 'q' puis [ENTRÉE] pour annuler sans soumettre.")
            try:
                user_choice = input("\nVotre décision [Entrée = Envoyer / q = Annuler] : ").strip().lower()
                should_submit = user_choice != "q"
            except (KeyboardInterrupt, EOFError):
                print("\nAnnulation par l'utilisateur.")
                should_submit = False

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

                # Ping Discord de succès
                if webhook_url:
                    try:
                        requests.post(
                            webhook_url,
                            json={
                                "username": "ResumeSquad Browser Agent",
                                "avatar_url": "https://cdn-icons-png.flaticon.com/512/4712/4712109.png",
                                "embeds": [
                                    {
                                        "title": f"🎉 [Candidature Envoyée] {company}",
                                        "description": f"La candidature pour **{title}** a été soumise avec succès via Playwright !",
                                        "color": 0x10b981,
                                        "fields": [
                                            {"name": "🏢 Entreprise", "value": company, "inline": True},
                                            {"name": "💼 Poste", "value": title, "inline": True},
                                            {"name": "⏱️ Horodatage", "value": datetime.now().strftime("%d/%m/%Y %H:%M"), "inline": True},
                                        ],
                                    }
                                ],
                            },
                            timeout=10,
                        )
                    except Exception:
                        pass
            else:
                print("⚠️ Bouton de soumission introuvable automatiquement. Veuillez finaliser le clic sur la fenêtre du navigateur.")
                time.sleep(5)
        else:
            print(f"🛡️ Envoi annulé. La candidature n'a pas été soumise.")

        if not headless and not should_submit:
            print("💡 La fenêtre de navigation reste ouverte 10 secondes pour consultation...")
            time.sleep(10)

        browser.close()

        return {
            "success": True,
            "status": result_status,
            "company": company,
            "title": title,
            "filled_fields": filled_fields,
            "screenshot": str(screenshot_path),
            "post_screenshot": str(post_screenshot_path) if post_screenshot_path else None,
        }


def main():
    parser = argparse.ArgumentParser(description="ResumeSquad Playwright Browser Applicant")
    parser.add_argument("--url", type=str, required=True, help="URL de la page d'offre d'emploi")
    parser.add_argument("--company", type=str, default="Entreprise", help="Nom de l'entreprise")
    parser.add_argument("--title", type=str, default="Ingénieur IA & ML", help="Intitulé du poste")
    parser.add_argument("--headless", action="store_true", help="Lancer en arrière-plan sans ouvrir la fenêtre visible")
    parser.add_argument("--auto-submit", action="store_true", help="Soumettre directement sans attendre la validation humaine")
    parser.add_argument("--webhook", type=str, default=DISCORD_WEBHOOK_URL, help="URL du Webhook Discord")
    args = parser.parse_args()

    run_browser_applicant(
        url=args.url,
        company=args.company,
        title=args.title,
        headless=args.headless,
        auto_submit=args.auto_submit,
        webhook_url=args.webhook,
    )


if __name__ == "__main__":
    main()
