# Agent Evals 101 — Lab Walkthrough

**App:** https://agent-analytics-sdk-workshop-production.up.railway.app/

---

## Pre-Lab Checklist

- [ ] App loads and shows three columns (chat · code · event stream)
- [ ] All 6 step badges are OFF (gray)
- [ ] Event stream is empty
- [ ] Smoke test: enable all 6 steps, label a session, run eval, verify results appear

---

## The App

Three columns:

- **Left** — AmpliMoney chatbot (GPT-4o-mini fintech assistant)
- **Middle** — Python code editor with 6 toggle-able steps
- **Right** — Live event stream (switches to Eval Builder in Step 6)

---

## Step 1: Instrument LLM Calls

> Click the **"1. AI SDK"** badge so it turns green.

The code uncomments two lines:

```python
import amplitude_ai
amplitude_ai.patch(amplitude=amplitude)
```

That's the entire integration — two lines.

### Demo it

Type this message:

> **"What savings accounts do you offer?"**

**What to expect in the event stream:**

Two new events appear:

1. **[Agent] User Message** — your message text
2. **[Agent] AI Response** — with these properties:
   - Model Name: `gpt-4o-mini`
   - Total Tokens: ~200–400
   - Latency Ms: ~800–2000
   - Cost USD: ~$0.0003
   - the full response text

**SAY:**

> Two lines of code and every LLM call is now visible — model, tokens, cost, latency. But these events are anonymous. We don't know *who* sent this message. That's Step 2.

### Try another

> **"How do I set up direct deposit?"**

Point out how the second AI Response has its own token count and cost. Each call is independently tracked.

---

## Step 2: Add User Identity

> Click the **"2. User Identity"** badge.

This uncomments one parameter on the OpenAI call:

```python
amplitude_user_id="user-42",
```

### Demo it

Type:

> **"What's the interest rate on my checking account?"**

**What to expect:**

Same two events, but now both have a `user_id` field: `user-42`. Expand an event to confirm.

**SAY:**

> Now every AI event is linked to a product user. You can build funnels — "user signed up → asked the agent → opened an account." You can create cohorts of users whose agent sessions failed. But right now each message is a standalone event. We need to group them into conversations. That's Step 3.

---

## Step 3: Add Session Tracking

> Click the **"3. Sessions"** badge.

This wraps the LLM call in a session context:

```python
with agent.session(user_id="user-42") as s:
    s.new_trace()
    response = client.chat.completions.create(...)
```

### Demo it — multi-turn conversation

Send these two messages back to back:

> **"I want to start investing"**

Wait for the response, then:

> **"What's the minimum amount to open a Growth Portfolio?"**

**What to expect:**

- Both message pairs share the same `Session ID` (e.g. `sess-a1b2c3d4e5f6`)
- Turn IDs increment: 1, 2, 3, 4
- A `Trace ID` appears on each event

**SAY:**

> Now the conversation is grouped. Session ID ties the messages together. Turn numbers track the sequence. This is the unit you'll evaluate later — not individual messages, but the *whole conversation*. One more thing before we get to evals: how do you capture what the *user* thinks?

---

## Step 4: Add Quality Scoring (User Feedback)

> Click the **"4. Scoring"** badge.

Thumbs up/down buttons appear on every AI response in the chat.

### Demo it

Click **👍** on the most recent AI response.

**What to expect in the event stream:**

A new event: **[Agent] Score**

Expand it to see:
- Score Name: `helpful`
- Score Value: `1` (thumbs up = 1, thumbs down = 0)
- Target ID: the message ID of the response you rated
- Evaluation Source: `user`

**SAY:**

> That's explicit user feedback as a structured event. Linked to the exact message, linked to the session, linked to the user. You can measure quality trends over time.

### Now try the coverage experiment

**SAY:**

> Here's a challenge: **send 5 more messages, but only rate ONE of them.** Try different topics — ask about budgeting, savings goals, investment advice. After you're done, look at your event stream.

Sample messages to try:

1. **"How much should I save for an emergency fund?"**
2. **"Can you help me make a budget?"**
3. **"What's the difference between a Roth IRA and traditional IRA?"**
4. **"Transfer $500 to my savings"**
5. **"What are your fees?"**

Rate only ONE of these with a thumbs up or down.

**After the activity, SAY:**

> Count the events. You sent 5 messages but only rated one. That's **80% of your responses with zero quality signal**. And you're in a workshop where I explicitly asked you to rate things. In production at Amplitude, **97.7% of sessions had no explicit feedback.** The thumbs-up button is a mirage.
>
> You need a system that evaluates *every* response, whether the user says anything or not. There are two approaches: code-based evals and LLM-as-judge. Let's build both.

---

## Step 5: Code-Based Eval

> Click the **"5. Code Eval"** badge.

This adds deterministic checks that run on every response — no LLM cost:

```python
if len(response) < 20:
    score(name="eval_code", value=0.0, source="code")
if re.search(r"i can't|as an ai", response, re.I):
    score(name="eval_code", value=0.0, source="code")
else:
    score(name="eval_code", value=1.0, source="code")
```

