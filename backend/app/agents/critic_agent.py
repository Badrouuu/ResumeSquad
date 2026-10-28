from app.core.llm import LLMClient
from app.models.schemas import CandidateProfile, JobAnalysis, TailoredResumeContent, AuditReport


CRITIC_SYSTEM_PROMPT = """
Tu es un auditeur impartial et impitoyable de CV techniques et un simulateur d'algorithme ATS d'entreprise du CAC40 / FAANG.
Ton rôle est de scruter minutieusement le CV réécrit face au profil source et face à l'offre.

TÂCHES CRITIQUES :
1. CHASSE AUX HALLUCINATIONS : Compare le CV réécrit avec le profil original. Si le Tailor a inventé une compétence non mentionnée dans le profil source (ex: dire que le candidat maîtrise Kubernetes alors que ce n'est nulle part dans son profil original), liste-la immédiatement dans 'detected_hallucinations'.
2. COUVERTURE ATS : Calcule le taux de présence des 'ats_critical_keywords' de l'offre dans le CV réécrit (ratio entre 0.0 et 1.0).
3. ATTRIBUTION DU SCORE ATS : Attribue une note réaliste de 0 à 100 basée sur la pertinence et la densité de mots-clés.
4. VALIDATION : Passe pass_audit=True SEULEMENT si detected_hallucinations est vide ET si ats_compatibility_score >= 80.
5. FEEDBACK : Formule des recommandations concrètes et constructives.
"""

class CriticAgent:
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    async def run(
        self,
        original_profile: CandidateProfile,
        job_analysis: JobAnalysis,
        tailored_resume: TailoredResumeContent
    ) -> AuditReport:
        original_json = original_profile.model_dump_json(indent=2)
        job_json = job_analysis.model_dump_json(indent=2)
        tailored_json = tailored_resume.model_dump_json(indent=2)

        prompt = f"""
        PROFIL SOURCE ORIGINAL (VÉRITÉ DE TERRAIN) :
        {original_json}

        EXIGENCES ET MOTS-CLÉS ATS DE L'OFFRE :
        {job_json}

        PROPOSITION DE CV RÉÉCRITE PAR LE TAILOR :
        {tailored_json}

        Effectue l'audit de conformité, de véracité et le scoring ATS selon le schéma JSON.
        """
        return await self.llm.generate_structured(
            prompt=prompt,
            response_schema=AuditReport,
            system_instruction=CRITIC_SYSTEM_PROMPT,
            temperature=0.1
        )
