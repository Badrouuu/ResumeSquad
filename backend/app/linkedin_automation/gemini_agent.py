"""
gemini_agent.py — Module d'inférence LLM & génération de CV / Lettres PDF ATS sur-mesure.

Fonctionnalités :
1. Inférence Gemini Flash-Lite (quota 500 req/jour) avec bascule automatique (failover).
2. Génération de CV 1-page A4 sur-mesure adapté à chaque offre (100% Anglais pour Europe/UE, ou Français si offre FR),
   avec numéro international (+33 7 67 56 07 86), statut Citoyen UE (sans visa), et disponibilité Mars 2027.
3. Génération de lettres de motivation pragmatiques et techniques, sans syntaxe Markdown brute (**).
4. Exportation PDF vectorielle propre via ReportLab compatible 100% ATS.
"""

import os
import re
import json
from pathlib import Path
from typing import Optional, Tuple, Dict, Any, List

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
    from reportlab.lib.pagesizes import A4, letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False


def _markdown_to_reportlab(text: str) -> str:
    """
    Convertit proprement le texte brut / Markdown en balises HTML sécurisées pour ReportLab.
    Élimine totalement les astérisques bruts (**) et les caractères HTML non échappés.
    """
    if not text:
        return ""
    # Suppression des titres Markdown ### et puces isolées
    cleaned = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)
    cleaned = cleaned.replace("`", "")
    # Échappement XML strict pour ReportLab
    cleaned = cleaned.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # Conversion **gras** -> <b>gras</b> et *italique* -> <i>italique</i>
    cleaned = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", cleaned)
    cleaned = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<i>\1</i>", cleaned)
    # Nettoyage de tout astérisque orphelin restant
    cleaned = cleaned.replace("**", "")
    return cleaned


