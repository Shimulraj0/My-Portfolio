"""Embedding providers for the memory graph.

The production embedder is sentence-transformers ``all-MiniLM-L6-v2`` (384-d,
local, offline — the same model class jcode uses). Because torch is heavy and
can lag new Python versions, a deterministic stdlib-only ``HashEmbedder`` is
provided as a fallback so the protocol is testable/runable anywhere.
"""
from __future__ import annotations

import hashlib
import re
from typing import Protocol, runtime_checkable

DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
DEFAULT_DIM = 384

_WORD_RE = re.compile(r"[a-z0-9]+")


@runtime_checkable
class Embedder(Protocol):
    dim: int

    def embed(self, text: str) -> list[float]: ...

    def embed_many(self, texts: list[str]) -> list[list[float]]: ...


class HashEmbedder:
    """Deterministic, dependency-free embedder.

    Builds a bag-of-features vector from word tokens *and* character n-grams,
    hashing each feature into several buckets via multiple hash functions
    (feature hashing). L2-normalized. Coarse but robust for protocol tests and
    offline dev — ranking is reliable for short texts.
    """

    def __init__(self, dim: int = DEFAULT_DIM, buckets_per_feature: int = 3):
        self.dim = dim
        self._k = buckets_per_feature

    def _features(self, text: str) -> list[str]:
        words = _WORD_RE.findall(text.lower())
        features = list(words)
        for word in words:
            if len(word) >= 2:
                features.append(word)
            for n in (2, 3):
                if len(word) >= n:
                    features.extend(word[i : i + n] for i in range(len(word) - n + 1))
        return features

    def _vector(self, text: str) -> list[float]:
        vec = [0.0] * self.dim
        for feature in self._features(text):
            for salt in range(self._k):
                digest = hashlib.md5(f"{salt}:{feature}".encode("utf-8")).digest()
                index = int.from_bytes(digest[:4], "big") % self.dim
                sign = 1.0 if digest[4] & 1 else -1.0
                vec[index] += sign
        return vec

    def embed(self, text: str) -> list[float]:
        return _l2_normalize(self._vector(text))

    def embed_many(self, texts: list[str]) -> list[list[float]]:
        return [self.embed(t) for t in texts]


class LocalEmbedder:
    """sentence-transformers when available, else the HashEmbedder fallback."""

    def __init__(self, model_name: str = DEFAULT_MODEL):
        self._model = None
        self._fallback = HashEmbedder()
        self.dim = self._fallback.dim
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore

            self._model = SentenceTransformer(model_name)
            self.dim = int(self._model.get_sentence_embedding_dimension())
        except Exception:  # pragma: no cover - env-dependent
            pass

    @property
    def provider(self) -> str:
        return "sentence-transformers" if self._model else "hash-fallback"

    def embed(self, text: str) -> list[float]:
        if self._model is not None:
            return list(self._model.encode(text, normalize_embeddings=True))
        return self._fallback.embed(text)

    def embed_many(self, texts: list[str]) -> list[list[float]]:
        if self._model is not None:
            return [list(v) for v in self._model.encode(texts, normalize_embeddings=True)]
        return self._fallback.embed_many(texts)


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two dense vectors."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(y * y for y in b) ** 0.5
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (na * nb)


def _l2_normalize(vec: list[float]) -> list[float]:
    norm = sum(x * x for x in vec) ** 0.5
    if norm == 0.0:
        return vec
    return [x / norm for x in vec]
