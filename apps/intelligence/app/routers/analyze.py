"""Structured analysis endpoints — insights, sentiment, vault recommendations."""

import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.dependencies.auth import verify_jwt
from app.services.prometheus import (
    get_market_sentiment,
    get_portfolio_insights,
    get_vault_recommendations,
)

router = APIRouter(dependencies=[Depends(verify_jwt)])

_limiter = Limiter(key_func=get_remote_address)

# UUIDs and Soroban contract IDs are the only values that should appear in
# path parameters that get interpolated into LLM prompts.
_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)
_CONTRACT_ID_RE = re.compile(r"^C[A-Z0-9]{55}$")


def _validate_id(value: str, field: str) -> str:
    """Accept only UUID or Soroban contract-ID shaped strings."""
    if _UUID_RE.match(value) or _CONTRACT_ID_RE.match(value):
        return value
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Invalid {field} format",
    )


@router.get("/portfolio/{user_id}/insights")
@_limiter.limit("20/minute")
async def portfolio_insights(
    request: Request,
    user_id: str,
    claims: dict[str, Any] = Depends(verify_jwt),
) -> list[dict[str, Any]]:
    """Return AI-generated portfolio insight cards for a user.

    The path ``user_id`` must match the authenticated subject to prevent
    one user querying another's insights.
    """
    if claims.get("sub") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorised to access this user's insights",
        )
    safe_user_id = _validate_id(user_id, "user_id")
    return await get_portfolio_insights(safe_user_id)


@router.get("/market/sentiment")
@_limiter.limit("30/minute")
async def market_sentiment(request: Request) -> dict[str, Any]:
    """Return current market sentiment for the Stellar DeFi / stablecoin space."""
    return await get_market_sentiment()


@router.get("/vaults/{vault_id}/recommendations")
@_limiter.limit("20/minute")
async def vault_recommendations(
    request: Request,
    vault_id: str,
    claims: dict[str, Any] = Depends(verify_jwt),  # noqa: ARG001
) -> dict[str, Any]:
    """Return AI commentary and recommendations for a specific vault."""
    safe_vault_id = _validate_id(vault_id, "vault_id")
    return await get_vault_recommendations(safe_vault_id)
