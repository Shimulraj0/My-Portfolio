"""Wake word detection (openWakeWord, streaming).

The listener feeds 16 kHz audio chunks to the openwakeword model and fires a
callback when a wake word ("Jarvis") is detected above a threshold. Hardware
is abstracted behind an ``AudioProvider`` so tests can inject fake audio.
"""
from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Optional

import numpy as np

log = logging.getLogger("jarvis.voice.wake")

WAKE_WORD = "Jarvis"
SAMPLE_RATE = 16000
DEFAULT_BLOCK_SAMPLES = 1280  # 80 ms @ 16 kHz (openwakeword's expected chunk)


class StopListening(Exception):
    """Raised by an on_detected callback to end the listen loop."""


class AudioProvider:
    """Yields mono 16 kHz audio chunks (numpy float32/int16)."""

    def __enter__(self) -> "AudioProvider":
        return self

    def __exit__(self, *exc) -> None:
        pass

    def read_chunk(self, samples: int) -> np.ndarray:
        raise NotImplementedError


class MicrophoneProvider(AudioProvider):
    """Real microphone via sounddevice."""

    def __init__(self, sample_rate: int = SAMPLE_RATE, channels: int = 1):
        self.sample_rate = sample_rate
        self.channels = channels
        self._stream = None

    def __enter__(self) -> "MicrophoneProvider":
        import sounddevice as sd

        self._stream = sd.InputStream(
            samplerate=self.sample_rate,
            channels=self.channels,
            dtype="float32",
            blocksize=0,
        )
        self._stream.start()
        return self

    def __exit__(self, *exc) -> None:
        if self._stream is not None:
            self._stream.stop()
            self._stream.close()

    def read_chunk(self, samples: int) -> np.ndarray:
        assert self._stream is not None
        data, _overflow = self._stream.read(samples)
        return data.reshape(-1)


class WakeWordDetector:
    """Streaming wake-word detector. Fires ``on_detected`` on a trigger."""

    def __init__(
        self,
        threshold: float = 0.5,
        sample_rate: int = SAMPLE_RATE,
        block_samples: int = DEFAULT_BLOCK_SAMPLES,
        model: Optional[object] = None,
    ):
        self.threshold = threshold
        self.sample_rate = sample_rate
        self.block_samples = block_samples
        self._model = model  # injected for tests; else openwakeword.Model()

    @property
    def installed(self) -> bool:
        return _import("openwakeword.model") is not None

    def _ensure_model(self) -> object:
        if self._model is None:
            openwakeword_model = _import("openwakeword.model")
            if openwakeword_model is None:
                raise RuntimeError("openwakeword is not installed")
            self._model = openwakeword_model.Model(prediction_threshold=self.threshold)
        return self._model

    def score(self, chunk: np.ndarray) -> float:
        """Wake-word score (0..1) for one audio chunk."""
        model = self._ensure_model()
        result = model.predict(chunk)
        if isinstance(result, dict):
            best = 0.0
            for value in result.values():
                if isinstance(value, dict):
                    best = max(best, float(value.get("score", 0.0)))
            return best
        return float(result)

    def is_trigger(self, chunk: np.ndarray) -> bool:
        return self.score(chunk) >= self.threshold

    def listen(self, provider: AudioProvider, on_detected: Callable[[], None]) -> None:
        """Blocking loop: feed chunks to the model until a wake word fires."""
        log.info("listening for wake word '%s'", WAKE_WORD)
        with provider:
            while True:
                try:
                    chunk = provider.read_chunk(self.block_samples)
                except StopListening:
                    return
                if self.is_trigger(chunk):
                    log.info("wake word detected")
                    try:
                        on_detected()
                    except StopListening:
                        return

def _import(module: str):
    try:
        import importlib

        return importlib.import_module(module)
    except ImportError:
        return None
