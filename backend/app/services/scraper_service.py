import re
from html.parser import HTMLParser
import httpx
import logging

logger = logging.getLogger("ScraperService")


class HTMLTextExtractor(HTMLParser):
    """Parseur HTML léger basé sur la bibliothèque standard (sans dépendance lourde)."""
    def __init__(self):
        super().__init__()
        self.reset()
        self.strict = False
        self.convert_charrefs = True
        self.text_parts = []
        self.ignore_tags = {"script", "style", "noscript", "svg", "header", "footer", "nav"}
        self.current_tag = None

    def handle_starttag(self, tag, attrs):
        self.current_tag = tag.lower()

    def handle_endtag(self, tag):
        if tag.lower() == self.current_tag:
            self.current_tag = None

    def handle_data(self, data):
        if self.current_tag not in self.ignore_tags:
            cleaned = data.strip()
            if cleaned:
                self.text_parts.append(cleaned)

    def get_text(self) -> str:
        return "\n".join(self.text_parts)


async def extract_job_from_url(url: str) -> dict:
    """Télécharge la page de l'offre d'emploi et extrait le texte utile."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    }

    async with httpx.AsyncClient(follow_redirects=True, timeout=12.0) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        html_content = response.text

    parser = HTMLTextExtractor()
    parser.feed(html_content)
    raw_text = parser.get_text()

    # Nettoyage des sauts de ligne multiples
    clean_text = re.sub(r"\n{3,}", "\n\n", raw_text)

    # Détection basique du titre et de l'entreprise
    company_detected = ""
    if "linkedin.com" in url:
        company_detected = "Offre LinkedIn"
    elif "welcometothejungle.com" in url:
        company_detected = "Offre WTTJ"
    elif "indeed" in url:
        company_detected = "Offre Indeed"

    return {
        "url": url,
        "raw_text": clean_text[:4000],  # Limite pour éviter les pages géantes
        "company": company_detected,
    }
