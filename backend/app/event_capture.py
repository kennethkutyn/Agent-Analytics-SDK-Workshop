"""
Event capture module.

Since amplitude-ai is not yet released, we simulate the events the SDK would produce.
The event schema matches the documented amplitude-ai event format exactly, so when the
real SDK ships, we can swap in `on_event_callback` capture with minimal changes.
"""

import time
import uuid
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
    props = {}
    if message_id:
        props["[GenAI] Message ID"] = message_id
    if session_id:
        props["[GenAI] Session ID"] = session_id
    if trace_id:
        props["[GenAI] Trace ID"] = trace_id
    if turn_id is not None:
        props["[GenAI] Turn ID"] = turn_id
    if agent_id:
        props["[GenAI] Agent ID"] = agent_id
    props["[GenAI] Content"] = content[:200] + ("..." if len(content) > 200 else "")
    props["[GenAI] Is Regeneration"] = False
    props["[GenAI] Is Edit"] = False
    props["[GenAI] SDK Version"] = "0.3.0"
    props["[GenAI] Runtime"] = "python"

    return CapturedEvent(
        event_type="[GenAI] User Message",
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
        "[GenAI] Model Name": model,
        "[GenAI] Provider": provider,
        "[GenAI] Latency Ms": round(latency_ms, 1),
        "[GenAI] Input Tokens": input_tokens,
        "[GenAI] Output Tokens": output_tokens,
        "[GenAI] Total Tokens": input_tokens + output_tokens,
        "[GenAI] Cost USD": round(cost_usd, 6),
        "[GenAI] Finish Reason": "stop",
        "[GenAI] Is Streaming": False,
        "[GenAI] Temperature": 0.7,
        "[GenAI] Model Tier": "fast",
        "[GenAI] Is Error": False,
        "[GenAI] Component Type": "llm",
        "[GenAI] SDK Version": "0.3.0",
        "[GenAI] Runtime": "python",
    }
    if message_id:
        props["[GenAI] Message ID"] = message_id
    if session_id:
        props["[GenAI] Session ID"] = session_id
    if trace_id:
        props["[GenAI] Trace ID"] = trace_id
    if turn_id is not None:
        props["[GenAI] Turn ID"] = turn_id
    if agent_id:
        props["[GenAI] Agent ID"] = agent_id
    if system_prompt:
        props["[GenAI] System Prompt"] = system_prompt[:100] + "..."
    props["[GenAI] Content"] = content[:200] + ("..." if len(content) > 200 else "")

    return CapturedEvent(
        event_type="[GenAI] AI Response",
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
        "[GenAI] SDK Version": "0.3.0",
        "[GenAI] Runtime": "python",
    }
    if session_id:
        props["[GenAI] Session ID"] = session_id
    if agent_id:
        props["[GenAI] Agent ID"] = agent_id
    props["[GenAI] Turn Count"] = turn_count

    return CapturedEvent(
        event_type="[GenAI] Session End",
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
        "[GenAI] Score Name": name,
        "[GenAI] Score Value": value,
        "[GenAI] Target ID": target_id,
        "[GenAI] Target Type": "message",
        "[GenAI] Evaluation Source": source,
        "[GenAI] SDK Version": "0.3.0",
        "[GenAI] Runtime": "python",
    }
    if session_id:
        props["[GenAI] Session ID"] = session_id

    return CapturedEvent(
        event_type="[GenAI] Score",
        user_id=user_id,
        timestamp=int(time.time() * 1000),
        properties=props,
    )
