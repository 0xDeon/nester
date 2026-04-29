"""Redis-backed per-user conversation history with TTL eviction.

Replaces the previous in-memory ConversationStore to solve:
- Data loss on service restart
- Cross-instance inconsistency behind a load balancer
- Unbounded memory growth in long-running deployments

Each user's history is stored as a JSON list under key
``nester:conversation:{user_id}`` with a configurable TTL.
"""

import json
import logging

import redis

from app.config import settings

logger = logging.getLogger(__name__)

_KEY_PREFIX = "nester:conversation"


class RedisConversationStore:
    """Stores chat history in Redis, keyed by user_id.

    Each entry is a JSON-serialised list of Anthropic-format message dicts
    ({"role": "user"|"assistant", "content": str}).

    Keys expire after *ttl_seconds* of inactivity (reset on every write).
    Only the most recent *max_turns* messages are retained to cap token spend.
    """

    def __init__(
        self,
        client: redis.Redis,  # type: ignore[type-arg]
        ttl_seconds: int = 3600,
        max_turns: int = 20,
    ) -> None:
        self._redis = client
        self._ttl = ttl_seconds
        self._max_turns = max_turns

    # ------------------------------------------------------------------
    # Key helper
    # ------------------------------------------------------------------

    @staticmethod
    def _key(user_id: str) -> str:
        return f"{_KEY_PREFIX}:{user_id}"

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get(self, user_id: str) -> list[dict[str, str]]:
        raw = self._redis.get(self._key(user_id))
        if raw is None:
            return []
        try:
            history: list[dict[str, str]] = json.loads(raw)
            return history
        except (json.JSONDecodeError, TypeError):
            logger.warning("Corrupt conversation data for user %s, resetting.", user_id)
            self.clear(user_id)
            return []

    def append(self, user_id: str, role: str, content: str) -> None:
        history = self.get(user_id)
        history.append({"role": role, "content": content})

        # Trim to last max_turns messages
        if len(history) > self._max_turns:
            history = history[-self._max_turns :]

        self._redis.setex(
            self._key(user_id),
            self._ttl,
            json.dumps(history),
        )

    def clear(self, user_id: str) -> None:
        self._redis.delete(self._key(user_id))


# ---------------------------------------------------------------------------
# Module-level singleton shared across requests
# ---------------------------------------------------------------------------

def _build_store() -> RedisConversationStore:
    client: redis.Redis = redis.Redis.from_url(  # type: ignore[type-arg]
        settings.redis_url,
        decode_responses=True,
    )
    return RedisConversationStore(client, ttl_seconds=3600, max_turns=20)


store = _build_store()
