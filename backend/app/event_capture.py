"""
Event capture module.

Uses the amplitude_ai SDK to track events with the correct [Agent] event schema.
Also builds CapturedEvent objects with matching property names for frontend display.
"""

import logging
import time
import uuid

from amplitude import Amplitude

from amplitude_ai.core.tracking import (
    track_user_message,
    track_ai_message,
    track_session_end,
    track_score,
    EVENT_USER_MESSAGE,
    EVENT_AI_RESPONSE,
    EVENT_SESSION_END,
    EVENT_SCORE,
    PROP_SESSION_ID,
    PROP_TRACE_ID,
    PROP_TURN_ID,
    PROP_MESSAGE_ID,
    PROP_AGENT_ID,
    PROP_MODEL_NAME,
    PROP_PROVIDER,
    PROP_LATENCY_MS,
    PROP_INPUT_TOKENS,
    PROP_OUTPUT_TOKENS,
    PROP_TOTAL_TOKENS,
    PROP_COST_USD,
    PROP_FINISH_REASON,
    PROP_IS_STREAMING,
    PROP_TEMPERATURE,
    PROP_MODEL_TIER,
    PROP_IS_ERROR,
    PROP_COMPONENT_TYPE,
    PROP_SDK_VERSION,
    PROP_RUNTIME,
    PROP_IS_REGENERATION,
    PROP_IS_EDIT,
    PROP_SYSTEM_PROMPT,
    PROP_SCORE_NAME,
    PROP_SCORE_VALUE,
    PROP_TARGET_ID,
    PROP_TARGET_TYPE,
    PROP_EVALUATION_SOURCE,
    SDK_VERSION,
)

from .models import CapturedEvent

logger = logging.getLogger(__name__)

# Cache Amplitude client instances per API key to reuse connections
_amplitude_clients: dict[str, Amplitude] = {}


def _get_amplitude_client(api_key: str) -> Amplitude:
    if api_key not in _amplitude_clients:
        client = Amplitude(api_key)
        _amplitude_clients[api_key] = client
    return _amplitude_clients[api_key]


def send_events_to_amplitude(
    events: list[CapturedEvent],
    api_key: str,
    *,
    user_id: str | None = None,
    session_id: str | None = None,
    trace_id: str | None = None,
    agent_id: str | None = None,
    system_prompt: str | None = None,
    model: str | None = None,
    provider: str | None = None,
    latency_ms: float | None = None,
    input_tokens: int | None = None,
    output_tokens: int | None = None,
    cost_usd: float | None = None,
    temperature: float | None = None,
    is_streaming: bool | None = None,
    turn_id_user: int | None = None,
    turn_id_ai: int | None = None,
    message_id_user: str | None = None,
    message_id_ai: str | None = None,
    message_content_user: str | None = None,
    message_content_ai: str | None = None,
    score_name: str | None = None,
    score_value: float | None = None,
    score_target_id: str | None = None,
    score_source: str | None = None,
) -> None:
    """Forward events to Amplitude using the amplitude_ai SDK tracking functions."""
    if not api_key or not events:
        return
    client = _get_amplitude_client(api_key)
    resolved_user_id = user_id or "anonymous"

    for event in events:
        if event.event_type == EVENT_USER_MESSAGE and message_content_user:
            track_user_message(
                amplitude=client,
                user_id=resolved_user_id,
                message_content=message_content_user,
                session_id=session_id,
                trace_id=trace_id,
                turn_id=turn_id_user or 1,
                message_id=message_id_user,
                agent_id=agent_id,
            )
        elif event.event_type == EVENT_AI_RESPONSE and message_content_ai and model and provider:
            track_ai_message(
                amplitude=client,
                user_id=resolved_user_id,
                model_name=model,
                provider=provider,
                response_content=message_content_ai,
                latency_ms=latency_ms or 0,
                session_id=session_id,
                trace_id=trace_id,
                turn_id=turn_id_ai or 2,
                message_id=message_id_ai,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_cost_usd=cost_usd,
                system_prompt=system_prompt,
                temperature=temperature,
                is_streaming=is_streaming,
                agent_id=agent_id,
            )
        elif event.event_type == EVENT_SESSION_END:
            track_session_end(
                amplitude=client,
                user_id=resolved_user_id,
                session_id=session_id or "",
                agent_id=agent_id,
            )
        elif event.event_type == EVENT_SCORE and score_name and score_target_id:
            track_score(
                amplitude=client,
                user_id=resolved_user_id,
                name=score_name,
                value=score_value or 0.0,
                target_id=score_target_id,
                source=score_source or "user",
                session_id=session_id,
                agent_id=agent_id,
            )

    client.flush()


