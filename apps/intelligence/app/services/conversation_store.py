"""Per-user conversation history with TTL eviction.

Uses Redis when INTELLIGENCE_REDIS_URL is configured so that all worker
instances share state and conversations survive restarts.  Falls back to an
in-process dict when Redis is unavailable so dev and test environments need
no extra infrastructure.
"""

import json
import logging
from datetime import UTC, datetime, timedelta
from typing import Protocol

from app.config import settings

logger = logging.getLogger(__name__)

_TTL_SECONDS = 3600  # 1 hour of inactivity
_MAX_TURNS = 20       # keep the last N messages to cap token spend
_KEY_PREFIX = "nester:conv:"


# ---------------------------------------------------------------------------
# Redis-backed store
# ---------------------------------------------------------------------------

class _RedisConversationStore:
    def __init__(self, redis_url: str) -> None:
        import redis as _redis
        self._client = _redis.from_url(redis_url, decode_responses=True)

    def _key(self, user_id: str) -> str:
        return f"{_KEY_PREFIX}{user_id}"

    def get(self, user_id: str) -> list[dict[str, str]]:
        raw: str | None = self._client.get(self._key(user_id))  # type: ignore[assignment]
        if not raw:
            return []
        try:
            return list(json.loads(raw))
        except Exception:
            return []

    def append(self, user_id: str, role: str, content: str) -> None:
        key = self._key(user_id)
        history = self.get(user_id)
        history.append({"role": role, "content": content})
        if len(history) > _MAX_TURNS:
            history = history[-_MAX_TURNS:]
        self._client.setex(key, _TTL_SECONDS, json.dumps(history))

    def clear(self, user_id: str) -> None:
        self._client.delete(self._key(user_id))


# ---------------------------------------------------------------------------
# In-memory fallback store
# ---------------------------------------------------------------------------

class _InMemoryConversationStore:
    """Stores chat history keyed by user_id with TTL eviction."""

    def __init__(self, ttl_minutes: int = 60, max_turns: int = 20) -> None:
        self._ttl = timedelta(minutes=ttl_minutes)
        self._max_turns = max_turns
        self._store: dict[str, list[dict[str, str]]] = {}
        self._touched: dict[str, datetime] = {}

    def get(self, user_id: str) -> list[dict[str, str]]:
        self._evict_stale()
        return list(self._store.get(user_id, []))

    def append(self, user_id: str, role: str, content: str) -> None:
        self._evict_stale()
        if user_id not in self._store:
            self._store[user_id] = []
        self._store[user_id].append({"role": role, "content": content})
        if len(self._store[user_id]) > self._max_turns:
            self._store[user_id] = self._store[user_id][-self._max_turns:]
        self._touched[user_id] = datetime.now(UTC)

    def clear(self, user_id: str) -> None:
        self._store.pop(user_id, None)
        self._touched.pop(user_id, None)

    def _evict_stale(self) -> None:
        cutoff = datetime.now(UTC) - self._ttl
        stale = [uid for uid, t in self._touched.items() if t < cutoff]
        for uid in stale:
            self._store.pop(uid, None)
            self._touched.pop(uid, None)


# ---------------------------------------------------------------------------
# Protocol type for type checking
# ---------------------------------------------------------------------------

class ConversationStore(Protocol):
    def get(self, user_id: str) -> list[dict[str, str]]: ...
    def append(self, user_id: str, role: str, content: str) -> None: ...
    def clear(self, user_id: str) -> None: ...


# ---------------------------------------------------------------------------
# Module-level singleton — shared across all requests in this worker
# ---------------------------------------------------------------------------

def _build_store() -> _RedisConversationStore | _InMemoryConversationStore:
    redis_url = settings.redis_url
    if redis_url:
        try:
            s = _RedisConversationStore(redis_url)
            # Cheap connectivity check at startup
            s._client.ping()
            logger.info("conversation store: redis (%s)", redis_url)
            return s
        except Exception as exc:
            logger.warning(
                "conversation store: redis unavailable (%s), using in-memory fallback", exc
            )
    else:
        logger.info(
            "conversation store: in-memory (single-instance only; "
            "set INTELLIGENCE_REDIS_URL for production)"
        )
    return _InMemoryConversationStore(ttl_minutes=60, max_turns=_MAX_TURNS)


store: _RedisConversationStore | _InMemoryConversationStore = _build_store()
