"""
gemini_agent.py — Module d'inférence LLM avec Gemini 1.5 Flash (Étape 3).

Fonctionnalités :
1. Intégration de google-generativeai avec le modèle gemini-1.5-flash.
2. Prompt système strict : rédaction d'une lettre de motivation brute, pragmatique et technique.
3. Mise en valeur exclusive des compétences cibles : PyTorch, Docker, FastAPI, Computer Vision & MLOps.
4. Exportation automatique en PDF prêt à l'emploi pour l'upload LinkedIn.
"""

import os
import re
from pathlib import Path
from typing import Optional, Tuple

import warnings
warnings.filterwarnings("ignore", category=FutureWarning)

try:
    from google import genai
    from google.genai import types
    HAS_GOOGLE_GENAI = True
except ImportError:
    HAS_GOOGLE_GENAI = False

HAS_LEGACY_GENAI = False
if not HAS_GOOGLE_GENAI:
    try:
        import google.generativeai as legacy_genai
        HAS_LEGACY_GENAI = True
    except ImportError:
        pass

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False


class GeminiCoverLetterGenerator:
    """Générateur de lettres de motivation ultra-ciblées avec Gemini 1.5 Flash / Flash Lite."""

    FALLBACK_MODELS = [
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-flash-latest",
        "gemini-2.5-flash",
        "gemini-1.5-flash",
    ]

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        candidate_name: str = "Badroudine Bacar",
        candidate_school: str = "EILCO (École d'Ingénieurs du Littoral Côte d'Opale)",
        candidate_phone: str = "07 67 56 07 86",
        candidate_email: str = "badroudinebacar@gmail.com",
    ):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.model_name = model_name or "gemini-3.5-flash-lite"
        self.candidate_name = candidate_name
        self.candidate_school = candidate_school
        self.candidate_phone = candidate_phone
        self.candidate_email = candidate_email

        if not self.api_key:
            env_file = Path(__file__).resolve().parent.parent.parent / ".env"
            if env_file.exists():
                with open(env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.startswith("GEMINI_API_KEY="):
                            self.api_key = line.strip().split("=", 1)[1].strip("'\"")
                            break

        self.client = None
        if HAS_GOOGLE_GENAI and self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"⚠️ [Gemini] Client genai non initialisé: {e}")

        if HAS_LEGACY_GENAI and self.api_key:
            try:
                legacy_genai.configure(api_key=self.api_key)
            except Exception:
                pass

    def generate_cover_letter(
        self,
        job_description: str,
        job_title: str,
        company: str,
        language: str = "fr"
    ) -> str:
        """
        Génère une lettre de motivation percutante, technique et pragmatique
        adaptée aux spécifications du poste via Gemini.
        """
        if not self.api_key:
            print("⚠️ [Gemini] Clé API absente, utilisation du gabarit de secours.")
            return self._fallback_letter(job_title, company, language)

        lang_instruction = (
            "Rédige la lettre en Français standard soigné."
            if language == "fr"
            else "Write the cover letter in professional English."
        )

        system_instruction = f"""Tu es un assistant expert en rédaction technique pour ingénieurs d'élite.
Ton objectif : Rédiger une lettre de motivation percutante, BRUTE, PRAGMATIQUE et HAUTEMENT TECHNIQUE pour Badroudine Bacar.

PROFIL DU CANDIDAT :
- Nom : {self.candidate_name}
- Formation : Élève-ingénieur en dernière année (Bac+5 / PFE) à {self.candidate_school}, spécialité Intelligence Artificielle & Data Science. Issu de CPGE TSI.
- Compétences phares à mettre en avant impérativement :
  * PyTorch (conception, entraînement et fine-tuning de réseaux profonds, Vision/NLP)
  * Docker (conteneurisation, environnements reproductibles, architectures de microservices)
  * FastAPI (développement d'APIs asynchrones haute performance pour le serving de modèles)
  * Computer Vision (OpenCV, YOLO, segmentation temps réel, edge AI)
  * MLOps & Déploiement (pipelines CI/CD, optimisation de latence d'inférence)
- TOEIC : 905/990 (Niveau C1 certifié - travail fluide en environnement international)
- Disponibilité : Stage de Fin d'Études (PFE) de 6 mois dès mars/avril 2027.

CONSIGNES STRICTES DE RÉDACTION :
1. TON : Zéro bavardage, zéro flagornerie ("votre prestigieuse entreprise"), zéro formule creuse type "je me permets de vous contacter". Sois direct, concret, orienté résultats d'ingénierie.
2. STRUCTURE (Court et compact, 3 à 4 paragraphes) :
   - Paragraphe 1 : Accroche directe sur le poste et adéquation immédiate avec la stack technique de l'offre.
   - Paragraphe 2 : Réalisation technique concrète démontrant la maîtrise de PyTorch et des architectures de modèles (ex: pipeline de traitement d'images ou NLP haute performance).
   - Paragraphe 3 : Réalisation concrète de déploiement démontrant la maîtrise de FastAPI, Docker et de l'ingénierie logicielle robuste.
   - Paragraphe 4 : Disponibilité pour le stage PFE de 6 mois et appel à l'échange technique.
3. {lang_instruction}
4. NE METS PAS d'en-tête de lettre avec adresses fictives, commence directement par l'objet puis le corps de la lettre.
"""

        user_prompt = f"""OFFRE D'EMPLOI CIBLE :
Entreprise : {company}
Intitulé du poste : {job_title}
Description complète :
{job_description[:3000]}

Génère la lettre de motivation technique sur-mesure pour ce poste."""

        # 1. Tentative avec le client officiel modern google.genai
        if self.client:
            models_to_try = [self.model_name] + [m for m in self.FALLBACK_MODELS if m != self.model_name]
            for m in models_to_try:
                try:
                    response = self.client.models.generate_content(
                        model=m,
                        contents=f"{system_instruction}\n\n{user_prompt}",
                        config=types.GenerateContentConfig(temperature=0.3, max_output_tokens=1024)
                    )
                    letter_text = response.text.strip()
                    letter_text = re.sub(r"^```markdown\s*", "", letter_text)
                    letter_text = re.sub(r"^```\s*", "", letter_text)
                    letter_text = re.sub(r"\s*```$", "", letter_text)
                    return letter_text
                except Exception as e:
                    continue

        # 2. Tentative avec legacy google.generativeai
        if HAS_LEGACY_GENAI:
            for m in self.FALLBACK_MODELS:
                try:
                    model = legacy_genai.GenerativeModel(
                        model_name=m,
                        system_instruction=system_instruction,
                        generation_config={"temperature": 0.3, "max_output_tokens": 1024}
                    )
                    response = model.generate_content(user_prompt)
                    letter_text = response.text.strip()
                    letter_text = re.sub(r"^```markdown\s*", "", letter_text)
                    letter_text = re.sub(r"^```\s*", "", letter_text)
                    letter_text = re.sub(r"\s*```$", "", letter_text)
                    return letter_text
                except Exception:
                    continue

        # 3. Repli sur le gabarit technique en cas d'indisponibilité
        return self._fallback_letter(job_title, company, language)

    def _fallback_letter(self, job_title: str, company: str, language: str) -> str:
        """Gabarit technique de secours en cas d'indisponibilité momentanée du LLM."""
        if language == "en":
            return f"""Subject: Application for {job_title} – Badroudine Bacar

Dear Hiring Team at {company},

Currently completing my Master of Science in Artificial Intelligence and Software Engineering at EILCO (Bac+5), I am applying for the {job_title} position.

My technical expertise centers on building end-to-end Machine Learning pipelines with PyTorch, containerizing microservices via Docker, and exposing low-latency inference endpoints with FastAPI. Through production projects and research prototypes, I have developed deep learning models for spatial perception and NLP, optimizing tensor operations and ensuring scalable deployments.

Proficient in both English (TOEIC 905/990, C1) and French, I am available for a 6-month end-of-studies internship starting March/April 2027. I would welcome the opportunity to discuss how my engineering skills align with {company}'s roadmap.

Best regards,
{self.candidate_name}
{self.candidate_phone} • {self.candidate_email}"""
        else:
            return f"""Objet : Candidature au poste de {job_title} – Badroudine Bacar

Madame, Monsieur,

Actuellement en dernière année de cycle ingénieur (Bac+5) à l'EILCO, spécialité Intelligence Artificielle et Informatique, je vous adresse ma candidature pour le poste de {job_title} au sein de {company}.

Mon socle technique est centré sur le développement de modèles d'apprentissage profond avec PyTorch, l'industrialisation logicielle sous Docker et le déploiement d'APIs performantes avec FastAPI. J'ai notamment conçu des architectures complètes intégrant de la vision par ordinateur et du NLP, en veillant à la reproductibilité des environnements et à la minimisation des temps d'inférence.

Disponible dès mars/avril 2027 pour un stage de fin d'études (PFE) de 6 mois, je serais ravi d'échanger techniquement avec votre équipe sur vos défis actuels.

Cordialement,
{self.candidate_name}
{self.candidate_phone} • {self.candidate_email}"""

    def export_pdf(
        self,
        letter_text: str,
        job_title: str,
        company: str,
        output_dir: Optional[str] = None
    ) -> str:
        """
        Compile le texte de la lettre en un fichier PDF épuré et professionnel via ReportLab.
        Renvoie le chemin absolu du fichier PDF généré.
        """
        output_dir = output_dir or str(
            Path(__file__).resolve().parent.parent.parent / "output"
        )
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        clean_comp = re.sub(r"[^a-zA-Z0-9_-]", "_", company)[:20]
        pdf_filename = f"Lettre_Motivation_{clean_comp}.pdf"
        pdf_path = os.path.join(output_dir, pdf_filename)

        if not HAS_REPORTLAB:
            # Fallback en fichier texte si ReportLab n'est pas disponible
            txt_path = pdf_path.replace(".pdf", ".txt")
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(letter_text)
            return txt_path

        doc = SimpleDocTemplate(
            pdf_path,
            pagesize=letter,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54,
        )

        styles = getSampleStyleSheet()
        normal_style = styles["Normal"]

        body_style = ParagraphStyle(
            "LetterBody",
            parent=normal_style,
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor("#18181b"),
            spaceAfter=12,
        )

        header_name_style = ParagraphStyle(
            "LetterHeaderName",
            parent=normal_style,
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=18,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=3,
        )

        header_sub_style = ParagraphStyle(
            "LetterHeaderSub",
            parent=normal_style,
            fontName="Helvetica",
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor("#475569"),
            spaceAfter=18,
        )

        elements = []

        # En-tête candidat
        elements.append(Paragraph(self.candidate_name, header_name_style))
        elements.append(
            Paragraph(
                f"Élève-Ingénieur IA (Bac+5) • EILCO | {self.candidate_phone} • {self.candidate_email}",
                header_sub_style,
            )
        )
        elements.append(Spacer(1, 10))

        # Corps de la lettre (paragraphes séparés par sauts de ligne)
        paragraphs = [p.strip() for p in letter_text.split("\n\n") if p.strip()]
        for p in paragraphs:
            # Remplacement des simples sauts de ligne par des balises <br/>
            formatted_p = p.replace("\n", "<br/>")
            elements.append(Paragraph(formatted_p, body_style))

        doc.build(elements)
        print(f"📄 [PDF] Lettre de motivation générée avec succès : {pdf_path}")
        return pdf_path