def generate_message_id() -> str:
    return f"msg-{uuid.uuid4().hex[:12]}"


def generate_session_id() -> str:
    return f"sess-{uuid.uuid4().hex[:12]}"


def build_user_message_event(
    content: str,
    user_id: str | None = None,
    session_id: str | None = None,
    trace_id: str | None = None,
    turn_id: int | None = None,
    agent_id: str | None = None,
    message_id: str | None = None,
) -> CapturedEvent:
    props = {
        PROP_COMPONENT_TYPE: "user_input",
        PROP_SDK_VERSION: SDK_VERSION,
        PROP_RUNTIME: "python",
    }
    if message_id:
        props[PROP_MESSAGE_ID] = message_id
    if session_id:
        props[PROP_SESSION_ID] = session_id
    if trace_id:
        props[PROP_TRACE_ID] = trace_id
    if turn_id is not None:
        props[PROP_TURN_ID] = turn_id
    if agent_id:
        props[PROP_AGENT_ID] = agent_id
    props["$llm_message"] = content[:200] + ("..." if len(content) > 200 else "")
    props[PROP_IS_REGENERATION] = False
    props[PROP_IS_EDIT] = False

    return CapturedEvent(
        event_type=EVENT_USER_MESSAGE,
        user_id=user_id,
        timestamp=int(time.time() * 1000),
        properties=props,
    )


def build_ai_response_event(
    content: str,
    model: str,
    provider: str,
    latency_ms: float,
    input_tokens: int,
    output_tokens: int,
    cost_usd: float,
    user_id: str | None = None,
    session_id: str | None = None,
    trace_id: str | None = None,
    turn_id: int | None = None,
    agent_id: str | None = None,
    message_id: str | None = None,
    system_prompt: str | None = None,
) -> CapturedEvent:
    props = {
        PROP_MODEL_NAME: model,
        PROP_PROVIDER: provider,
        PROP_LATENCY_MS: round(latency_ms, 1),
        PROP_INPUT_TOKENS: input_tokens,
        PROP_OUTPUT_TOKENS: output_tokens,
        PROP_TOTAL_TOKENS: input_tokens + output_tokens,
        PROP_COST_USD: round(cost_usd, 6),
        PROP_FINISH_REASON: "stop",
        PROP_IS_STREAMING: False,
        PROP_TEMPERATURE: 0.7,
        PROP_MODEL_TIER: "fast",
        PROP_IS_ERROR: False,
        PROP_COMPONENT_TYPE: "llm",
        PROP_SDK_VERSION: SDK_VERSION,
        PROP_RUNTIME: "python",
    }
    if message_id:
        props[PROP_MESSAGE_ID] = message_id
    if session_id:
        props[PROP_SESSION_ID] = session_id
    if trace_id:
        props[PROP_TRACE_ID] = trace_id
    if turn_id is not None:
        props[PROP_TURN_ID] = turn_id
    if agent_id:
        props[PROP_AGENT_ID] = agent_id
    if system_prompt:
        props[PROP_SYSTEM_PROMPT] = system_prompt[:100] + "..."
    props["$llm_message"] = content[:200] + ("..." if len(content) > 200 else "")

    return CapturedEvent(
        event_type=EVENT_AI_RESPONSE,
        user_id=user_id,
        timestamp=int(time.time() * 1000),
        properties=props,
    )


def build_session_end_event(
    user_id: str | None = None,
    session_id: str | None = None,
    agent_id: str | None = None,
    turn_count: int = 0,
) -> CapturedEvent:
    props = {
        PROP_SDK_VERSION: SDK_VERSION,
        PROP_RUNTIME: "python",
    }
    if session_id:
        props[PROP_SESSION_ID] = session_id
    if agent_id:
        props[PROP_AGENT_ID] = agent_id
    props[PROP_TURN_ID] = turn_count

    return CapturedEvent(
        event_type=EVENT_SESSION_END,
        user_id=user_id,
        timestamp=int(time.time() * 1000),
        properties=props,
    )


def build_score_event(
    name: str,
    value: float,
    target_id: str,
    source: str = "user",
    user_id: str | None = None,
    session_id: str | None = None,
) -> CapturedEvent:
    props = {
        PROP_SCORE_NAME: name,
        PROP_SCORE_VALUE: value,
        PROP_TARGET_ID: target_id,
        PROP_TARGET_TYPE: "message",
        PROP_EVALUATION_SOURCE: source,
        PROP_SDK_VERSION: SDK_VERSION,
        PROP_RUNTIME: "python",
    }
    if session_id:
        props[PROP_SESSION_ID] = session_id

    return CapturedEvent(
        event_type=EVENT_SCORE,
        user_id=user_id,
        timestamp=int(time.time() * 1000),
        properties=props,
    )
