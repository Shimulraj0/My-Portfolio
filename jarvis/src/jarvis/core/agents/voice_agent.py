"""Voice agent node — speaks the orchestrator's reply out loud."""
from __future__ import annotations

from typing import Optional

from ..voice.tts import PiperTTS


class VoiceAgent:
    """Thin wrapper that renders replies as speech via Piper.

    Passed to ``Jarvis(voice=...)`` so every response is spoken after the
    graph completes. Fails soft when TTS is unavailable.
    """

    def __init__(self, tts: Optional[PiperTTS] = None):
        self.tts = tts or PiperTTS()
        self.last_wav: Optional[bytes] = None

    def speak(self, text: str) -> Optional[bytes]:
        try:
            wav = self.tts.synthesize(text)
        except RuntimeError:
            return None
        self.last_wav = wav
        return wav
