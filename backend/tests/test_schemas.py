import json
from pathlib import Path
import pytest
from app.models.schemas import CandidateProfile, JobAnalysis, MatchingStrategy, TailoredResumeContent, AuditReport


def test_master_profile_schema_validation():
    """Vérifie que le master_profile.json réel du projet Candidature respecte parfaitement le schéma Pydantic."""
    profile_path = Path(__file__).resolve().parent.parent.parent.parent / "Candidature" / "data" / "master_profile.json"
    
    assert profile_path.exists(), f"Fichier non trouvé à {profile_path}"
    
    with open(profile_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    profile = CandidateProfile.model_validate(data)
    assert profile.basics.name == "Badroudine Bacar"
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