class GeminiCoverLetterGenerator:
    """Générateur de CV PDF et lettres de motivation sur-mesure avec Gemini Flash-Lite."""

    FALLBACK_MODELS = [
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-flash-latest",
        "gemini-1.5-flash",
    ]

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        candidate_name: str = "Badroudine Bacar",
        candidate_school: str = "EILCO (École d'Ingénieurs du Littoral Côte d'Opale)",
        candidate_phone: str = "+33 7 67 56 07 86",
        candidate_email: str = "badroudinebacar@gmail.com",
    ):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.model_name = model_name or os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite") or "gemini-3.1-flash-lite"
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

        self.profile = self._load_profile()

        # Métriques de Quotas et Consommation de Tokens (100% Free Tier Google AI Studio)
        self.total_tokens_consumed = 0
        self.total_prompt_tokens = 0
        self.total_candidate_tokens = 0
        self.total_requests_made = 0
        self.last_quota_info: Dict[str, Any] = {}

    def _load_profile(self) -> Dict[str, Any]:
        """Charge le profil vérifié depuis backend/data/sample_profile.json."""
        profile_path = Path(__file__).resolve().parent.parent.parent / "data" / "sample_profile.json"
        if profile_path.exists():
            try:
                with open(profile_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

    def _call_gemini(self, prompt: str, json_mode: bool = False, temperature: float = 0.25) -> Optional[str]:
        """Appelle Gemini avec bascule automatique multi-modèles et comptabilisation des tokens."""
        if not self.api_key:
            return None

        if self.client:
            models_to_try = [self.model_name] + [m for m in self.FALLBACK_MODELS if m != self.model_name]
            for m in models_to_try:
                try:
                    cfg_kwargs: Dict[str, Any] = {
                        "temperature": temperature,
                        "max_output_tokens": 1400,
                    }
                    if json_mode:
                        cfg_kwargs["response_mime_type"] = "application/json"

                    response = self.client.models.generate_content(
                        model=m,
                        contents=prompt,
                        config=types.GenerateContentConfig(**cfg_kwargs),
                    )
                    text = (response.text or "").strip()
                    if not text:
                        continue

                    text = re.sub(r"^```(?:markdown|json)?\s*", "", text)
                    text = re.sub(r"\s*```$", "", text)

                    p_tok = getattr(response.usage_metadata, "prompt_token_count", 0) if hasattr(response, "usage_metadata") else 0
                    c_tok = getattr(response.usage_metadata, "candidates_token_count", 0) if hasattr(response, "usage_metadata") else 0
                    t_tok = getattr(response.usage_metadata, "total_token_count", 0) if hasattr(response, "usage_metadata") else (p_tok + c_tok)

                    self.total_prompt_tokens += p_tok
                    self.total_candidate_tokens += c_tok
                    self.total_tokens_consumed += t_tok
                    self.total_requests_made += 1

                    self.last_quota_info = {
                        "model": m,
                        "prompt_tokens": p_tok,
                        "candidate_tokens": c_tok,
                        "total_tokens": t_tok,
                        "session_total_tokens": self.total_tokens_consumed,
                        "requests_count": self.total_requests_made,
                        "cost_eur": "0.00 € (Free Tier)",
                    }
                    print(f"   📊 [Quota & Conso Tokens] Modèle: {m} | In: {p_tok} | Out: {c_tok} | Session: {self.total_tokens_consumed} tok | Coût: 0.00 €")
                    return text
                except Exception:
                    continue

        if HAS_LEGACY_GENAI:
            for m in self.FALLBACK_MODELS:
                try:
                    model = legacy_genai.GenerativeModel(
                        model_name=m,
                        generation_config={"temperature": temperature, "max_output_tokens": 1400},
                    )
                    response = model.generate_content(prompt)
                    text = (response.text or "").strip()
                    if text:
                        text = re.sub(r"^```(?:markdown|json)?\s*", "", text)
                        text = re.sub(r"\s*```$", "", text)
                        return text
                except Exception:
                    continue
        return None

    # =========================================================================
    # GÉNÉRATION DE CV SUR-MESURE ADAPTÉ À L'OFFRE (JSON + PDF A4 ATS)
    # =========================================================================

    def generate_tailored_cv_data(
        self,
        job_description: str,
        job_title: str,
        company: str,
        language: str = "en",
    ) -> Dict[str, Any]:
        """
        Adapte le résumé professionnel et sélectionne/ordonne les Top 3 projets vérifiés
        pour maximiser le score ATS de l'offre ciblée sans aucune hallucination.
        """
        lang_code = "fr" if language == "fr" else "en"
        fallback = self._fallback_cv_data(job_description, job_title, company, lang_code)

        if not self.api_key:
            return fallback

        lang_rule = (
            "Rédige intégralement en FRANÇAIS technique soigné."
            if lang_code == "fr"
            else "Write ENTIRELY in crisp, fluent engineering ENGLISH (zero French words)."
        )

        prompt = f"""Tu es l'ingénieur CV ATS de Badroudine Bacar.
Adapte STRICTEMENT le titre ciblé, le résumé professionnel (3 lignes max), et ordonne les 3 projets vérifiés les plus pertinents pour cette offre.
NE CHANGE JAMAIS les faits, dates, écoles, entreprises ou métriques. N'invente AUCUNE expérience.
Mots BANNIS : "Accomplished", "measured by", "significantly", "robust", "leveraged", "utilizing", "cutting-edge", "delve", "proven expertise".
{lang_rule}

POOL DE PROJETS VÉRIFIÉS (utilise uniquement ces noms exacts) :
1. "Antigravity — Autonomous LLM & RAG Pipeline" (2026 | Lead AI Engineer | Python, FastAPI, Google Gemini API, Pydantic v2, LaTeX, Docker)
2. "VectorWord / Guess-What — Semantic Search Engine" (2026 | Full-Stack & ML Engineer | Python, FastAPI, Gensim Word2Vec, NumPy, Docker, Supabase, Next.js 15, TypeScript)
3. "EILCO Project Management & Scheduling Platform (PIC)" (2026 | Backend & Database Engineer | SQL, Python, FastAPI, Pandas, PostgreSQL)
4. "Draw1 — Full-Stack Card Game Simulator" (2025 - 2026 | Software Engineer | C#, .NET Core, Entity Framework Core, SQLite, Angular, Godot)

OFFRE CIBLE :
Entreprise : {company}
Poste : {job_title}
Description :
{job_description[:2500]}

Renvoie STRICTEMENT un JSON valide avec cette structure exacte :
{{
  "tailoredTitle": "Titre exact adapté au poste (ex: Computer Vision & Edge AI Engineer Intern)",
  "tailoredSummary": "Résumé professionnel percutant de 2-3 phrases aligné sur les mots-clés exacts de l'offre (mentionner EILCO final-year AI engineering student, CPGE TSI, TOEIC 905/990 C1, availability March 2027 6-month internship).",
  "topProjectNames": ["Nom exact projet 1", "Nom exact projet 2", "Nom exact projet 3"]
}}"""

        raw_json = self._call_gemini(prompt, json_mode=True, temperature=0.2)
        if not raw_json:
            return fallback

        try:
            parsed = json.loads(raw_json)
            if isinstance(parsed, dict) and parsed.get("tailoredTitle") and parsed.get("tailoredSummary"):
                fallback["tailoredTitle"] = str(parsed["tailoredTitle"]).strip()[:110]
                fallback["tailoredSummary"] = str(parsed["tailoredSummary"]).strip()
                top_names = parsed.get("topProjectNames", [])
                if isinstance(top_names, list) and len(top_names) >= 2:
                    all_projs = {p["name"]: p for p in fallback["allProjects"]}
                    ordered = []
                    for n in top_names:
                        for k, v in all_projs.items():
                            if n.lower()[:12] in k.lower() and v not in ordered:
                                ordered.append(v)
                    for p in fallback["allProjects"]:
                        if len(ordered) < 3 and p not in ordered:
                            ordered.append(p)
                    if ordered:
                        fallback["projects"] = ordered[:3]
            return fallback
        except Exception:
            return fallback

    def _fallback_cv_data(
        self,
        job_description: str,
        job_title: str,
        company: str,
        language: str = "en",
    ) -> Dict[str, Any]:
        """Construit les données CV adaptées de façon déterministe à partir du profil vérifié."""
        desc_lower = f"{job_title} {job_description}".lower()
        is_vision = any(k in desc_lower for k in ("vision", "image", "opencv", "ocr", "edge", "camera", "sensor", "video"))
        is_se = any(k in desc_lower for k in ("full stack", "fullstack", "backend", "software engineer", ".net", "c#", "typescript", "react", "next"))
        is_data = any(k in desc_lower for k in ("data", "sql", "analytics", "pipeline", "etl"))

        if language == "fr":
            if is_vision:
                t_title = "Élève-Ingénieur IA & Vision par Ordinateur — Stage PFE (6 mois)"
            elif is_se:
                t_title = "Élève-Ingénieur Software & IA / Backend — Stage PFE (6 mois)"
            elif is_data:
                t_title = "Élève-Ingénieur Data & Machine Learning — Stage PFE (6 mois)"
            else:
                t_title = "Élève-Ingénieur Intelligence Artificielle & Machine Learning — Stage PFE (6 mois)"

            t_summary = (
                "Élève-ingénieur en dernière année à l'EILCO (spécialité IA & Data Science, issu de CPGE TSI), "
                "certifié TOEIC 905/990 (Niveau C1). Expérience concrète en conception de pipelines RAG/LLM, "
                "vision par ordinateur embarquée, APIs FastAPI et déploiement Docker. "
                "Disponible dès mars 2027 pour un stage PFE de 6 mois."
            )
            all_projects = [
                {
                    "name": "Antigravity — Pipeline Autonome LLM & RAG",
                    "role": "Lead AI Engineer",
                    "period": "2026",
                    "bullets": [
                        "Conception d'un pipeline automatisé de matching d'offres et de génération de documents sous Google Gemini API, schémas JSON stricts Pydantic v2 et Few-Shot Prompting.",
                        "Développement de couches d'extraction de contexte et de validation pour aligner précisément le profil technique sur les exigences ciblées sans hallucination.",
                    ],
                    "tech": "Python, FastAPI, Google Gemini API, Pydantic v2, LaTeX, Docker",
                },
                {
                    "name": "VectorWord / Guess-What — Moteur de Recherche Sémantique",
                    "role": "Full-Stack & ML Engineer",
                    "period": "2026",
                    "bullets": [
                        "Architecture d'un backend d'inférence FastAPI calculant la similarité cosinus sur des espaces vectoriels Word2Vec multilingues avec mise en cache mémoire (< 40ms).",
                        "Conteneurisation Docker et déploiement complet avec Next.js 15, TypeScript et Supabase pour la synchronisation d'état temps réel.",
                    ],
                    "tech": "Python, FastAPI, Gensim (Word2Vec), NumPy, Docker, Supabase, Next.js 15",
                },
                {
                    "name": "Plateforme de Planification & Gestion de Projets EILCO (PIC)",
                    "role": "Backend & Database Engineer",
                    "period": "2026",
                    "bullets": [
                        "Modélisation du schéma relationnel SQL/PostgreSQL et du pipeline d'ingestion Python/Pandas automatisant la planification des soutenances et l'export des notes.",
                    ],
                    "tech": "SQL, PostgreSQL, Python, FastAPI, Pandas",
                },
                {
                    "name": "Draw1 — Simulateur de Jeu Full-Stack & API REST",
                    "role": "Software Engineer",
                    "period": "2025 - 2026",
                    "bullets": [
                        "Développement d'une API RESTful en C# (.NET Core, Entity Framework Core, SQLite) avec documentation Swagger, interfacée avec un frontend Angular et un client Godot.",
                    ],
                    "tech": "C#, .NET Core, Entity Framework Core, SQLite, Angular, Godot",
                },
            ]
        else:
            if is_vision:
                t_title = "Computer Vision & AI Engineering Intern (6-Month MSc Thesis / PFE)"
            elif is_se:
                t_title = "Software & AI Engineering Intern (Python / Backend / Full-Stack)"
            elif is_data:
                t_title = "Data & Machine Learning Engineering Intern (6-Month MSc Internship)"
            else:
                t_title = "AI & Machine Learning Engineer Intern (6-Month MSc Internship)"

            t_summary = (
                "Final-year MSc Engineering student at EILCO specializing in Artificial Intelligence and Data Science "
                "(CPGE TSI Mathematics & Engineering foundation, TOEIC 905/990 CEFR C1). Experienced in building PyTorch ML/Vision models, "
                "LLM/RAG pipelines, high-throughput FastAPI microservices, and Docker deployments. "
                "EU Citizen available March 2027 for a 6-month end-of-studies internship."
            )
            all_projects = [
                {
                    "name": "Antigravity — Autonomous LLM & RAG Pipeline",
                    "role": "Lead AI Engineer",
                    "period": "2026",
                    "bullets": [
                        "Engineered an automated job-matching and document-generation pipeline using Google Gemini API, strict Pydantic v2 JSON schemas, and few-shot prompting to enforce zero-hallucination output.",
                        "Built automated validation and context-extraction layers to parse unstructured technical specifications and align candidate competencies against target requirements.",
                    ],
                    "tech": "Python, FastAPI, Google Gemini API, Pydantic v2, LaTeX, Docker",
                },
                {
                    "name": "VectorWord / Guess-What — Semantic Search Engine",
                    "role": "Full-Stack & ML Engineer",
                    "period": "2026",
                    "bullets": [
                        "Architected a FastAPI inference backend serving real-time cosine similarity queries across multilingual Word2Vec embeddings with in-memory model caching (< 40ms latency).",
                        "Containerized and deployed the full-stack application using Docker, Railway, Next.js 15, TypeScript, and Supabase for real-time state synchronization.",
                    ],
                    "tech": "Python, FastAPI, Gensim (Word2Vec), NumPy, Docker, Supabase, Next.js 15, TypeScript",
                },
                {
                    "name": "EILCO Project Management & Scheduling Platform (PIC)",
                    "role": "Backend & Database Engineer",
                    "period": "2026",
                    "bullets": [
                        "Designed the relational SQL/PostgreSQL database schema and Python/Pandas ingestion pipeline to parse academic records and automate defense scheduling and grade exports.",
                    ],
                    "tech": "SQL, PostgreSQL, Python, FastAPI, Pandas",
                },
                {
                    "name": "Draw1 — Full-Stack Card Game Simulator",
                    "role": "Software Engineer",
                    "period": "2025 - 2026",
                    "bullets": [
                        "Built a RESTful API in C# (.NET Core, Entity Framework Core, SQLite) with OpenAPI/Swagger documentation, integrated with an Angular frontend and Godot simulation client.",
                    ],
                    "tech": "C#, .NET Core, Entity Framework Core, SQLite, Angular, Godot",
                },
            ]

        if is_se:
            selected = [all_projects[1], all_projects[3], all_projects[0]]
        elif is_data:
            selected = [all_projects[2], all_projects[1], all_projects[0]]
        else:
            selected = [all_projects[0], all_projects[1], all_projects[2]]

        return {
            "tailoredTitle": t_title,
            "tailoredSummary": t_summary,
            "allProjects": all_projects,
            "projects": selected,
        }

    def export_tailored_cv_pdf(
        self,
        cv_data: Dict[str, Any],
        output_path: str,
        language: str = "en",
    ) -> str:
        """
        Compile un CV PDF vectoriel 1-page A4 complet, dense et compatible 100% ATS via ReportLab.
        Garantit : vrai numéro (+33 7 67 56 07 86), disponibilité Mars 2027, statut Citoyen UE (sans visa),
        et aucune page à moitié vide.
        """
        if not HAS_REPORTLAB:
            return output_path

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        is_fr = language == "fr"

        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=28,
            leftMargin=28,
            topMargin=22,
            bottomMargin=20,
        )

        styles = getSampleStyleSheet()
        navy = colors.HexColor("#1E3A8A")
        dark = colors.HexColor("#1F2937")
        muted = colors.HexColor("#4B5563")
        line_col = colors.HexColor("#CBD5E1")

        name_st = ParagraphStyle("Name", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=18, leading=21, textColor=navy, alignment=TA_CENTER, spaceAfter=2)
        role_st = ParagraphStyle("Role", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10.5, leading=13, textColor=dark, alignment=TA_CENTER, spaceAfter=2)
        avail_st = ParagraphStyle("Avail", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9, leading=11.5, textColor=navy, alignment=TA_CENTER, spaceAfter=3)
        contact_st = ParagraphStyle("Contact", parent=styles["Normal"], fontName="Helvetica", fontSize=8.5, leading=11, textColor=muted, alignment=TA_CENTER, spaceAfter=6)
        summary_st = ParagraphStyle("Summary", parent=styles["Normal"], fontName="Helvetica", fontSize=8.8, leading=11.8, textColor=dark, spaceAfter=4)
        sec_st = ParagraphStyle("Section", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10, leading=12, textColor=navy, spaceBefore=5, spaceAfter=2)
        item_head_st = ParagraphStyle("ItemHead", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9, leading=11.5, textColor=dark, spaceBefore=3, spaceAfter=1)
        item_sub_st = ParagraphStyle("ItemSub", parent=styles["Normal"], fontName="Helvetica-Oblique", fontSize=8.5, leading=11, textColor=muted, spaceAfter=1.5)
        bullet_st = ParagraphStyle("Bullet", parent=styles["Normal"], fontName="Helvetica", fontSize=8.5, leading=11.2, textColor=dark, leftIndent=10, firstLineIndent=-7, spaceAfter=1.5)
        skill_st = ParagraphStyle("Skill", parent=styles["Normal"], fontName="Helvetica", fontSize=8.5, leading=11.4, textColor=dark, spaceAfter=2)

        elements: List[Any] = []

        # --- EN-TÊTE ---
        elements.append(Paragraph(self.candidate_name.upper(), name_st))
        elements.append(Paragraph(_markdown_to_reportlab(cv_data.get("tailoredTitle", "AI & Machine Learning Engineer Intern")), role_st))

        if is_fr:
            avail_line = "Disponible Mars 2027 – Stage de Fin d'Études (PFE) 6 mois | Citoyen UE (Aucun Visa Requis) | Mobilité Europe & Suisse"
            contact_line = (
                f'France &nbsp;|&nbsp; <a href="tel:+33767560786" color="#1E3A8A">+33 7 67 56 07 86</a> &nbsp;|&nbsp; '
                f'<a href="mailto:{self.candidate_email}" color="#1E3A8A">{self.candidate_email}</a> &nbsp;|&nbsp; '
                f'<a href="https://www.linkedin.com/in/badroudine-bacar/" color="#1E3A8A">LinkedIn</a> &nbsp;|&nbsp; '
                f'<a href="https://github.com/Badrouuu" color="#1E3A8A">GitHub</a>'
            )
        else:
            avail_line = "Available March 2027 – 6-Month End-of-Studies Internship | EU Citizen (No Visa Sponsorship Required)"
            contact_line = (
                f'Open to Relocation (EU &amp; Switzerland) &nbsp;|&nbsp; '
                f'<a href="tel:+33767560786" color="#1E3A8A">+33 7 67 56 07 86</a> &nbsp;|&nbsp; '
                f'<a href="mailto:{self.candidate_email}" color="#1E3A8A">{self.candidate_email}</a> &nbsp;|&nbsp; '
                f'<a href="https://www.linkedin.com/in/badroudine-bacar/" color="#1E3A8A">LinkedIn</a> &nbsp;|&nbsp; '
                f'<a href="https://github.com/Badrouuu" color="#1E3A8A">GitHub</a>'
            )

        elements.append(Paragraph(avail_line, avail_st))
        elements.append(Paragraph(contact_line, contact_st))
        elements.append(HRFlowable(width="100%", thickness=1.0, color=navy, spaceBefore=0, spaceAfter=5))

        # --- RÉSUMÉ ---
        elements.append(Paragraph(_markdown_to_reportlab(cv_data.get("tailoredSummary", "")), summary_st))

        # --- COMPÉTENCES TECHNIQUES ---
        elements.append(Paragraph("COMPÉTENCES TECHNIQUES" if is_fr else "TECHNICAL SKILLS", sec_st))
        elements.append(HRFlowable(width="100%", thickness=0.6, color=line_col, spaceBefore=0, spaceAfter=3))
        if is_fr:
            elements.append(Paragraph("<b>IA &amp; Machine Learning :</b> PyTorch, TensorFlow Lite, Hugging Face, Computer Vision (OpenCV, OCR), RAG Pipelines, LLM Orchestration, Word2Vec / Gensim, Scikit-learn", skill_st))
            elements.append(Paragraph("<b>Langages &amp; Data :</b> Python, C#, TypeScript, SQL (PostgreSQL, SQLite), Dart, Bash, Pandas, NumPy", skill_st))
            elements.append(Paragraph("<b>Backend, Cloud &amp; DevOps :</b> FastAPI, .NET Core, Docker, GCP (Firestore, Cloud Functions), Supabase, Next.js 15, Git, CI/CD, Linux/WSL2", skill_st))
            elements.append(Paragraph("<b>Langues :</b> Français (Langue maternelle), Anglais (Courant C1 — TOEIC 905/990 certifié)", skill_st))
        else:
            elements.append(Paragraph("<b>AI &amp; Machine Learning:</b> PyTorch, TensorFlow Lite, Hugging Face, Computer Vision (OpenCV, ML Kit OCR), RAG Pipelines, LLM Orchestration, Word2Vec / Gensim, Scikit-learn", skill_st))
            elements.append(Paragraph("<b>Languages &amp; Data:</b> Python, C#, TypeScript, SQL (PostgreSQL, SQLite), Dart, Bash, Pandas, NumPy", skill_st))
            elements.append(Paragraph("<b>Backend, Cloud &amp; DevOps:</b> FastAPI, .NET Core, Docker, GCP (Firestore, Cloud Functions), Supabase, Next.js 15, Git, CI/CD, Linux/WSL2", skill_st))
            elements.append(Paragraph("<b>Languages:</b> English (Fluent C1 — Certified TOEIC 905/990), French (Native)", skill_st))

        # --- EXPÉRIENCE PROFESSIONNELLE ---
        elements.append(Paragraph("EXPÉRIENCE PROFESSIONNELLE" if is_fr else "PROFESSIONAL EXPERIENCE", sec_st))
        elements.append(HRFlowable(width="100%", thickness=0.6, color=line_col, spaceBefore=0, spaceAfter=3))
        if is_fr:
            elements.append(Paragraph("<b>Founder &amp; Lead Software Developer (Stage Entrepreneurial PÉPITE) — Étiquette Jaune</b> &nbsp;|&nbsp; Juin 2026 – Sept 2026", item_head_st))
            elements.append(Paragraph("Calais, France — Application mobile de vision par ordinateur et détection temps réel", item_sub_st))
            elements.append(Paragraph("• Conception de pipelines de Vision par Ordinateur embarqués (Google ML Kit OCR) pour l'extraction temps réel de prix et d'étiquettes sur mobile.", bullet_st))
            elements.append(Paragraph("• Architecture d'un backend serverless sur Google Cloud Firestore et Cloud Functions (TypeScript) avec intégration Stripe API et synchronisation temps réel.", bullet_st))
            elements.append(Paragraph("• <i>Technologies :</i> Flutter, Dart, Google ML Kit (OCR), Firebase, Cloud Functions (TypeScript), Stripe API, Git", bullet_st))
        else:
            elements.append(Paragraph("<b>Founder &amp; Lead Software Developer (Entrepreneurial Internship PÉPITE) — Étiquette Jaune</b> &nbsp;|&nbsp; Jun 2026 – Sep 2026", item_head_st))
            elements.append(Paragraph("Calais, France — On-Device Computer Vision &amp; Cloud Mobile Application", item_sub_st))
            elements.append(Paragraph("• Engineered on-device Computer Vision pipelines using Google ML Kit Text Recognition (OCR) for real-time product label and receipt extraction.", bullet_st))
            elements.append(Paragraph("• Architected a serverless backend on Google Cloud Firestore and Cloud Functions (TypeScript) with Stripe API integration and low-latency data synchronization.", bullet_st))
            elements.append(Paragraph("• <i>Technologies:</i> Flutter, Dart, Google ML Kit (OCR), Firebase, Cloud Functions (TypeScript), Stripe API, Git", bullet_st))

        # --- PROJETS TECHNIQUES SÉLECTIONNÉS ---
        elements.append(Paragraph("PROJETS D'INGÉNIERIE SÉLECTIONNÉS" if is_fr else "SELECTED TECHNICAL PROJECTS", sec_st))
        elements.append(HRFlowable(width="100%", thickness=0.6, color=line_col, spaceBefore=0, spaceAfter=3))

        for proj in cv_data.get("projects", [])[:3]:
            p_name = _markdown_to_reportlab(proj.get("name", ""))
            p_role = _markdown_to_reportlab(proj.get("role", ""))
            p_period = _markdown_to_reportlab(proj.get("period", "2026"))
            elements.append(Paragraph(f"<b>{p_name}</b> — <i>{p_role}</i> ({p_period})", item_head_st))
            for b in proj.get("bullets", []):
                elements.append(Paragraph(f"• {_markdown_to_reportlab(b)}", bullet_st))
            if proj.get("tech"):
                tech_lbl = "Technologies :" if is_fr else "Technologies:"
                elements.append(Paragraph(f"• <i>{tech_lbl}</i> {_markdown_to_reportlab(proj['tech'])}", bullet_st))

        # --- FORMATION & CERTIFICATIONS ---
        elements.append(Paragraph("FORMATION &amp; CERTIFICATIONS" if is_fr else "EDUCATION &amp; CERTIFICATIONS", sec_st))
        elements.append(HRFlowable(width="100%", thickness=0.6, color=line_col, spaceBefore=0, spaceAfter=3))
        if is_fr:
            elements.append(Paragraph("<b>Diplôme d'Ingénieur Informatique — Parcours Intelligence Artificielle (Bac+5 / MSc)</b> &nbsp;|&nbsp; 2024 – 2027", item_head_st))
            elements.append(Paragraph("EILCO (École d'Ingénieurs du Littoral Côte d'Opale), Calais — Modules : Deep Learning, Vision par Ordinateur, Machine Learning, MLOps, CI/CD.", skill_st))
            elements.append(Paragraph("<b>Classes Préparatoires aux Grandes Écoles (CPGE TSI)</b> &nbsp;|&nbsp; Lycée Antonin Artaud, Marseille &nbsp;|&nbsp; 2022 – 2024", item_head_st))
            elements.append(Paragraph("Formation intensive en Mathématiques approfondies, Physique appliquée, Sciences de l'Ingénieur et Algorithmique.", skill_st))
            elements.append(Paragraph("<b>Certification Anglais :</b> TOEIC Listening &amp; Reading — <b>905/990</b> (Niveau CECR C1 Courant)", skill_st))
        else:
            elements.append(Paragraph("<b>MSc / Engineering Degree in Computer Science — Artificial Intelligence Track</b> &nbsp;|&nbsp; 2024 – 2027", item_head_st))
            elements.append(Paragraph("EILCO (Graduate School of Engineering), France — Core coursework: Deep Learning, Computer Vision, Machine Learning, Software Architecture, MLOps, CI/CD.", skill_st))
            elements.append(Paragraph("<b>Intensive Engineering Preparatory Classes (CPGE TSI)</b> &nbsp;|&nbsp; Lycée Antonin Artaud, Marseille &nbsp;|&nbsp; 2022 – 2024", item_head_st))
            elements.append(Paragraph("Two-year intensive curriculum in Applied Mathematics, Physics, Control Engineering, and Algorithms.", skill_st))
            elements.append(Paragraph("<b>English Certification:</b> TOEIC Listening &amp; Reading — <b>905/990</b> (CEFR C1 Fluent)", skill_st))

        # --- CENTRES D'INTÉRÊT ---
        elements.append(Paragraph("ENGAGEMENT &amp; CENTRES D'INTÉRÊT" if is_fr else "INTERESTS &amp; COMMUNITY", sec_st))
        elements.append(HRFlowable(width="100%", thickness=0.6, color=line_col, spaceBefore=0, spaceAfter=3))
        if is_fr:
            elements.append(Paragraph("• <b>Modding &amp; Théorie des Jeux :</b> Modding de jeux vidéo (scripting, structures de données) et tournois compétitifs de jeux de cartes stratégiques.", bullet_st))
            elements.append(Paragraph("• <b>Engagement Associatif &amp; Secourisme :</b> Bénévole associatif et titulaire du certificat de secourisme PSC1.", bullet_st))
        else:
            elements.append(Paragraph("• <b>Game Modding &amp; Decision Theory:</b> Video game modding (gameplay scripting, data structures) and competitive strategy card games.", bullet_st))
            elements.append(Paragraph("• <b>Community Volunteering &amp; First Aid:</b> Active non-profit volunteer and certified in First Aid (PSC1 / Emergency Response).", bullet_st))

        doc.build(elements)
        return output_path

    # =========================================================================
    # GÉNÉRATION DE LETTRE DE MOTIVATION SANS MARKDOWN BRUT
    # =========================================================================

    def generate_cover_letter(
        self,
        job_description: str,
        job_title: str,
        company: str,
        language: str = "en",
    ) -> str:
        """
        Génère une lettre de motivation percutante, technique et pragmatique
        adaptée aux spécifications du poste via Gemini, en texte pur (0 Markdown brut).
        """
        lang_code = "fr" if language == "fr" else "en"
        if not self.api_key:
            print("⚠️ [Gemini] Clé API absente, utilisation du gabarit de secours.")
            return self._fallback_letter(job_title, company, lang_code)

        lang_instruction = (
            "Rédige la lettre en Français standard soigné."
            if lang_code == "fr"
            else "Write the ENTIRE cover letter in professional engineering English (zero French words)."
        )

        system_instruction = f"""Tu es un assistant expert en rédaction technique pour ingénieurs d'élite.
Ton objectif : Rédiger une lettre de motivation percutante, BRUTE, PRAGMATIQUE et HAUTEMENT TECHNIQUE pour Badroudine Bacar.

PROFIL DU CANDIDAT :
- Nom : {self.candidate_name}
- Formation : Élève-ingénieur en dernière année (Bac+5 / MSc) à {self.candidate_school}, spécialité Intelligence Artificielle & Data Science. Issu de CPGE TSI.
- Compétences phares vérifiées :
  * PyTorch, Hugging Face, Computer Vision (OpenCV, Google ML Kit OCR), RAG Pipelines & LLM Orchestration (Gemini API, Pydantic v2)
  * FastAPI, Docker, PostgreSQL, C# (.NET Core), TypeScript, Next.js
  * Expérience PÉPITE chez Étiquette Jaune (Jun–Sep 2026) : vision embarquée OCR + backend serverless GCP
- Statut : Citoyen de l'Union Européenne (aucun visa requis en UE) — TOEIC 905/990 (Niveau C1)
- Disponibilité : Stage de Fin d'Études (6 mois) dès Mars 2027.

CONSIGNES STRICTES DE RÉDACTION :
1. FORMATAGE STRICT : N'UTILISE AUCUNE SYNTAXE MARKDOWN (**gras**, *italique*, # titres, `code`). Écris uniquement en texte brut propre.
2. TON : Zéro bavardage, zéro flagornerie ("votre prestigieuse entreprise"), zéro formule creuse. Sois direct, concret, orienté résultats d'ingénierie.
3. STRUCTURE (Court et compact, 3 à 4 paragraphes) :
   - Objet : précis sur le poste et l'entreprise.
   - Paragraphe 1 : Accroche directe sur le poste et adéquation immédiate avec la stack technique de l'offre.
   - Paragraphe 2 : Réalisation technique concrète (Antigravity RAG/LLM, VectorWord FastAPI/Docker, ou Étiquette Jaune OCR) en lien direct avec la fiche de poste.
   - Paragraphe 3 : Disponibilité Mars 2027 pour 6 mois, statut Citoyen UE (sans visa), et appel à l'échange technique.
4. {lang_instruction}
5. NE METS PAS d'en-tête avec adresses fictives."""

        user_prompt = f"""OFFRE D'EMPLOI CIBLE :
Entreprise : {company}
Intitulé du poste : {job_title}
Description complète :
{job_description[:3000]}

Génère la lettre de motivation technique sur-mesure en texte brut sans astérisques Markdown."""

        letter_text = self._call_gemini(f"{system_instruction}\n\n{user_prompt}", json_mode=False, temperature=0.3)
        if letter_text:
            return letter_text.replace("**", "").strip()

        return self._fallback_letter(job_title, company, lang_code)

    def _fallback_letter(self, job_title: str, company: str, language: str) -> str:
        """Gabarit technique de secours en cas d'indisponibilité momentanée du LLM."""
        if language != "fr":
            return f"""Subject: Application for {job_title} – Badroudine Bacar

Dear Hiring Team at {company},

Currently completing my MSc in Engineering (Artificial Intelligence & Software Engineering) at EILCO (France) following intensive preparatory classes (CPGE TSI), I am applying for the {job_title} position at {company}. As an EU Citizen fluent in English (TOEIC 905/990, CEFR C1), I require no visa sponsorship and am available starting March 2027 for a 6-month end-of-studies internship.

My engineering background centers on building production-grade AI and backend systems:
- Designed Antigravity, an automated LLM & RAG pipeline utilizing Gemini API, strict Pydantic v2 validation, and Docker.
- Architected VectorWord, a low-latency (< 40ms) FastAPI semantic search engine powered by multilingual Word2Vec embeddings and deployed with Docker and TypeScript/Next.js.
- Engineered on-device Computer Vision (OCR) pipelines and serverless GCP backends during my entrepreneurial internship at Étiquette Jaune.

I would welcome the opportunity to discuss how my practical experience in machine learning, computer vision, and backend deployment aligns with {company}'s engineering roadmap.

Best regards,
{self.candidate_name}
{self.candidate_phone} • {self.candidate_email}"""
        else:
            return f"""Objet : Candidature au poste de {job_title} – Badroudine Bacar

Madame, Monsieur,

Actuellement en dernière année de cycle ingénieur (Bac+5) à l'EILCO, spécialité Intelligence Artificielle et Informatique, je vous adresse ma candidature pour le poste de {job_title} au sein de {company}. Disponible dès mars 2027 pour un stage de fin d'études (PFE) de 6 mois, je dispose du niveau C1 en anglais (TOEIC 905/990).

Mon socle technique s'articule autour de systèmes d'IA et d'ingénierie logicielle déployés en conditions réelles :
- Conception du pipeline Antigravity (LLM & RAG) sous API Gemini, validation Pydantic v2 et Docker.
- Architecture de VectorWord, un moteur de similarité sémantique sous FastAPI et Word2Vec (< 40ms de latence) conteneurisé avec Docker.
- Développement de pipelines de Vision par Ordinateur embarqués (OCR) et backend serverless GCP lors de mon stage PÉPITE chez Étiquette Jaune.

Je serais ravi d'échanger techniquement avec votre équipe sur vos défis actuels.

Cordialement,
{self.candidate_name}
{self.candidate_phone} • {self.candidate_email}"""

    def export_pdf(
        self,
        letter_text: str,
        job_title: str,
        company: str,
        output_dir: Optional[str] = None,
        language: str = "en",
    ) -> str:
        """
        Compile le texte de la lettre en un fichier PDF épuré, sans astérisques Markdown,
        dans la langue adaptée à l'offre via ReportLab.
        """
        output_dir = output_dir or str(
            Path(__file__).resolve().parent.parent.parent / "output"
        )
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        clean_comp = re.sub(r"[^a-zA-Z0-9_-]", "_", company)[:20]
        pdf_filename = f"Lettre_Motivation_{clean_comp}.pdf"
        pdf_path = os.path.join(output_dir, pdf_filename)

        if not HAS_REPORTLAB:
            txt_path = pdf_path.replace(".pdf", ".txt")
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(letter_text)
            return txt_path

        doc = SimpleDocTemplate(
            pdf_path,
            pagesize=A4,
            rightMargin=50,
            leftMargin=50,
            topMargin=48,
            bottomMargin=48,
        )

        styles = getSampleStyleSheet()
        normal_style = styles["Normal"]

        body_style = ParagraphStyle(
            "LetterBody",
            parent=normal_style,
            fontName="Helvetica",
            fontSize=10.2,
            leading=14.8,
            textColor=colors.HexColor("#18181b"),
            spaceAfter=11,
        )

        header_name_style = ParagraphStyle(
            "LetterHeaderName",
            parent=normal_style,
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=18,
            textColor=colors.HexColor("#1E3A8A"),
            spaceAfter=3,
        )

        header_sub_style = ParagraphStyle(
            "LetterHeaderSub",
            parent=normal_style,
            fontName="Helvetica",
            fontSize=9.2,
            leading=13,
            textColor=colors.HexColor("#475569"),
            spaceAfter=16,
        )

        elements = []
        elements.append(Paragraph(self.candidate_name, header_name_style))

        sub_txt = (
            f"Élève-Ingénieur IA (Bac+5) • EILCO | {self.candidate_phone} • {self.candidate_email}"
            if language == "fr"
            else f"AI &amp; ML MSc Engineering Student (EILCO) • EU Citizen | {self.candidate_phone} • {self.candidate_email}"
        )
        elements.append(Paragraph(sub_txt, header_sub_style))
        elements.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#CBD5E1"), spaceBefore=0, spaceAfter=14))

        paragraphs = [p.strip() for p in letter_text.split("\n\n") if p.strip()]
        for p in paragraphs:
            formatted_p = _markdown_to_reportlab(p).replace("\n", "<br/>")
            elements.append(Paragraph(formatted_p, body_style))

        doc.build(elements)
        print(f"📄 [PDF] Lettre de motivation générée ({language.upper()}) : {pdf_path}")
        return pdf_path
