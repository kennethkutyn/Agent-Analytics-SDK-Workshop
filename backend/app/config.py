import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
AMPLITUDE_API_KEY = os.getenv("AMPLITUDE_API_KEY", "")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
