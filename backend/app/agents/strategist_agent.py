import json
from app.core.llm import LLMClient
from app.models.schemas import CandidateProfile, JobAnalysis, MatchingStrategy


STRATEGIST_SYSTEM_PROMPT = """
Tu es un stratège en carrière d'ingénieurs en Intelligence Artificielle et Software Engineering.
Ton rôle est de comparer objectivement le profil réel d'un candidat avec l'analyse d'une offre d'emploi.

Règles impératives :
1. Calculer un score global réaliste (overall_match_score) entre 0 et 100 basé sur les technologies requises vs maîtrisées.
2. Identifier les forces majeures du candidat qui correspondent directement aux exigences de l'offre.
3. Repérer les éventuels manques (gaps) techniques sans paniquer : définir comment contourner ces manques grâce aux forces adjacentes.
4. Établir l'"Angle d'Attaque" : comment le candidat doit se positionner pour que le recruteur se dise immédiatement "c'est exactement le profil qu'il nous faut".
5. Ordonner et sélectionner les projets et expériences qui ont le plus gros impact pour cette offre précise.
"""

class StrategistAgent:
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    async def run(self, profile: CandidateProfile, job_analysis: JobAnalysis) -> MatchingStrategy:
        profile_json = profile.model_dump_json(indent=2)
        job_json = job_analysis.model_dump_json(indent=2)

        prompt = f"""
        PROFIL COMPLET DU CANDIDAT (DONNÉES VÉRIFIÉES) :
        {profile_json}

        EXIGENCES DE L'OFFRE D'EMPLOI ANALYSÉE :
        {job_json}

        Élabore la stratégie d'adéquation et de valorisation pour ce poste selon le schéma JSON demandé.
        """
        return await self.llm.generate_structured(
            prompt=prompt,
            response_schema=MatchingStrategy,
            system_instruction=STRATEGIST_SYSTEM_PROMPT,
            temperature=0.2
        )
