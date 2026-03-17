export const CODE_TEMPLATE = `# ========================================
# AmpliMoney AI Chatbot - app.py
# ========================================

from openai import OpenAI
from amplitude import Amplitude

# Initialize clients
client = OpenAI(api_key="sk-...")
amplitude = Amplitude("YOUR_AMPLITUDE_API_KEY")


# ------ STEP 1: Add AI SDK ------
# Uncomment these 2 lines to instrument all LLM calls:
#
# import amplitude_ai
# amplitude_ai.patch(amplitude=amplitude)
#
# That's it! Every OpenAI call now auto-tracks:
# - [GenAI] User Message
# - [GenAI] AI Response (with tokens, cost, latency)
# -------------------------------------


def handle_message(user_message):
    """Process a user message and return AI response."""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are AmpliMoney's helpful assistant..."},
            {"role": "user", "content": user_message},
        ],
        # ------ STEP 2: Add user identity ------
        # Uncomment to link AI events to your product user:
        # amplitude_user_id="user-42",
        # Now AI events join with product events for funnels!
        # ----------------------------------------------
    )

    return response.choices[0].message.content


# ------ STEP 3: Add session tracking ------
# Uncomment to group conversations into sessions:
#
# from amplitude_ai import AmplitudeAI
# ai = AmplitudeAI(amplitude=amplitude)
# agent = ai.agent("amplimoney-chatbot", env="workshop")
#
# with agent.session(user_id="user-42") as s:
#     s.new_trace()
#     s.track_user_message(content=user_message)
#     response = client.chat.completions.create(
#         model="gpt-4o-mini",
#         messages=[...],
#     )
#     # Session auto-ends, enrichments kick in
# -----------------------------------------------


# ------ STEP 4: Add quality scoring ------
# Uncomment to capture user feedback as events:
#
# s.score(
#     name="helpful",
#     value=1.0,          # 1.0 = thumbs up, 0.0 = thumbs down
#     target_id=msg_id,   # Links score to specific AI response
#     source="user",
# )
#
# Build cohorts of users with low scores,
# measure quality trends over time!
# ----------------------------------------------
`;
