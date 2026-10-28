import logging
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.llm import LLMClient
from app.models.schemas import (
    CandidateProfile,
    JobPostingInput,
    JobAnalysis,
    PipelineResult,
)
from app.orchestrator import ResumeSquadOrchestrator

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("API")

settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    description="Backend Multi-Agents pour l'adaptation de CVs et l'optimisation ATS",
    version="1.0.0",
)

# Configuration CORS pour autoriser le frontend Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

llm_client = LLMClient()
orchestrator = ResumeSquadOrchestrator(llm_client)


@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": settings.app_name,
        "llm_configured": llm_client.is_configured(),
        "model": settings.gemini_model,
    }


@app.post("/api/analyze-job", response_model=JobAnalysis)
async def analyze_job(job_input: JobPostingInput):
    """Exécute uniquement l'Agent 1 (JobParser) pour extraire les mots-clés ATS."""
    if not llm_client.is_configured():
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY non configurée.")
    try:
        return await orchestrator.parser.run(job_input)
    except Exception as e:
        logger.error(f"Erreur analyse offre: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/run-pipeline", response_model=PipelineResult)
async def run_full_pipeline(
    profile: CandidateProfile = Body(..., description="Données du profil candidat"),
    job_input: JobPostingInput = Body(..., description="Offre d'emploi cible")
):
    """Exécute l'escouade complète des 4 agents (Parser -> Matcher -> Tailor -> Critic)."""
    if not llm_client.is_configured():
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY non configurée. Définissez la variable dans le fichier .env"
        )
    try:
        return await orchestrator.execute_pipeline(profile, job_input)
    except Exception as e:
        logger.error(f"Erreur exécution pipeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class URLExtractRequest(BaseModel):
    url: str


@app.post("/api/extract-url")
async def extract_url(req: URLExtractRequest):
    """Télécharge une offre via son URL et extrait le texte brut pour le JobParserAgent."""
    from app.services.scraper_service import extract_job_from_url
    try:
        return await extract_job_from_url(req.url)
    except Exception as e:
        logger.error(f"Erreur scraping URL {req.url}: {e}")
        raise HTTPException(status_code=400, detail=f"Impossible d'extraire l'offre : {e}")

