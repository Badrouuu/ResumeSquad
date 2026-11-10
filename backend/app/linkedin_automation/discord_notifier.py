"""
discord_notifier.py — Module de notification instantanée sur Discord avec support de captures d'écran.
"""

import os
import json
import urllib.request
import urllib.error
from datetime import datetime
from typing import Dict, Any, Optional


class DiscordNotifier:
    """Gestionnaire d'alertes Discord Webhook pour l'agent de postulation LinkedIn."""

    def __init__(self, webhook_url: Optional[str] = None):
        self.webhook_url = webhook_url or os.getenv("DISCORD_WEBHOOK_URL", "")

        if not self.webhook_url:
            env_file = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
            if os.path.exists(env_file):
                with open(env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.startswith("DISCORD_WEBHOOK_URL="):
                            self.webhook_url = line.strip().split("=", 1)[1].strip("'\"")
                            break

    def notify_application_success(
        self,
        company: str,
        title: str,
        location: str,
        job_url: str,
        screenshot_path: Optional[str] = None,
        next_delay_seconds: int = 240,
        dry_run: bool = False,
    ) -> bool:
        """Envoie une notification riche avec embed et capture d'écran sur Discord."""
        if not self.webhook_url or not self.webhook_url.startswith("https://discord.com/api/webhooks/"):
            print("ℹ️ [Discord] Aucun webhook valide configuré. Notification passée.")
            return False

        tag = "🧪 [Simulation / Dry-Run]" if dry_run else "🚀 [Candidature Envoyée]"
        color = 0xf59e0b if dry_run else 0x10b981

        fields = [
            {"name": "🏢 Entreprise", "value": company, "inline": True},
            {"name": "💼 Poste", "value": title, "inline": True},
            {"name": "🌍 Localisation", "value": location or "Non spécifié", "inline": True},
            {"name": "📅 Date & Heure", "value": datetime.now().strftime("%d/%m/%Y à %H:%M:%S"), "inline": True},
            {"name": "🔗 Annonce LinkedIn", "value": f"[Consulter sur LinkedIn]({job_url})", "inline": True},
            {"name": "⏳ Prochain créneau", "value": f"Dans ~{next_delay_seconds // 60} min ({next_delay_seconds}s)", "inline": True},
        ]

        embed = {
            "title": f"{tag} {company}",
            "description": (
                "La candidature simplifiée (Easy Apply) a été complétée et soumise en arrière-plan avec succès !"
                if not dry_run
                else "Formulaire complété jusqu'à la dernière étape en mode simulation (Dry-Run)."
            ),
            "color": color,
            "fields": fields,
            "footer": {"text": "ResumeSquad • LinkedIn Autonomous Agent (Playwright + Gemini 1.5)"},
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

        # Si capture d'écran disponible, envoi multipart
        if screenshot_path and os.path.exists(screenshot_path):
            return self._send_multipart(embed, screenshot_path)

        # Envoi JSON standard
        payload = {
            "username": "LinkedIn Autopilot Agent",
            "avatar_url": "https://cdn-icons-png.flaticon.com/512/3536/3536505.png",
            "embeds": [embed],
        }

        try:
            req = urllib.request.Request(
                self.webhook_url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json", "User-Agent": "ResumeSquadBot/1.0"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as res:
                if res.status in (200, 204):
                    print(f"📲 [Discord] Notification transmise avec succès pour {company} !")
                    return True
        except Exception as e:
            print(f"⚠️ [Discord] Erreur d'envoi: {e}")
            return False
        return False

    def _send_multipart(self, embed: Dict[str, Any], image_path: str) -> bool:
        """Envoi multipart/form-data pour inclure l'image de capture d'écran dans l'embed."""
        import mimetypes
        import uuid

        boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
        embed["image"] = {"url": f"attachment://{os.path.basename(image_path)}"}

        payload_json = {
            "username": "LinkedIn Autopilot Agent",
            "avatar_url": "https://cdn-icons-png.flaticon.com/512/3536/3536505.png",
            "embeds": [embed],
        }

        body_bytes = bytearray()

        # Champ JSON
        body_bytes.extend(f"--{boundary}\r\n".encode("utf-8"))
        body_bytes.extend(b'Content-Disposition: form-data; name="payload_json"\r\n\r\n')
        body_bytes.extend(json.dumps(payload_json).encode("utf-8"))
        body_bytes.extend(b"\r\n")

        # Fichier Image
        filename = os.path.basename(image_path)
        mime = mimetypes.guess_type(image_path)[0] or "image/png"
        body_bytes.extend(f"--{boundary}\r\n".encode("utf-8"))
        body_bytes.extend(
            f'Content-Disposition: form-data; name="files[0]"; filename="{filename}"\r\n'.encode("utf-8")
        )
        body_bytes.extend(f"Content-Type: {mime}\r\n\r\n".encode("utf-8"))
        with open(image_path, "rb") as f:
            body_bytes.extend(f.read())
        body_bytes.extend(b"\r\n")

        body_bytes.extend(f"--{boundary}--\r\n".encode("utf-8"))

        try:
            req = urllib.request.Request(
                self.webhook_url,
                data=bytes(body_bytes),
                headers={
                    "Content-Type": f"multipart/form-data; boundary={boundary}",
                    "User-Agent": "ResumeSquadBot/1.0",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=15) as res:
                if res.status in (200, 204):
                    print(f"📲 [Discord] Notification avec capture d'écran transmise sur Discord !")
                    return True
        except Exception as e:
            print(f"⚠️ [Discord] Erreur transmission multipart: {e}")
        return False
