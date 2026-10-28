import os
import json
import logging
from typing import Type, TypeVar, Optional
from pydantic import BaseModel
from app.core.config import get_settings

logger = logging.getLogger("LLMClient")
T = TypeVar("T", bound=BaseModel)

# Initialisation optionnelle de google-genai
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    logger.warning("Le package 'google-genai' n'est pas installé. Mode dégradé/mock actif.")


import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

def is_retryable_error(exception: Exception) -> bool:
    """Recommence si l'erreur est temporaire (503 Service Unavailable ou 429 Rate Limit)."""
    err_str = str(exception)
    return "503" in err_str or "UNAVAILABLE" in err_str or "429" in err_str or "RESOURCE_EXHAUSTED" in err_str

class LLMClient:
    """Gestionnaire unifié d'appels LLM avec Structured Output garanti par Pydantic."""
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        settings = get_settings()
        self.api_key = api_key or settings.gemini_api_key or os.getenv("GEMINI_API_KEY")
        self.model = model or settings.gemini_model or "gemini-3.5-flash-lite"
        self._client = None
        
        if GENAI_AVAILABLE and self.api_key:
            try:
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Échec initialisation client Gemini: {e}")
                self._client = None

    def is_configured(self) -> bool:
        return self._client is not None

    async def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_instruction: Optional[str] = None,
        temperature: float = 0.2
    ) -> T:
        """Génère du contenu et force le LLM à respecter strictement le schéma Pydantic avec retry automatique."""
        if not self._client:
            raise ValueError(
                "Le client Gemini n'est pas configuré. Veuillez définir GEMINI_API_KEY dans le fichier .env"
            )

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=response_schema,
            temperature=temperature,
        )
        if system_instruction:
            config.system_instruction = system_instruction

        @retry(
            reraise=True,
            stop=stop_after_attempt(4),
            wait=wait_exponential(multiplier=2, min=2, max=10),
            retry=retry_if_exception(is_retryable_error),
        )
        def _call_gemini_sync():
            return self._client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=config,
            )

        try:
            # Exécution dans un threadpool pour ne pas bloquer l'event loop asynchrone
            response = await asyncio.to_thread(_call_gemini_sync)
            raw_text = response.text
            return response_schema.model_validate_json(raw_text)
        except Exception as e:
            logger.error(f"Erreur lors de la génération structurée : {e}")
            raise e
