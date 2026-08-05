"""Speech-to-text via faster-whisper (local Whisper)."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional, Union

log = logging.getLogger("jarvis.voice.stt")

AudioSource = Union[str, Path, bytes, object]  # path / raw audio bytes / numpy array


class Transcriber:
    """Transcribes audio to text with a local Whisper model.

    The model is loaded lazily on first use so importing the module never
    pulls faster-whisper in until needed.
    """

    def __init__(
        self,
        model: str = "base",
        device: str = "auto",
        compute_type: str = "int8",
        language: Optional[str] = "en",
    ):
        self.model_name = model
        self.device = device
        self.compute_type = compute_type
        self.language = language
        self._model = None

    @property
    def installed(self) -> bool:
        return _import("faster_whisper") is not None

    def _ensure_model(self):
        if self._model is None:
            fw = _import("faster_whisper")
            if fw is None:
                raise RuntimeError("faster-whisper is not installed")
            self._model = fw.WhisperModel(
                self.model_name,
                device=self.device,
                compute_type=self.compute_type,
            )
        return self._model

    def transcribe_file(self, audio: AudioSource, language: Optional[str] = None) -> str:
        """Transcribe a file path, raw bytes, or numpy audio."""
        if isinstance(audio, (str, Path)):
            segments, _info = self._ensure_model().transcribe(
                str(audio), language=language or self.language
            )
        else:
            segments, _info = self._ensure_model().transcribe(
                audio, language=language or self.language
            )
        return " ".join(seg.text.strip() for seg in segments).strip()

    transcribe = transcribe_file


def _import(module: str):
    try:
        import importlib

        return importlib.import_module(module)
    except ImportError:
        return None
