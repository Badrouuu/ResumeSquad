"""
run_local.py — Script de test et démonstration locale du pipeline Multi-Agents.
Permet d'exécuter l'escouade d'agents directement sans passer par l'API Web.
"""

import os
import sys
import json
import asyncio
from pathlib import Path

# Fix pour l'encodage Windows console (évite l'erreur cp1252 sur les emojis)
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:
        pass

# Ajouter backend/ au sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from dotenv import load_dotenv
load_dotenv(BASE_DIR / ".env")

from app.core.llm import LLMClient
from app.models.schemas import CandidateProfile, JobPostingInput
from app.orchestrator import ResumeSquadOrchestrator
from app.services.latex_service import LaTeXResumeGenerator

SAMPLE_JOB_OFFER = """
Offre : Stage PFE - AI / Machine Learning Engineer (6 mois)
Entreprise : NeuroTech Solutions (Genève / Télétravail)

À propos du poste :
Nous recherchons un(e) élève-ingénieur en dernière année pour rejoindre notre équipe R&D IA.
Vous participerez à la conception de modèles de NLP avancés et d'architectures d'espaces vectoriels pour l'analyse sémantique de corpus documentaires.

Missions :
- Développer des pipelines de traitement du langage naturel (NLP) et d'embeddings sémantiques.
- Entraîner et déployer des modèles sous PyTorch ou Transformers.
- Exposer des APIs haute performance en Python (FastAPI) et conteneuriser les microservices avec Docker.
- Collaborer avec l'équipe produit pour intégrer des agents LLMs avec Few-Shot Prompting et RAG.

Profil recherché :
- Étudiant(e) en dernière année d'école d'ingénieurs (Bac+5 / Master 2) avec spécialisation IA / Data Science.
- Solides compétences en Python, PyTorch, calcul vectoriel (NumPy) et APIs REST (FastAPI).
- Connaissance des technologies d'embeddings (Word2Vec, Sentence-Transformers) appréciée.
- Rigueur scientifique, autonomie, esprit d'initiative.
"""

async def main():
    print("=" * 70)
    print("🤖 BIENVENUE SUR RESUME SQUAD (MULTI-AGENT COPILOT)")
    print("=" * 70)

    # 1. Chargement du profil (avec fallback autonome)
    local_sample = BASE_DIR / "data" / "sample_profile.json"
    external_profile = BASE_DIR.parent.parent / "Candidature" / "data" / "master_profile.json"
    profile_path = external_profile if external_profile.exists() else local_sample

    if not profile_path.exists():
        print(f"❌ Profil introuvable. Veuillez vérifier {local_sample} ou {external_profile}")
        return

    with open(profile_path, "r", encoding="utf-8") as f:
        profile_data = json.load(f)

    profile = CandidateProfile.model_validate(profile_data)
    print(f"👤 Candidat chargé : {profile.basics.name} ({profile.basics.title})")
    print(f"📊 Nombre de projets référencés : {len(profile.projects)}")
    print(f"💼 Nombre d'expériences : {len(profile.experience)}")

    # 2. Vérification de la clé API
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or "your_gemini" in api_key:
        print("\n" + "!" * 70)
        print("⚠️ CLÉ GEMINI_API_KEY NON DÉFINIE DANS backend/.env")
        print("Pour lancer une exécution réelle avec Gemini 2.5 Flash :")
        print("1. Va sur https://aistudio.google.com pour générer ta clé gratuite.")
        print("2. Copie-la dans backend/.env (GEMINI_API_KEY=AIzaSy...)")
        print("!" * 70 + "\n")
        return

    # 3. Lancement du Pipeline
    llm_client = LLMClient(api_key=api_key)
    orchestrator = ResumeSquadOrchestrator(llm_client)

    job_input = JobPostingInput(
        raw_text=SAMPLE_JOB_OFFER,
        company_name="NeuroTech Solutions",
        job_title="Stage PFE AI / Machine Learning Engineer"
    )

    print("\n🚀 Lancement de l'orchestration multi-agents...\n")
    result = await orchestrator.execute_pipeline(profile, job_input)

    print("\n" + "=" * 70)
    print("📋 RÉSULTATS DU PIPELINE MULTI-AGENTS")
    print("=" * 70)
    print(f"\n1. Analyse de l'offre : {result.job_analysis.title}")
    print(f"   Mots-clés ATS critiques : {', '.join(result.job_analysis.ats_critical_keywords)}")
    print(f"\n2. Stratégie de Matching :")
    print(f"   Score global estimé : {result.strategy.overall_match_score}/100")
    print(f"   Angle d'attaque : {result.strategy.angle_of_attack}")
    print(f"   Projets prioritaires : {', '.join(result.strategy.prioritized_projects)}")
    print(f"\n3. CV Réécrit :")
    print(f"   Titre proposé : {result.tailored_resume.tailored_title}")
    print(f"   Accroche : {result.tailored_resume.tailored_summary}")
    print("   Puces d'impact réécrites (STAR) :")
    for proj in result.tailored_resume.tailored_project_bullets:
        print(f"     • Projet [{proj.name}] :")
        for b in proj.bullets:
            print(f"       - {b}")
    for exp in result.tailored_resume.tailored_experience_bullets:
        print(f"     • Expérience [{exp.name}] :")
        for b in exp.bullets:
            print(f"       - {b}")
    print(f"\n4. Rapport d'Audit ATS (Critic) :")
    print(f"   Score ATS final : {result.audit.ats_compatibility_score}/100")
    print(f"   Validation : {'✅ VALIDÉ' if result.audit.pass_audit else '❌ NON VALIDÉ'}")
    print(f"   Couverture mots-clés : {result.audit.keyword_coverage_rate * 100:.1f}%")
    if result.audit.detected_hallucinations:
        print(f"   ⚠️ Hallucinations signalées : {result.audit.detected_hallucinations}")
    else:
        print("   ✅ Zéro hallucination détectée !")

    # 5. Génération du fichier LaTeX
    print("\n" + "=" * 70)
    print("📄 GÉNÉRATION DU FICHIER LATEX DU CV SUR-MESURE")
    print("=" * 70)
    tex_generator = LaTeXResumeGenerator()
    tex_file = tex_generator.generate_tex(
        profile,
        result.tailored_resume,
        result.strategy,
        output_filename="cv_tailored_pfe.tex"
    )
    print(f"✅ Fichier .tex prêt pour compilation : {tex_file}")
    print("💡 Tu peux l'ouvrir dans ton éditeur ou l'importer directement dans Overleaf pour le PDF !")

if __name__ == "__main__":
    asyncio.run(main())
