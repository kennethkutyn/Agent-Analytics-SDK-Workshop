"""
Eval functions for the workshop.

Two evaluator types that run on every AI response:
- Code-based: deterministic, fast, free
- LLM-as-Judge: live OpenAI call, nuanced, ~$0.0001/eval
"""

import re

from openai import OpenAI

from .config import OPENAI_API_KEY

_judge_client: OpenAI | None = None


def _get_judge_client() -> OpenAI:
    global _judge_client
    if _judge_client is None:
        _judge_client = OpenAI(api_key=OPENAI_API_KEY)
    return _judge_client

REFUSAL_PATTERNS = [
    r"\bi(?:'m| am) (?:not able|unable)\b",
    r"\bi (?:don'?t|do not) (?:have|know)\b",
    r"\bi (?:can'?t|cannot)\b",
    r"\bas an ai\b",
    r"\bi'?m sorry,? (?:but )?i\b",
]

_refusal_re = re.compile("|".join(REFUSAL_PATTERNS), re.IGNORECASE)

DEFAULT_JUDGE_PROMPT = (
    "Did the agent complete the user's request? "
    "User asked: {user_message} "
    "Agent responded: {ai_response} "
    "Answer PASS or FAIL and explain in one sentence."
)


def run_code_eval(ai_response: str, user_message: str) -> dict:
    """Deterministic quality checks. Returns {"passed": bool, "reason": str}."""
    if len(ai_response.strip()) < 20:
        return {"passed": False, "reason": "Response too short (< 20 chars)"}

    if _refusal_re.search(ai_response):
        return {"passed": False, "reason": "Contains refusal phrase"}

    return {"passed": True, "reason": "Passed all checks"}


def run_llm_eval(
    ai_response: str,
    user_message: str,
    judge_prompt: str | None = None,
) -> dict:
    """LLM-as-Judge eval. Returns {"passed": bool, "rationale": str}."""
    template = judge_prompt or DEFAULT_JUDGE_PROMPT
    prompt = template.format(
        user_message=user_message[:500],
        ai_response=ai_response[:500],
    )

    try:
        client = _get_judge_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=100,
            temperature=0,
        )
        verdict_text = response.choices[0].message.content or ""
        passed = "PASS" in verdict_text.upper() and "FAIL" not in verdict_text.upper()
        return {"passed": passed, "rationale": verdict_text.strip()}
    except Exception as e:
        return {"passed": True, "rationale": f"Judge error: {e}"}
