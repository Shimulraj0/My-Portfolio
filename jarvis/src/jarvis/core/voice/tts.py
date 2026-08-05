"""Text-to-speech via Piper (offline neural TTS)."""
from __future__ import annotations

import io
import logging
import os
import wave
from pathlib import Path
from typing import Optional

log = logging.getLogger("jarvis.voice.tts")

DEFAULT_VOICE = "en_US-lessac-medium"


class PiperTTS:
    """Synthesizes speech with Piper and can play it through speakers.

    Loads the model lazily. ``model_path`` may point to a ``.onnx`` file or a
    directory containing ``*.onnx`` + ``*.onnx.json``; a voice name (e.g.
    ``en_US-lessac-medium``) is resolved inside the configured voice directory.
    """

    def __init__(
        self,
        model_path: Optional[os.PathLike] = None,
        voice: str = DEFAULT_VOICE,
        voices_dir: Optional[os.PathLike] = None,
        sample_rate: Optional[int] = None,
    ):
        self.model_path = Path(model_path) if model_path else None
        self.voice = voice
        self.voices_dir = Path(voices_dir) if voices_dir else None
        self.sample_rate = sample_rate
        self._voice = None

    @property
    def installed(self) -> bool:
        return _import("piper") is not None

    def _resolve_model(self) -> Path:
        if self.model_path is not None:
            if not self.model_path.exists():
                raise FileNotFoundError(f"voice model not found: {self.model_path}")
            if self.model_path.is_dir():
                candidates = sorted(self.model_path.glob("*.onnx"))
                if not candidates:
                    raise FileNotFoundError(
                        f"no .onnx models in {self.model_path}"
                    )
                return candidates[0]
            return self.model_path
        if self.voices_dir is not None:
            candidate = self.voices_dir / f"{self.voice}.onnx"
            if candidate.exists():
                return candidate
            raise FileNotFoundError(
                f"voice model not found: {candidate} (set JARVIS_VOICE_MODEL to "
                f"point at a Piper .onnx)"
            )
        raise RuntimeError(
            "no Piper voice configured; pass model_path/voices_dir or set "
            "JARVIS_VOICE_MODEL"
        )

    def _ensure_voice(self):
        if self._voice is None:
            piper = _import("piper")
            if piper is None:
                raise RuntimeError("piper-tts is not installed")
            model = self._resolve_model()
            config = model.with_suffix(".onnx.json")
            self._voice = piper.PiperVoice.load(
                model, config_path=str(config) if config.exists() else None
            )
        return self._voice

    def synthesize(self, text: str) -> bytes:
        """Return a complete WAV file (bytes) of the spoken text."""
        voice = self._ensure_voice()
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav:
            voice.synthesize(text, wav)
        return buffer.getvalue()

    def play(self, wav_bytes: bytes) -> None:
        """Play pre-synthesized WAV bytes through the default speaker."""
        sd = _import("sounddevice")
        if sd is None:
            raise RuntimeError("sounddevice is not installed")
        with wave.open(io.BytesIO(wav_bytes), "rb") as wav:
            sample_rate = wav.getframerate()
            frames = wav.readframes(wav.getnframes())
        import numpy as np

        data = np.frombuffer(frames, dtype=np.int16)
        sd.play(data, sample_rate)
        sd.wait()

    def speak(self, text: str) -> bytes:
        wav_bytes = self.synthesize(text)
        self.play(wav_bytes)
        return wav_bytes


def _import(module: str):
    try:
        import importlib

        return importlib.import_module(module)
    except ImportError:
        return None
