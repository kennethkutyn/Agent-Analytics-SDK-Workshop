"""
Event capture module.

Builds CapturedEvent objects with the correct [Agent] event schema for frontend display.
Actual tracking to Amplitude is handled by the amplitude_ai SDK's instrumented OpenAI
client in chat.py.
"""

import time
import uuid

from amplitude_ai.core.tracking import (
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


def build_eval_event(
    eval_type: str,
    passed: bool,
    reason: str,
    target_id: str,
    user_id: str | None = None,
    session_id: str | None = None,
) -> CapturedEvent:
    source = "code" if eval_type == "code" else "llm_judge"
    props = {
        PROP_SCORE_NAME: f"eval_{eval_type}",
        PROP_SCORE_VALUE: 1.0 if passed else 0.0,
        PROP_TARGET_ID: target_id,
        PROP_TARGET_TYPE: "message",
        PROP_EVALUATION_SOURCE: source,
        PROP_SDK_VERSION: SDK_VERSION,
        PROP_RUNTIME: "python",
        "eval_reason": reason,
    }
    if session_id:
        props[PROP_SESSION_ID] = session_id

    return CapturedEvent(
        event_type=EVENT_SCORE,
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
