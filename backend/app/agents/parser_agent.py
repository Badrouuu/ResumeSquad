from app.core.llm import LLMClient
from app.models.schemas import JobPostingInput, JobAnalysis


PARSER_SYSTEM_PROMPT = """
Tu es un ingénieur expert en recrutement technique et en systèmes ATS (Applicant Tracking Systems).
Ton rôle est d'analyser une offre d'emploi brute et d'en extraire avec une précision chirurgicale :
1. Le titre exact et le niveau de séniorité requis (ex: Stage PFE, Junior, etc.).
2. Les compétences techniques impératives (hard skills, frameworks, langages, bibliothèques).
3. Les soft skills mentionnées.
4. Les mots-clés ATS critiques qui seront probablement recherchés par les filtres automatiques.
5. Les missions principales et le ton de l'entreprise.

Sois exhaustif sur les technologies mentionnées explicitement ou implicitement.
"""

class JobParserAgent:
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    async def run(self, job_input: JobPostingInput) -> JobAnalysis:
        prompt = f"""
        Voici l'offre d'emploi à analyser :
        ==================================================
        {job_input.raw_text}
        ==================================================
        Entreprise cible mentionnée (optionnel) : {job_input.company_name or 'Non spécifiée'}
        Intitulé visé (optionnel) : {job_input.job_title or 'Non spécifié'}

        Extrais toutes les informations requises dans le schéma JSON strict.
        """
        return await self.llm.generate_structured(
            prompt=prompt,
            response_schema=JobAnalysis,
            system_instruction=PARSER_SYSTEM_PROMPT,
            temperature=0.1
        )
