from app.core.llm import LLMClient
from app.models.schemas import CandidateProfile, JobAnalysis, MatchingStrategy, TailoredResumeContent


TAILOR_SYSTEM_PROMPT = """
Tu es un rédacteur d'élite de CV pour ingénieurs tech de haut niveau.
Ton rôle est de réécrire les puces d'impact et l'accroche d'un candidat pour maximiser sa compatibilité ATS et captiver le Lead Dev.

RÈGLES D'OR ABSOLUES (ANTI-HALLUCINATION) :
1. Tu ne dois JAMAIS inventer une technologie, un diplôme, une date ou une entreprise que le candidat n'a pas réellement vécue.
2. Tu dois réorienter le VOCABULAIRE et l'ORDRE des arguments en utilisant les mots-clés ATS de l'offre (ex: remplacer 'création d'un système de vecteurs' par 'implémentation d'espaces vectoriels Word2Vec et calculs de similarité cosinus').
3. Formule chaque puce d'impact selon la formule Google XYZ : "Accompli [X] mesuré par [Y], en faisant [Z]".
4. Rédige un titre de CV percutant et une accroche (summary) personnalisée à l'offre.
5. Renvoie pour chaque projet et expérience la liste des puces optimisées (avec le nom exact du projet ou de l'entreprise).
"""

class TailorAgent:
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    async def run(
        self,
        profile: CandidateProfile,
        job_analysis: JobAnalysis,
        strategy: MatchingStrategy
    ) -> TailoredResumeContent:
        profile_json = profile.model_dump_json(indent=2)
        job_json = job_analysis.model_dump_json(indent=2)
        strategy_json = strategy.model_dump_json(indent=2)

        prompt = f"""
        PROFIL ORIGINAL DU CANDIDAT :
        {profile_json}

        ANALYSE DE L'OFFRE :
        {job_json}

        STRATÉGIE ADOPTÉE :
        {strategy_json}

        Génère le contenu réécrit et sur-mesure pour ce candidat en respectant strictement le schéma JSON.
        """
        return await self.llm.generate_structured(
            prompt=prompt,
            response_schema=TailoredResumeContent,
            system_instruction=TAILOR_SYSTEM_PROMPT,
            temperature=0.3
        )
