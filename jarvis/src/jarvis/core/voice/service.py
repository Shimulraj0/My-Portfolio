"""Voice service — composes wake word, STT, agent, and TTS into a loop."""
from __future__ import annotations

import logging
from typing import Callable, Optional

from ..agents.orchestrator import Jarvis
from .stt import Transcriber
from .tts import PiperTTS
from .wake import AudioProvider, WakeWordDetector

log = logging.getLogger("jarvis.voice.service")


class VoiceService:
    """Always-on assistant loop: wait for wake word, listen, think, speak.

    All components are injectable so tests can run the whole loop with fakes.
    """

    def __init__(
        self,
        agent: Jarvis,
        wake: Optional[WakeWordDetector] = None,
        stt: Optional[Transcriber] = None,
        tts: Optional[PiperTTS] = None,
    ):
        self.agent = agent
        self.wake = wake or WakeWordDetector()
        self.stt = stt or Transcriber()
        self.tts = tts or PiperTTS()
        self._on_command: Optional[Callable[[str], None]] = None
        self._on_reply: Optional[Callable[[str], None]] = None

    def on_command(self, callback: Callable[[str], None]) -> None:
        self._on_command = callback

    def on_reply(self, callback: Callable[[str], None]) -> None:
        self._on_reply = callback

    def _capture_audio(self, provider: AudioProvider) -> bytes:
        """Record until silence after speech; returns WAV bytes."""
        raise NotImplementedError("continuous recording not wired yet")

    def turn(self, provider: AudioProvider, command: Optional[str] = None) -> str:
        """One full interaction: capture (or accept) speech, run agent, reply."""
        if command is None:
            command = self.stt.transcribe_file(provider.read_chunk(0))
        if self._on_command:
            self._on_command(command)
        result = self.agent.run(command)
        reply = result["reply"]
        if self._on_reply:
            self._on_reply(reply)
        try:
            self.tts.speak(reply)
        except RuntimeError:
            log.warning("TTS unavailable; replying silently")
        return reply

    def start(self, provider: AudioProvider) -> None:
        """Blocking loop: wake word then a full turn, repeated."""
        self.wake.listen(
            provider,
            on_detected=lambda: self.turn(provider),
        )
