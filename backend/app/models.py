from pydantic import BaseModel, Field


class StepConfig(BaseModel):
    step_1_ai_sdk: bool = False
    step_2_user_identity: bool = False
    step_3_sessions: bool = False
    step_4_scoring: bool = False
    step_5_code_eval: bool = False
    step_6_llm_judge: bool = False


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(max_length=500)
    history: list[ChatMessage] = Field(default_factory=list, max_length=10)
    config: StepConfig = Field(default_factory=StepConfig)
    session_id: str | None = None
    amplitude_api_key: str | None = None
    judge_prompt: str | None = None


class CapturedEvent(BaseModel):
    event_type: str
    user_id: str | None = None
    timestamp: int | None = None
    properties: dict = Field(default_factory=dict)


class ChatResponse(BaseModel):
    response: str
    events: list[CapturedEvent] = Field(default_factory=list)
    session_id: str | None = None
    message_id: str | None = None


class ScoreRequest(BaseModel):
    session_id: str
    message_id: str
    thumbs_up: bool
    config: StepConfig = Field(default_factory=StepConfig)
    amplitude_api_key: str | None = None
