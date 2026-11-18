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


def validate_tex_pre_submission(tex_content: str) -> str:
    """
    Validation de pré-soumission selon les règles d'intégrité strictes :
    1. Zéro occurrence de "Al " (A majuscule + l minuscule) ou de "measured by"
    2. "905/990" apparaît impérativement avant "TECHNICAL PROJECTS" (ou "PROJETS TECHNIQUES")
    3. Normalisation UTF-8 et correction automatique des erreurs de frappe OCR
    """
    # 1. Correction automatique et assertion zéro "Al "
    cleaned = re.sub(r"\bAl\s+", "AI ", tex_content)
    cleaned = re.sub(r"\bAl\b", "AI", cleaned)

    if re.search(r"\bAl\s+", cleaned):
        raise ValueError("Erreur de validation LaTeX : présence de 'Al ' détectée au lieu de 'AI '.")

    # Éradication de "measured by" ou "mesuré par"
    cleaned = re.sub(r"\bas measured by\b|\bmeasured by\b|\bmesuré par\b", "with", cleaned, flags=re.IGNORECASE)
    if re.search(r"\bmeasured by\b", cleaned, re.IGNORECASE):
        raise ValueError("Erreur de validation LaTeX : présence interdite du motif 'measured by'.")

    # 2. Vérification de l'ordre TOEIC vs Technical Projects
    toeic_pos = cleaned.find("905")
    proj_pos = -1
    for marker in ["TECHNICAL PROJECTS", "Technical Projects", "PROJETS TECHNIQUES", "Projets Techniques"]:
        pos = cleaned.find(marker)
        if pos != -1:
            proj_pos = pos
            break

    if toeic_pos == -1:
        raise ValueError("Erreur de validation LaTeX : score TOEIC '905/990' introuvable dans le document.")

    if proj_pos != -1 and toeic_pos > proj_pos:
        raise ValueError("Erreur de validation LaTeX : '905/990' doit impérativement apparaître avant 'TECHNICAL PROJECTS'.")

    return cleaned


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

        # 2. Remplacement des puces projets par les puces sélectionnées
        project_bullets_map = {item.name: item.bullets for item in tailored.tailored_project_bullets}
        for proj in profile_dict["projects"]:
            if proj["name"] in project_bullets_map:
                proj["highlights"] = project_bullets_map[proj["name"]]

        # 3. Réordonnancement des projets selon la priorité stratégique (top 3)
        priority_order = {name: idx for idx, name in enumerate(strategy.prioritized_projects)}
        profile_dict["projects"].sort(
            key=lambda p: priority_order.get(p["name"], 99)
        )
        # Limite stricte au top 3 projets pour garantir une page unique (num_pages == 1)
        profile_dict["projects"] = profile_dict["projects"][:3]

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
        """Génère le code LaTeX complet prêt à compiler et valide les contraintes de pré-soumission."""
        merged_data = self.merge_tailored_data(original_profile, tailored, strategy)
        escaped_data = escape_data(merged_data)

        template = self.env.get_template("cv_template.tex")
        rendered_tex = template.render(**escaped_data)

        # Validation stricte pré-soumission
        validated_tex = validate_tex_pre_submission(rendered_tex)

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        output_path = OUTPUT_DIR / output_filename
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(validated_tex)

        return output_path
