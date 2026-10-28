import re
from pathlib import Path
from typing import Dict, Any
from jinja2 import Environment, FileSystemLoader

from app.models.schemas import CandidateProfile, TailoredResumeContent, MatchingStrategy

BASE_DIR = Path(__file__).resolve().parent.parent.parent
OUTPUT_DIR = BASE_DIR / "output"


def get_latex_jinja_env(template_dir: Path) -> Environment:
    """Configure Jinja2 pour la syntaxe LaTeX (évite les conflits avec {{ }} et { })."""
    return Environment(
        block_start_string="((*",
        block_end_string="*))",
        variable_start_string="((",
        variable_end_string="))",
        comment_start_string="((=",
        comment_end_string="=))",
        loader=FileSystemLoader(str(template_dir)),
        autoescape=False
    )


def escape_latex(text: Any) -> Any:
    """Échappe les caractères réservés de LaTeX pour éviter les erreurs de compilation."""
    if not isinstance(text, str):
        return text
    conv = {
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    regex = re.compile("|".join(re.escape(str(key)) for key in sorted(conv.keys(), key=lambda item: -len(item))))
    return regex.sub(lambda match: conv[match.group()], text)


def escape_data(data: Any) -> Any:
    """Applique récursivement l'échappement LaTeX."""
    if isinstance(data, dict):
        return {k: escape_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [escape_data(item) for item in data]
    elif isinstance(data, str):
        return escape_latex(data)
    return data


class LaTeXResumeGenerator:
    """Service de fusion du profil candidat réécrit avec le template LaTeX."""

    def __init__(self, templates_dir: Path = None):
        if templates_dir is None:
            # Recherche dans backend/templates en priorité (autonome pour Docker)
            local_templates = BASE_DIR / "templates"
            if local_templates.exists():
                templates_dir = local_templates
            else:
                templates_dir = BASE_DIR.parent.parent / "Candidature" / "templates"
        self.templates_dir = templates_dir
        self.env = get_latex_jinja_env(self.templates_dir)

    def merge_tailored_data(
        self,
        original_profile: CandidateProfile,
        tailored: TailoredResumeContent,
        strategy: MatchingStrategy
    ) -> Dict[str, Any]:
        """Fusionne les puces réécrites et réordonne les projets selon la stratégie de l'agent."""
        profile_dict = original_profile.model_dump()

        # 1. Mise à jour du titre et de l'accroche
        profile_dict["basics"]["title"] = tailored.tailored_title
        profile_dict["basics"]["summary"] = tailored.tailored_summary

        # 2. Remplacement des puces projets par les puces réécrites par le TailorAgent
        project_bullets_map = {item.name: item.bullets for item in tailored.tailored_project_bullets}
        for proj in profile_dict["projects"]:
            if proj["name"] in project_bullets_map:
                proj["highlights"] = project_bullets_map[proj["name"]]

        # 3. Réordonnancement des projets selon la priorité stratégique
        priority_order = {name: idx for idx, name in enumerate(strategy.prioritized_projects)}
        profile_dict["projects"].sort(
            key=lambda p: priority_order.get(p["name"], 99)
        )

        # 4. Remplacement des puces expériences par les puces réécrites
        exp_bullets_map = {item.name: item.bullets for item in tailored.tailored_experience_bullets}
        for exp in profile_dict["experience"]:
            if exp["company"] in exp_bullets_map:
                exp["highlights"] = exp_bullets_map[exp["company"]]

        return profile_dict

    def generate_tex(
        self,
        original_profile: CandidateProfile,
        tailored: TailoredResumeContent,
        strategy: MatchingStrategy,
        output_filename: str = "cv_tailored.tex"
    ) -> Path:
        """Génère le code LaTeX complet prêt à compiler."""
        merged_data = self.merge_tailored_data(original_profile, tailored, strategy)
        escaped_data = escape_data(merged_data)

        template = self.env.get_template("cv_template.tex")
        rendered_tex = template.render(**escaped_data)

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        output_path = OUTPUT_DIR / output_filename
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(rendered_tex)

        return output_path
