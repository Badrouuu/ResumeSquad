import json
from pathlib import Path
import pytest
from app.models.schemas import CandidateProfile, JobAnalysis, MatchingStrategy, TailoredResumeContent, AuditReport


def test_master_profile_schema_validation():
    """Vérifie que le profil respecte parfaitement le schéma Pydantic v2."""
    local_sample = Path(__file__).resolve().parent.parent / "data" / "sample_profile.json"
    external_profile = Path(__file__).resolve().parent.parent.parent.parent / "Candidature" / "data" / "master_profile.json"
    
    profile_path = local_sample if local_sample.exists() else external_profile
    assert profile_path.exists(), f"Aucun profil trouvé à {profile_path}"
    
    with open(profile_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    profile = CandidateProfile.model_validate(data)
    assert profile.basics.name is not None
    assert len(profile.education) > 0
    assert len(profile.experience) > 0
    assert len(profile.projects) > 0
    assert "machine_learning_ai" in profile.skills


def test_audit_report_schema():
    """Vérifie les contraintes de types du rapport d'audit."""
    report = AuditReport(
        ats_compatibility_score=92,
        pass_audit=True,
        detected_hallucinations=[],
        keyword_coverage_rate=0.88,
        strengths=["Excellente adéquation PyTorch et NLP"],
        actionable_feedback=["Ajouter une métrique chiffrée sur le projet Flutter"]
    )
    assert report.ats_compatibility_score == 92
    assert report.pass_audit is True
    assert report.keyword_coverage_rate <= 1.0


def test_job_analysis_schema():
    """Vérifie la robustesse du schéma d'analyse d'offre d'emploi."""
    job = JobAnalysis(
        title="ML Engineer",
        required_hard_skills=["PyTorch", "FastAPI"],
        required_soft_skills=["Autonomie"],
        key_missions=["Développer des modèles NLP"],
        ats_critical_keywords=["PyTorch", "FastAPI", "Transformers"]
    )
    assert job.title == "ML Engineer"
    assert len(job.required_hard_skills) == 2
    assert "Transformers" in job.ats_critical_keywords
