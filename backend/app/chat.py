"""
Chat handler with conditional SDK feature activation based on step config.
"""

import time
import uuid
from openai import OpenAI

from amplitude import Amplitude
from amplitude_ai import AmplitudeAI, OpenAI as AmplitudeOpenAI

from .config import OPENAI_API_KEY, OPENAI_MODEL
from .system_prompt import SYSTEM_PROMPT
from .models import ChatRequest, ChatResponse, CapturedEvent, ScoreRequest
from .event_capture import (
    generate_message_id,
    generate_session_id,
    build_user_message_event,
    build_ai_response_event,
    build_score_event,
)

# Plain OpenAI client (no tracking) used when step_1 is off
plain_client = OpenAI(api_key=OPENAI_API_KEY)

# Cache fully-instrumented SDK stacks per Amplitude API key
_sdk_stacks: dict[str, dict] = {}


def _get_sdk_stack(amplitude_api_key: str) -> dict:
    """Return cached {ai, openai, agent} for this API key."""
    if amplitude_api_key not in _sdk_stacks:
        ai = AmplitudeAI(amplitude=Amplitude(amplitude_api_key))
        openai_client = AmplitudeOpenAI(amplitude=ai, api_key=OPENAI_API_KEY)
        agent = ai.agent("amplimoney-chatbot")
        _sdk_stacks[amplitude_api_key] = {
            "ai": ai,
            "openai": openai_client,
            "agent": agent,
        }
    return _sdk_stacks[amplitude_api_key]


# Cost estimates per 1M tokens for gpt-4o-mini
COST_PER_INPUT_TOKEN = 0.15 / 1_000_000
COST_PER_OUTPUT_TOKEN = 0.60 / 1_000_000


def handle_chat(request: ChatRequest) -> ChatResponse:
    config = request.config
    events: list[CapturedEvent] = []

    # Build message history for OpenAI
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in request.history[-10:]:  # Sliding window of last 10
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": request.message})

    # Resolve session_id
    session_id = request.session_id or generate_session_id()

    # Resolve user_id based on step 2
    user_id = "user-42" if config.step_2_user_identity else None

    # Resolve agent context based on step 3
    agent_id = "amplimoney-chatbot" if config.step_3_sessions else None
    trace_id = f"trace-{uuid.uuid4().hex[:8]}" if config.step_3_sessions else None

    # Generate message IDs
    user_msg_id = generate_message_id()
    ai_msg_id = generate_message_id()

    # Use the full SDK instrumentation (agent + session + provider wrapper)
    use_sdk = config.step_1_ai_sdk and request.amplitude_api_key and user_id
    if use_sdk:
        stack = _get_sdk_stack(request.amplitude_api_key)
        instrumented = stack["openai"]
        agent = stack["agent"]

        with agent.session(
            user_id=user_id,
            session_id=session_id if config.step_3_sessions else None,
            track_session_end=False,
        ) as session:
            session.track_user_message(request.message)

            start_time = time.time()
            response = instrumented.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
                max_tokens=500,
                temperature=0.7,
                amplitude_user_id=user_id,
            )
            latency_ms = (time.time() - start_time) * 1000
    else:
        start_time = time.time()
        response = plain_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            max_tokens=500,
            temperature=0.7,
        )
        latency_ms = (time.time() - start_time) * 1000

    ai_content = response.choices[0].message.content or ""
    input_tokens = response.usage.prompt_tokens if response.usage else 0
    output_tokens = response.usage.completion_tokens if response.usage else 0
    cost_usd = (input_tokens * COST_PER_INPUT_TOKEN) + (output_tokens * COST_PER_OUTPUT_TOKEN)

    # Build events for frontend display regardless of SDK tracking
    if config.step_1_ai_sdk:
        events.append(
            build_user_message_event(
                content=request.message,
                user_id=user_id,
                session_id=session_id if config.step_3_sessions else None,
                trace_id=trace_id,
                turn_id=1 if config.step_3_sessions else None,
                agent_id=agent_id,
                message_id=user_msg_id,
            )
        )
        events.append(
            build_ai_response_event(
                content=ai_content,
                model=response.model or OPENAI_MODEL,
                provider="openai",
                latency_ms=latency_ms,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                cost_usd=cost_usd,
                user_id=user_id,
                session_id=session_id if config.step_3_sessions else None,
                trace_id=trace_id,
                turn_id=2 if config.step_3_sessions else None,
                agent_id=agent_id,
                message_id=ai_msg_id,
                system_prompt=SYSTEM_PROMPT if config.step_3_sessions else None,
            )
        )

    return ChatResponse(
        response=ai_content,
        events=events,
        session_id=session_id,
        message_id=ai_msg_id,
    )


def handle_score(request: ScoreRequest) -> list[CapturedEvent]:
    if not request.config.step_4_scoring:
        return []

    user_id = "user-42" if request.config.step_2_user_identity else None

    event = build_score_event(
        name="helpful",
        value=1.0 if request.thumbs_up else 0.0,
        target_id=request.message_id,
        source="user",
        user_id=user_id,
        session_id=request.session_id if request.config.step_3_sessions else None,
    )
    events = [event]

    # Send score via SDK session
    if request.amplitude_api_key and user_id:
        stack = _get_sdk_stack(request.amplitude_api_key)
        agent = stack["agent"]

        with agent.session(
            user_id=user_id,
            session_id=request.session_id if request.config.step_3_sessions else None,
            track_session_end=False,  # Don't fire Session End for a score-only call
        ) as session:
            session.score(
                name="helpful",
                value=1.0 if request.thumbs_up else 0.0,
                target_id=request.message_id,
                source="user",
            )

    return events
