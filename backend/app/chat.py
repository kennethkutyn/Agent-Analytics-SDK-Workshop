"""
Chat handler with conditional SDK feature activation based on step config.
"""

import time
import uuid
from openai import OpenAI

from amplitude import Amplitude
from amplitude_ai import OpenAI as AmplitudeOpenAI
from amplitude_ai.core.tracking import track_score

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

# Cache instrumented clients per Amplitude API key
_instrumented_clients: dict[str, AmplitudeOpenAI] = {}


def _get_instrumented_client(amplitude_api_key: str) -> AmplitudeOpenAI:
    if amplitude_api_key not in _instrumented_clients:
        amp = Amplitude(amplitude_api_key)
        _instrumented_clients[amplitude_api_key] = AmplitudeOpenAI(
            amplitude=amp,
            api_key=OPENAI_API_KEY,
        )
    return _instrumented_clients[amplitude_api_key]


# Cache Amplitude clients for score tracking
_amplitude_clients: dict[str, Amplitude] = {}


def _get_amplitude_client(api_key: str) -> Amplitude:
    if api_key not in _amplitude_clients:
        _amplitude_clients[api_key] = Amplitude(api_key)
    return _amplitude_clients[api_key]


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

    # Decide whether to use the instrumented client (real SDK tracking)
    use_sdk = config.step_1_ai_sdk and request.amplitude_api_key and user_id
    if use_sdk:
        instrumented = _get_instrumented_client(request.amplitude_api_key)
        start_time = time.time()
        response = instrumented.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            max_tokens=500,
            temperature=0.7,
            amplitude_user_id=user_id,
            amplitude_conversation_id=session_id if config.step_3_sessions else None,
            amplitude_trace_id=trace_id,
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

    # Send score via SDK
    if request.amplitude_api_key and user_id:
        amp = _get_amplitude_client(request.amplitude_api_key)
        track_score(
            amplitude=amp,
            user_id=user_id,
            name="helpful",
            value=1.0 if request.thumbs_up else 0.0,
            target_id=request.message_id,
            source="user",
            session_id=request.session_id if request.config.step_3_sessions else None,
        )
        amp.flush()

    return events
