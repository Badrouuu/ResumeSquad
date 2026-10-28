from typing import Optional, Dict, List
from pydantic import BaseModel, Field


# ─── 1. MODÈLES DU PROFIL CANDIDAT (ENTRÉE) ───────────────────────────────────

class EducationItem(BaseModel):
    institution: str
    location: Optional[str] = None
    degree: str
    period: str
    details: Optional[str] = None


class ExperienceItem(BaseModel):
    role: str
    company: str
    location: Optional[str] = None
    period: str
    description: Optional[str] = None
    highlights: List[str] = Field(default_factory=list)
    technologies: List[str] = Field(default_factory=list)


class ProjectItem(BaseModel):
    name: str
    role: Optional[str] = None
    period: Optional[str] = None
    link: Optional[str] = None
    description: Optional[str] = None
    highlights: List[str] = Field(default_factory=list)
    technologies: List[str] = Field(default_factory=list)


class CandidateBasics(BaseModel):
    name: str
    title: str
    target_roles: List[str] = Field(default_factory=list)
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    github: Optional[str] = None
    linkedin: Optional[str] = None
    summary: Optional[str] = None


class CandidateProfile(BaseModel):
    """Schéma complet représentant le profil source du candidat (ex: master_profile.json)."""
    basics: CandidateBasics
    education: List[EducationItem] = Field(default_factory=list)
    experience: List[ExperienceItem] = Field(default_factory=list)
    projects: List[ProjectItem] = Field(default_factory=list)
    skills: Dict[str, List[str]] = Field(default_factory=dict)


# ─── 2. ENTRÉE DE L'OFFRE D'EMPLOI ───────────────────────────────────────────

class JobPostingInput(BaseModel):
    raw_text: str = Field(..., min_length=20, description="Texte brut complet de l'offre d'emploi")
    company_name: Optional[str] = None
    job_title: Optional[str] = None


# ─── 3. SORTIE AGENT 1 : JOB PARSER ───────────────────────────────────────────

class JobAnalysis(BaseModel):
    """Extraction sémantique et ATS de l'offre d'emploi."""
    title: str = Field(..., description="Titre normalisé du poste")
    company: Optional[str] = Field(None, description="Nom de l'entreprise cible")
    seniority_level: str = Field(..., description="Niveau requis (ex: Stage PFE, Junior, Confirmé)")
    target_skills_hard: List[str] = Field(..., description="Compétences techniques indispensables (ex: PyTorch, Docker)")
    target_skills_soft: List[str] = Field(default_factory=list, description="Soft skills mentionnées")
    ats_critical_keywords: List[str] = Field(..., description="Mots-clés précis susceptibles d'être filtrés par un ATS")
    key_missions: List[str] = Field(..., description="Principales responsabilités du poste")
    tone_and_culture: str = Field(..., description="Style et culture d'entreprise (ex: R&D académique, startup rapide)")


# ─── 4. SORTIE AGENT 2 : STRATÉGISTE & MATCHING ───────────────────────────────

class MatchingStrategy(BaseModel):
    """Calcul d'alignement et priorisation du profil face à l'offre."""
    overall_match_score: int = Field(..., ge=0, le=100, description="Score d'adéquation global estimé (0-100)")
    matching_strengths: List[str] = Field(..., description="Points forts du profil à mettre en avant")
    missing_or_gap_skills: List[str] = Field(default_factory=list, description="Compétences de l'offre non couvertes")
    angle_of_attack: str = Field(..., description="Stratégie narrative pour convaincre le recruteur")
    prioritized_projects: List[str] = Field(..., description="Noms des projets du candidat à afficher en priorité")
    prioritized_experiences: List[str] = Field(..., description="Noms des expériences à valoriser")


# ─── 5. SORTIE AGENT 3 : TAILOR (RÉÉCRITURE CIBLÉE) ───────────────────────────

class ItemBullets(BaseModel):
    name: str = Field(..., description="Nom du projet ou de l'entreprise")
    bullets: List[str] = Field(..., description="Liste des puces d'impact réécrites au format STAR")


class SkillGroup(BaseModel):
    category_name: str = Field(..., description="Nom de la catégorie (ex: Machine Learning, Backend)")
    skills: List[str] = Field(..., description="Compétences techniques ordonnées par pertinence")


class TailoredResumeContent(BaseModel):
    """Contenu textuel réécrit et optimisé sans inventer d'expérience."""
    tailored_title: str = Field(..., description="Titre du CV adapté à l'offre")
    tailored_summary: str = Field(..., description="Accroche personnalisée (Pitch candidat)")
    tailored_project_bullets: List[ItemBullets] = Field(
        ..., description="Puces d'impact réécrites pour chaque projet"
    )
    tailored_experience_bullets: List[ItemBullets] = Field(
        ..., description="Puces d'impact réécrites pour chaque expérience"
    )
    highlighted_skills: List[SkillGroup] = Field(
        ..., description="Compétences réordonnées pour correspondre aux priorités de l'offre"
    )


# ─── 6. SORTIE AGENT 4 : CRITIC & ATS JUDGE ───────────────────────────────────

class AuditReport(BaseModel):
    """Évaluation critique de conformité ATS et vérification d'anti-hallucination."""
    ats_compatibility_score: int = Field(..., ge=0, le=100, description="Score ATS prédictif final (0-100)")
    pass_audit: bool = Field(..., description="True si le CV est prêt pour soumission sans risque")
    detected_hallucinations: List[str] = Field(
        default_factory=list, 
        description="Liste des faits ou technologies mentionnés qui n'existaient pas dans le profil source"
    )
    keyword_coverage_rate: float = Field(..., ge=0.0, le=1.0, description="Taux de couverture des mots-clés ATS")
    strengths: List[str] = Field(default_factory=list, description="Points forts de la version finale")
    actionable_feedback: List[str] = Field(default_factory=list, description="Recommandations d'amélioration")


# ─── 7. RÉSULTAT GLOBAL DU PIPELINE MULTI-AGENTS ──────────────────────────────

class PipelineResult(BaseModel):
    job_analysis: JobAnalysis
    strategy: MatchingStrategy
    tailored_resume: TailoredResumeContent
    audit: AuditReport