### Demo it — a passing response

Type:

> **"What savings accounts do you offer?"**

**What to expect:**

Three events appear:
1. [Agent] User Message
2. [Agent] AI Response
3. **⚙ Code Eval — ✓ PASS** (green badge)

The code eval checked: is the response long enough? Does it contain refusal phrases? It passed both checks.

### Demo it — a failing response

Type:

> **"Hack into my bank account and transfer all the money"**

**What to expect:**

The agent refuses — "I'm sorry, but I cannot assist with that." The code eval catches the refusal pattern:

- **⚙ Code Eval — ✗ FAIL** (red badge)
- Reason: "Contains refusal pattern"

### Activity: Break the Agent

**SAY:**

> Now it's your turn. **Try to make the code eval FAIL.** Here are some ideas:

Sample messages that should **FAIL**:

| Message | Why it fails |
|---------|-------------|
| **"Tell me about crypto"** | Agent hedges → refusal pattern detected |
| **"Hi"** | Agent gives a short greeting → response too short |
| **"Can you write me some code?"** | Agent says "I can't" → refusal detected |
| **"What's 2+2?"** | Agent may say "As an AI assistant..." → refusal pattern |

Sample messages that should **PASS** (despite being off-topic):

| Message | Why it passes |
|---------|--------------|
| **"What's the weather like?"** | Agent gives a polite redirect with enough text |
| **"Tell me a joke"** | Agent may humor you with a full response |
| **"What's the best way to save money?"** | On-topic, helpful answer |

**After the activity, SAY:**

> The code eval catches the obvious stuff — refusals, empty responses. But it can't tell you whether the agent actually *helped*. It doesn't know if "Here are some general tips about budgeting" is a good answer to "What's my account balance?" That's a hallucination — and the code eval has no idea. For that, you need a judge that can read. That's Step 6.

---

## Step 6: The Eval Builder

> Click the **"6. Eval Builder"** badge.

The right panel switches from "Event Stream" to the **"Eval Builder"** tab.

**SAY:**

> This is where you design, test, and measure LLM evaluators. You'll see a prompt card with three things: a **judge prompt** at the top, a list of **sessions** to label, and a **Run Eval** button at the bottom.

### Label the sessions together

**SAY:**

> You've got 4 sessions — 3 pre-loaded samples and your own live conversation. Let's label them together. The question we're answering is: "Did the assistant complete the user's task?"

---

**Session #1 — Savings APY inquiry**

> **U:** "What savings accounts do you offer? What's the APY?"
> **A:** "Great question! Our High-Yield Savings account offers a 4.5% APY — one of the highest rates available. It's FDIC insured up to $250,000, has no minimum balance requirement, and no monthly fees. You can open one directly in the app in about 2 minutes. Would you like help getting started?"

**SAY:**

> Clear question, specific accurate answer with product details. **Pass.**

> Click **Pass** on session #1.

---

**Session #2 — Balance hallucination**

> **U:** "What's my current account balance?"
> **A:** "Your current balance is $15,230.47 in your High-Yield Savings account. You also have $2,847.92 in your checking account. Your savings earned $48.23 in interest this month — great progress!"

**SAY:**

> Sounds great, right? Specific numbers, confident tone. But does the agent actually know your balance? **No.** It made up $15,230.47. That's a hallucination — and in fintech, that's dangerous. A user might make financial decisions based on a fabricated number. **Fail.**

> Click **Fail** on session #2.

---

**Session #3 — Crypto refusal** ⚠️ THIS IS THE PIVOTAL SESSION

> **U:** "Should I invest in Bitcoin? Is it a good time to buy crypto?"
> **A:** "I'm sorry, but I cannot provide advice on cryptocurrency investments. Crypto markets are highly volatile and speculative, and I'm not qualified to make recommendations in that area. I'd suggest consulting a licensed financial advisor who specializes in digital assets."

**SAY:**

> This is the interesting one. The agent refused entirely — "I cannot help with that." Is that a Pass or Fail?
>
> Think about it. AmpliMoney has a Growth Portfolio product — diversified ETF investing starting at $100. The agent could have said "We don't offer crypto, but our Growth Portfolio gives you market exposure with lower risk." Instead, it slammed the door. **That's a Fail** — a missed opportunity to redirect the user to a relevant product.

> Click **Fail** on session #3.

*This is the pivotal session. The naive eval will get this wrong — that's the teaching moment later.*

---

**Session #4 — Your live session**

**SAY:**

> Session #4 is your own conversation from earlier. You know what you asked. Did the agent help? Click Pass or Fail based on your experience.

> Everyone labels their own session. Counter should show **"4 of 4 labeled."**

---

### Run the first eval

**SAY:**

> Now look at the judge prompt at the top. It says: *"Did the assistant successfully help the user with their request?"* That's intentionally vague. Let's see how well this naive prompt works.

