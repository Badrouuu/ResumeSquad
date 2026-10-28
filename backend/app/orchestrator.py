import logging
from app.core.llm import LLMClient
from app.models.schemas import (
    CandidateProfile,
    JobPostingInput,
    PipelineResult,
)
from app.agents.parser_agent import JobParserAgent
from app.agents.strategist_agent import StrategistAgent
from app.agents.tailor_agent import TailorAgent
from app.agents.critic_agent import CriticAgent

logger = logging.getLogger("ResumeSquadOrchestrator")


class ResumeSquadOrchestrator:
    """Orchestrateur central du système multi-agents."""

    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client
        self.parser = JobParserAgent(llm_client)
        self.strategist = StrategistAgent(llm_client)
        self.tailor = TailorAgent(llm_client)
        self.critic = CriticAgent(llm_client)

    async def execute_pipeline(
        self,
        profile: CandidateProfile,
        job_input: JobPostingInput,
        enable_self_refine: bool = True
    ) -> PipelineResult:
        """Exécute la chaîne séquentielle des 4 agents avec boucle d'auto-correction (Self-Refine)."""
        logger.info("▶ Étape 1/4 : Analyse de l'offre par le JobParserAgent...")
        job_analysis = await self.parser.run(job_input)
        logger.info(f"✔ Offre analysée : {job_analysis.title} chez {job_analysis.company or 'Inconnue'}")

        logger.info("▶ Étape 2/4 : Élaboration de la stratégie par le StrategistAgent...")
        strategy = await self.strategist.run(profile, job_analysis)
        logger.info(f"✔ Stratégie prête (Score d'affinité initial: {strategy.overall_match_score}/100)")

        logger.info("▶ Étape 3/4 : Réécriture sur-mesure par le TailorAgent...")
        tailored_resume = await self.tailor.run(profile, job_analysis, strategy)
        logger.info("✔ Puces d'impact et accroche réécrites.")

        logger.info("▶ Étape 4/4 : Audit de conformité ATS et véracité par le CriticAgent...")
        audit = await self.critic.run(profile, job_analysis, tailored_resume)
        logger.info(f"✔ Audit terminé : Score ATS = {audit.ats_compatibility_score}/100, Validé = {audit.pass_audit}")

        # Boucle Self-Refine si des hallucinations sont détectées
        if enable_self_refine and not audit.pass_audit and audit.detected_hallucinations:
            logger.warning(f"⚠️ Hallucinations détectées : {audit.detected_hallucinations}. Déclenchement de la boucle Self-Refine...")
            # On demande au Tailor de corriger en intégrant le retour du Critic
            tailored_resume = await self.tailor.run(profile, job_analysis, strategy)
            audit = await self.critic.run(profile, job_analysis, tailored_resume)
            logger.info(f"✔ Post-Refine Audit : Score ATS = {audit.ats_compatibility_score}/100, Validé = {audit.pass_audit}")

        return PipelineResult(
            job_analysis=job_analysis,
            strategy=strategy,
            tailored_resume=tailored_resume,
            audit=audit
        )
