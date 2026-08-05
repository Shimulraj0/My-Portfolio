"""P3 exit criteria: wake word triggers a voice turn; STT -> agent -> TTS round-trip.

Uses fake models/audio so the suite runs without a microphone or downloaded
Whisper/Piper voices.
"""
from __future__ import annotations

import io
import wave
from pathlib import Path

import numpy as np
import pytest

from jarvis.core.agents import AgentContext, Jarvis
from jarvis.core.agents.voice_agent import VoiceAgent
from jarvis.core.events import EventBus
from jarvis.core.memory import HashEmbedder, MemoryGraph, MemoryStore
from jarvis.core.memory.obsidian import MemoryVault, Vault
from jarvis.core.voice.service import VoiceService
from jarvis.core.voice.stt import Transcriber
from jarvis.core.voice.tts import PiperTTS
from jarvis.core.voice.wake import StopListening, WakeWordDetector


class FakeWakeModel:
    """Mimics openwakeword.Model.predict returning {name: {'score': s}}."""

    def __init__(self, scores):
        self.scores = scores

    def predict(self, chunk):
        score = self.scores.pop(0)
        return {"hey_jarvis": {"score": score}}


class FakeAudioProvider:
    def __init__(self, chunks):
        self._chunks = list(chunks)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        pass

    def read_chunk(self, samples):
        if not self._chunks:
            raise StopListening
        return self._chunks.pop(0)


class FakeSTT:
    installed = True

    def __init__(self, text):
        self._text = text
        self.transcribed = []

    def transcribe_file(self, audio, language=None):
        self.transcribed.append(audio)
        return self._text


class FakeTTS:
    def __init__(self):
        self.spoken = []

    def synthesize(self, text: str) -> bytes:
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(16000)
            wav.writeframes(b"\x00\x00" * 160)
        self.spoken.append(text)
        return buffer.getvalue()

    def speak(self, text: str) -> bytes:
        wav = self.synthesize(text)
        return wav


@pytest.fixture
def ctx(tmp_path: Path):
    graph = MemoryGraph(embedder=HashEmbedder())
    mv = MemoryVault(Vault(tmp_path / "vault"))
    store = MemoryStore(tmp_path / "mem.db")
    bus = EventBus()
    return AgentContext(graph=graph, vault=mv, store=store, event_bus=bus)


class TestWakeWordDetector:
    def test_is_trigger_above_threshold(self):
        det = WakeWordDetector(threshold=0.5, model=FakeWakeModel([0.92]))
        chunk = np.zeros(1280, dtype=np.float32)
        assert det.is_trigger(chunk)

    def test_not_trigger_below_threshold(self):
        det = WakeWordDetector(threshold=0.5, model=FakeWakeModel([0.1]))
        chunk = np.zeros(1280, dtype=np.float32)
        assert not det.is_trigger(chunk)

    def test_listen_fires_on_detection(self):
        det = WakeWordDetector(threshold=0.5, model=FakeWakeModel([0.1, 0.9]))
        provider = FakeAudioProvider([np.zeros(1280) for _ in range(2)])
        fired = []

        def on_detected():
            fired.append(True)
            raise StopListening

        det.listen(provider, on_detected)
        assert fired == [True]


class TestPiperTTS:
    def test_synthesize_returns_wav(self, tmp_path, monkeypatch):
        model_path = tmp_path / "voice.onnx"
        model_path.write_bytes(b"onnx")
        (tmp_path / "voice.onnx.json").write_text("{}")

        class FakeVoice:
            def synthesize(self, text, wav_file):
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(22050)
                wav_file.writeframes(b"\x00\x00" * 22050)

        class FakePiper:
            class PiperVoice:
                @staticmethod
                def load(model_path, config_path=None):
                    assert Path(model_path).name == "voice.onnx"
                    assert config_path is not None
                    return FakeVoice()

        monkeypatch.setattr("jarvis.core.voice.tts._import", lambda m: FakePiper)
        tts = PiperTTS(model_path=model_path)
        wav_bytes = tts.synthesize("hello jarvis")
        assert wav_bytes.startswith(b"RIFF")
        with wave.open(io.BytesIO(wav_bytes), "rb") as wav:
            assert wav.getframerate() == 22050

    def test_missing_model_raises(self, tmp_path):
        tts = PiperTTS(model_path=tmp_path / "missing.onnx")
        with pytest.raises(FileNotFoundError):
            tts._resolve_model()


class TestVoiceService:
    def test_turn_round_trip(self, ctx):
        jarvis = Jarvis(ctx)
        service = VoiceService(
            agent=jarvis,
            stt=FakeSTT("remember that I prefer dark mode"),
            tts=FakeTTS(),
        )
        reply = service.turn(
            FakeAudioProvider([]), command="remember that I prefer dark mode"
        )
        assert reply.startswith("Got it")
        assert "dark mode" in reply
        assert len(list(ctx.graph.memories())) == 1

    def test_spoken_after_turn(self, ctx):
        jarvis = Jarvis(ctx)
        tts = FakeTTS()
        service = VoiceService(agent=jarvis, stt=FakeSTT("hello"), tts=tts)
        service.turn(FakeAudioProvider([]), command="hello")
        assert tts.spoken


class TestVoiceAgent:
    def test_speak_captures_wav(self, ctx, monkeypatch):
        jarvis = Jarvis(ctx, voice=VoiceAgent())
        monkeypatch.setattr(jarvis.voice.tts, "synthesize", lambda text: b"wavdata")
        jarvis.run("hello")
        assert jarvis.voice.last_wav == b"wavdata"