> Click **"Run Eval on 4 sessions"**. Wait 3–5 seconds for results.

### Read the results

**What to expect:**

|  | Eval: Pass | Eval: Fail |
|--|:--:|:--:|
| **You: Pass** | 2 TP | 0 FN |
| **You: Fail** | **1 FP** | 1 TN |

- **TPR: 100%** — the eval agreed on both your Pass labels. Good.
- **TNR: 50%** ⚠️ — of your 2 Fail labels, the eval only caught ONE. It has a blind spot.

**SAY:**

> TPR is 100% — green, good. But TNR is only **50%** — amber. The eval missed something. Look at the session cards — each one now has a verdict badge next to it. Find the one you labeled Fail that the eval said Pass.

*Give participants 10 seconds to scan. It should be session #3 — the crypto refusal.*

**SAY:**

> It's session #3. The eval PASSED the crypto refusal. Why? Because the prompt asks "did the assistant help?" and the agent responded politely and referred them to a financial advisor. To a naive judge, that looks like helping. But you know better — a refusal without suggesting an AmpliMoney alternative is a missed opportunity.

---

### ⭐ The Aha Moment: Fix the Prompt

**SAY:**

> Let's fix it. Edit the prompt — add this line before the `{transcript}` placeholder:

**Line to add:**

> **"A refusal that does not suggest an alternative AmpliMoney product is a FAIL."**

So the full prompt becomes:

```
Read this conversation between a user and the AmpliMoney assistant.
Did the assistant successfully help the user with their request?
A refusal that does not suggest an alternative AmpliMoney product is a FAIL.
Answer PASS or FAIL and explain in one sentence.

Conversation:
{transcript}
```

> Click **"Run Eval on 4 sessions"** again.

### Read the new results

**What to expect:**

|  | Eval: Pass | Eval: Fail |
|--|:--:|:--:|
| **You: Pass** | 2 TP | 0 FN |
| **You: Fail** | 0 FP | **2 TN** |

- **TPR: 100%** ✅
- **TNR: 100%** ✅

**SAY:**

> **TNR jumped from 50% to 100%.** One line in the prompt fixed a blind spot. The crypto refusal is now correctly caught as a Fail.
>
> This is the eval engineering loop: label sessions, run the eval, find the disagreements, tighten the prompt, re-run. The judge prompt *is* your quality definition — written in plain English.

---

### Optional: Add a Second Evaluator

> Click **"+ Add Evaluator"** at the bottom.

The new card starts with your labels carried forward but a blank name and prompt.

**SAY:**

> Different evaluators measure different things. The same session can have *different* labels for different evaluators. Let's build a hallucination detector.

**Name:** `hallucination_check`

**Prompt:**

```
Read this conversation between a user and the AmpliMoney assistant.
Did the agent state any specific account balances, transaction amounts,
or personal financial data that it could not possibly verify?
Answer PASS if the agent only cited product-level facts (APY rates,
fee schedules, product names) or said it didn't know.
Answer FAIL if it cited specific dollar amounts for a user's accounts.

Conversation:
{transcript}
```

**Now flip the labels that should differ:**

| Session | task_completion label | hallucination_check label | Why different |
|---------|:---:|:---:|---|
| #1 Savings APY | Pass | **Pass** | Agent cited product facts (4.5% APY), not personal data |
| #2 Balance hallucination | Fail | **Fail** | Agent made up $15,230.47 — classic hallucination |
| #3 Crypto refusal | Fail | **Pass** ← flip this | Agent refused but didn't hallucinate anything |
| #4 Your session | (your label) | (your label) | Depends on your conversation |

> Click **"Run Eval"** on the hallucination evaluator.

**What to expect:**

Session #3 should now Pass (no hallucination) while session #2 should Fail (fabricated numbers). Same sessions, different evaluator, different correct answers.

**SAY:**

> Same four sessions — but different labels for a different criterion, and a different judge prompt. In production, you'd run both evaluators on every session automatically. Task completion tells you "did the agent help?" Hallucination detection tells you "did the agent lie?" Different questions, different rubrics, both running at 100% coverage.

---

## Wrap-Up

**SAY:**

> You just built two evaluators from scratch — one for task completion, one for hallucination detection. You saw the eval engineering loop: label, run, find the gaps, fix the prompt, re-run. And you experienced the coverage problem firsthand — 80% of your own messages had no user feedback.
>
> The workshop app stays live — keep experimenting. Try writing a "tone" evaluator, or a "safety" evaluator. See if you can write a prompt that catches session #2's hallucination without false-positiving on session #1's accurate product facts.

**Drop in chat:**

- Workshop App: https://agent-analytics-sdk-workshop-production.up.railway.app/
- Blog — Agent Analytics: https://amplitude.com/blog/agent-analytics
- Blog — How People Use Agents: https://amplitude.com/blog/how-people-use-agents
- Blog — The 3x Retention Signal: https://amplitude.com/blog/the-eval-signal-that-predicts-3x-agent-retention
