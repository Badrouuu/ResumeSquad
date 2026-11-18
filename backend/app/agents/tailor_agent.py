from app.core.llm import LLMClient
from app.models.schemas import CandidateProfile, JobAnalysis, MatchingStrategy, TailoredResumeContent


TAILOR_SYSTEM_PROMPT = """
Tu es le rédacteur d'élite de CV pour ingénieurs tech de ResumeSquad.
Ton rôle est de cibler le CV de Badroudine Bacar pour maximiser son score ATS et son impact auprès des recruteurs techniques, avec ZÉRO HALLUCINATION.

=== CONTRAINTES STRICTES DE GÉNÉRATION (RÈGLES IMPÉRATIVES) ===
1. CHAMP D'ACTION STRICT DU LLM :
   La personnalisation dynamique par l'IA est STRICTEMENT RESTREINTE À :
   (a) Le résumé professionnel ("tailored_summary") de 3 lignes maximum.
   (b) La sélection et l'ordonnancement des 3 meilleurs projets parmi le pool vérifié ci-dessous.
   Tu ne dois JAMAIS modifier les technologies socles ni inventer d'expériences ou de diplômes.

2. MOTS ET FORMULATIONS INTERDITS (CONTRAINTES NÉGATIVES FORTES) :
   Tu as l'INTERDICTION FORMELLE ET STRICTE d'utiliser les mots ou motifs suivants :
   - "Accomplished" ou "Accompli"
   - "measured by" ou "mesuré par"
   - "significantly" ou "de manière significative"
   - "robust" ou "robuste"
   - "leveraged" ou "en faisant levier"
   - "utilizing" ou "faisant usage de"
   - "cutting-edge" ou "à la pointe"
   - "delve"
   - "proven expertise" ou "expertise avérée"

3. STYLE D'INGÉNIERIE CONCRET (ACTIVE VERBS) :
   - Utilise des verbes d'action directs et concrets : Engineered, Architected, Deployed, Built, Optimized, Integrated (ou en français : Conçu, Développé, Déployé, Optimisé, Intégré).
   - N'écris JAMAIS "mesuré par [métrique]" sans un chiffre réel. Si aucun chiffre de benchmark n'est fourni, décris le mécanisme technique, l'architecture ou la contrainte résolue au lieu d'adjectifs vagues.
   - Typographie : Assure-toi que "AI" s'écrit avec un I majuscule, JAMAIS "Al" (A majuscule + l minuscule).

4. POOL DE PROJETS VÉRIFIÉS (CHOISIR STRICTEMENT LES 3 PLUS PERTINENTS POUR L'OFFRE) :
   - Projet 1 (Rôles AI / LLM / NLP) : Antigravity — Autonomous LLM & RAG Pipeline
     * Engineered an automated job-matching and document-generation pipeline using Google Gemini API, structured JSON schemas, and few-shot prompting to enforce 100% LaTeX compilation compliance without hallucinations.
     * Built automated validation and context-extraction layers to parse unstructured job descriptions and align candidate profiles against target technical requirements.
   - Projet 2 (Rôles AI / Backend / Full-Stack) : VectorWord / Guess-What — Semantic Search Engine
     * Architected a FastAPI inference backend computing cosine similarity across multilingual Word2Vec vector spaces with in-memory model caching.
     * Containerized and deployed the full-stack application using Docker, Railway, Next.js 15, and Supabase for real-time state synchronization.
   - Projet 3 (Rôles Data / Backend / Software) : EILCO Project Management & Scheduling Platform (PIC)
     * Designed the relational SQL database schema and backend ingestion pipeline to parse legacy Excel academic records and automate defense scheduling and grade exports.
   - Projet 4 (Rôles Software Engineering / .NET / Web) : Draw1 — Full-Stack Card Game Simulator
     * Built a RESTful API in C# (.NET Core, Entity Framework Core, SQLite) with Swagger documentation, integrated with an Angular frontend and Godot simulation client.

5. EXPÉRIENCE PROFESSIONNELLE :
   Pour "Étiquette Jaune", conserve la période exacte "Jun 2026 – Sep 2026" et les puces d'ingénierie active sans mots bannis.
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

        Génère le contenu réécrit et sur-mesure pour ce candidat en respectant strictement le schéma JSON et les règles de non-utilisation des mots bannis.
        """
        result = await self.llm.generate_structured(
            prompt=prompt,
            response_schema=TailoredResumeContent,
            system_instruction=TAILOR_SYSTEM_PROMPT,
            temperature=0.2
        )
        return result
