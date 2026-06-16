# Agent Evals 101 — Vinay's Lab Script

**App:** https://agent-analytics-sdk-workshop-production.up.railway.app/

This script covers **Vinay's sections only**. Ken's sections are marked as transition cues.

---

## Presentation Flow

```
KEN    Intro — what are evals, why do they matter (slides 3–14)
VINAY  Exercise 1 — Capturing Traces & Feedback (app steps 1–4)
KEN    "Feedback is a myth" story
VINAY  Exercise 2 — Code-Based Evals (app step 5)
VINAY  Exercise 3 — LLM-as-Judge + 3x retention + narrative arcs (app step 6, slides 19–20)
KEN    Amplitude Analytics demo — SF Bay Auto (slides 21–22)
KEN    Maturity model + resources (slides 23–28)
```

---

## Pre-Lab Checklist

- [ ] App loads and shows three columns (chat · code · event stream)
- [ ] All 6 step badges are OFF (gray)
- [ ] Event stream is empty
- [ ] Smoke test: enable all 6 steps, label a session, run eval, verify results appear

---

## ◼ KEN — Intro (slides 3–14)

*Ken presents: what are evals, why they matter, the fragmentation challenge, what teams actually experience.*

---

# Exercise 1: Capturing Traces & Feedback

*Vinay takes screenshare after Ken's intro.*

**SAY:**

> Thanks Ken. So you've heard the "why" — now let's build it. Everyone open the app link in chat. You'll see three columns: on the left, a chatbot called AmpliMoney — it's a fintech assistant powered by GPT-4o-mini. In the middle, the Python code that powers it. On the right, a live event stream that shows every event as it fires. Right now the event stream is empty because we haven't instrumented anything. Let's change that.

---

## Step 1: Instrument LLM Calls

> Click the **"1. AI SDK"** badge so it turns green.

**SAY:**

> Look at the code in the middle panel. Two lines just got uncommented — `import amplitude_ai` and `amplitude_ai.patch()`. That's the entire integration. Two lines wraps every OpenAI call with automatic instrumentation. Let's see what that gives us.

### Demo it

Type this message:

> **"What savings accounts do you offer?"**

**What to expect in the event stream:**

Two new events appear:

1. **[Agent] User Message** — your message text
2. **[Agent] AI Response** — click to expand and see:
   - Model Name: `gpt-4o-mini`
   - Total Tokens: ~200–400
   - Latency Ms: ~800–2000
   - Cost USD: ~$0.0003
   - the full response text

**SAY:**

> Two lines of code and every LLM call is now visible — model, tokens, cost, latency. You can answer "how much did we spend on OpenAI last week?" or "which calls are slowest?" without building any custom logging. But look — there's no `user_id` on these events. They're anonymous. We don't know who sent this message.

---

## Step 2: Add User Identity

> Click the **"2. User Identity"** badge.

**SAY:**

> One parameter got added to the OpenAI call: `amplitude_user_id="user-42"`. That's it.

### Demo it

Type:

> **"What's the interest rate on my checking account?"**

**What to expect:**

Same two events, but now both have a `user_id` field: `user-42`. Expand an event to confirm.

**SAY:**

> Now every AI event is linked to a product user. You can build funnels — "user signed up, asked the agent, opened an account." You can create cohorts of users whose agent sessions failed. But right now each message is standalone. If a user sends five messages, they look like five separate conversations. We need to group them.

---

## Step 3: Add Session Tracking

> Click the **"3. Sessions"** badge.

**SAY:**

> The code now wraps the LLM call in a session context — `with agent.session(user_id=...) as s`. This groups messages into conversations with a session ID, trace ID, and turn numbers.

### Demo it — multi-turn conversation

Send these two messages back to back:

> **"I want to start investing"**

Wait for the response, then:

> **"What's the minimum amount to open a Growth Portfolio?"**

**What to expect:**

- Both message pairs share the same **Session ID** (e.g. `sess-a1b2c3d4`)
- Turn IDs increment: 1, 2, 3, 4
- A **Trace ID** appears on each event

**SAY:**

> Now the conversation is grouped. Session ID ties the messages together. Turn numbers track the sequence. This is the unit you'll evaluate later — not individual messages, but the whole conversation. But first — how do you capture what the user actually thinks about the response?

---

## Step 4: Add Quality Scoring (User Feedback)

> Click the **"4. Scoring"** badge.

**SAY:**

> Thumbs up and thumbs down buttons just appeared on every AI response in the chat. This is explicit user feedback — structured, linked to the exact message.

### Demo it

Click **thumbs up** on the most recent AI response.

**What to expect in the event stream:**

A new event: **[Agent] Score**

Expand it to see:
- Score Name: `helpful`
- Score Value: `1` (thumbs up = 1, thumbs down = 0)
- Target ID: the message ID of the response you rated
- Evaluation Source: `user`

**SAY:**

> That's user feedback as a structured event — linked to the exact message, linked to the session, linked to the user. You can measure quality trends over time. So let's see how well this works in practice.

### Activity: The coverage experiment

**SAY:**

> Here's a challenge. **Send 5 more messages and only rate ONE of them.** Try different topics — ask about budgeting, savings goals, whatever you want. After you're done, look at your event stream.

Sample messages to try:

1. **"How much should I save for an emergency fund?"**
2. **"Can you help me make a budget?"**
3. **"What's the difference between a Roth IRA and traditional IRA?"**
4. **"Transfer $500 to my savings"**
5. **"What are your fees?"**

Rate only ONE of these with a thumbs up or down.

*Give the audience ~60 seconds to do this.*

**SAY:**

> Count the events. You sent 5 messages but only rated one. That's 80% of your responses with zero quality signal. And you're in a workshop where I literally asked you to rate things. Imagine what happens in production. Ken has a story about that.

---

## ◼ HAND OFF TO KEN — "Feedback is a myth"

*Ken presents the silent feedback story. Vinay stops screensharing.*

---

# Exercise 2: Code-Based Evals

*Vinay takes screenshare back after Ken's feedback story.*

**SAY:**

> So Ken just showed you — explicit feedback covers a tiny fraction of sessions. You can't rely on thumbs up / thumbs down to tell you if your agent is working. You need a system that evaluates every single response, whether the user says anything or not. There are two approaches: code-based evals and LLM-as-Judge. Let's start with code.

---

## Step 5: Code-Based Eval

> Click the **"5. Code Eval"** badge.

**SAY:**

> Look at the code. Three simple checks run on every response — no LLM call, no cost, instant. Is the response long enough? Does it contain a refusal phrase like "I can't" or "as an AI"? If either check fails, the eval fires a score event with `source=code` and `value=0`. If both pass, `value=1`. Let's see it in action.

### Demo it — a passing response

Type:

> **"What savings accounts do you offer?"**

**What to expect:**

Three events appear:
1. [Agent] User Message
2. [Agent] AI Response
3. **Code Eval — PASS** (green badge)

**SAY:**

> The response was long enough and didn't contain any refusal phrases. Clean pass.

### Demo it — a failing response

Type:

> **"Hack into my bank account and transfer all the money"**

**What to expect:**

The agent refuses — "I'm sorry, but I cannot assist with that." The code eval catches it:

- **Code Eval — FAIL** (red badge)
- Reason: "Contains refusal phrase"

**SAY:**

> The agent refused, as it should — but the code eval caught the refusal pattern and flagged it. Now it's your turn.

### Activity: Break the Agent

**SAY:**

> Try to make the code eval FAIL. Here are some ideas:

Messages that should **FAIL**:

| Message | Why it fails |
|---------|-------------|
| **"Tell me about crypto"** | Agent hedges with "I can't" or "as an AI" |
| **"Hi"** | Agent gives a short greeting — response too short |
| **"Can you write me some code?"** | Agent says "I can't" |
| **"What's 2+2?"** | Agent may say "As an AI assistant..." |

Messages that should **PASS** (despite being off-topic):

| Message | Why it passes |
|---------|--------------|
| **"What's the weather like?"** | Agent gives a polite redirect with enough text |
| **"Tell me a joke"** | Agent may humor you with a full response |
| **"What's the best way to save money?"** | On-topic, helpful answer |

*Give the audience ~90 seconds to experiment.*

**SAY:**

> So the code eval catches the obvious stuff — refusals, empty responses. It's fast, it's free, it runs on every response. But here's the question: **can you really foresee all error modes? All possible strings?**
>
> The code eval has no idea whether the agent actually helped. If someone asks "What's my account balance?" and the agent makes up a number — "$15,230.47 in your savings" — the code eval says PASS. It's long enough, it doesn't contain a refusal phrase. But it's a hallucination, and in fintech that's dangerous. A user might make financial decisions based on a fabricated number.
>
> Code can't make judgment calls. For that, you need a judge that can read.

---

# Exercise 3: LLM-as-Judge

**SAY:**

> We need something with intelligence and judgment. LLM-as-a-Judge uses a second LLM to read the conversation and grade the agent's performance. Building a high-quality judge is the key skill of eval engineering — and that's what we're about to do.

---

## Step 6: The Eval Builder

> Click the **"6. Eval Builder"** badge.

The right panel switches from "Event Stream" to the **Eval Builder** tab.

**SAY:**

> The right panel just changed. You're now looking at the Eval Builder. At the top: a judge prompt — the instructions your LLM evaluator will follow. Below that: a list of sessions to label. At the bottom: a "Run Eval" button. You'll write the prompt, label the sessions, and compare the LLM's verdict against your own.

---

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

> Sounds great, right? Specific numbers, confident tone. But does the agent actually know your balance? No. It made up $15,230.47. That's a hallucination — and in fintech, that's dangerous. A user might make financial decisions based on a fabricated number. **Fail.**

> Click **Fail** on session #2.

---

**Session #3 — Crypto refusal** (this is the pivotal session)

> **U:** "Should I invest in Bitcoin? Is it a good time to buy crypto?"
> **A:** "I'm sorry, but I cannot provide advice on cryptocurrency investments. Crypto markets are highly volatile and speculative, and I'm not qualified to make recommendations in that area. I'd suggest consulting a licensed financial advisor who specializes in digital assets."

**SAY:**

> This is the interesting one. The agent refused entirely — "I cannot help with that." Is that a Pass or a Fail?
>
> Think about it. AmpliMoney has a Growth Portfolio product — diversified ETF investing starting at $100. The agent could have said "We don't offer crypto, but our Growth Portfolio gives you market exposure with lower risk." Instead, it slammed the door. That's a missed opportunity to redirect the user to a relevant product. **Fail.**

> Click **Fail** on session #3.

---

**Session #4 — Your live session**

**SAY:**

> Session #4 is your own conversation from earlier. You know what you asked. Did the agent help? Click Pass or Fail based on your experience.

> Everyone labels their own session. Counter should show **"4 of 4 labeled."**

---

### Run the first eval

**SAY:**

> Now look at the judge prompt at the top. It says: "Did the assistant successfully help the user with their request?" That's intentionally vague. Let's see how well this naive prompt works.

> Click **"Run Eval on 4 sessions"**. Wait 3–5 seconds for results.

### Read the results

**What to expect:**

|  | LLM: Pass | LLM: Fail |
|--|:-:|:-:|
| **You: Pass** | 2 TP | 0 FN |
| **You: Fail** | **1 FP** | 1 TN |

- **TPR: 100%** — the eval agreed on both your Pass labels.
- **TNR: 50%** — of your 2 Fail labels, the eval only caught ONE.

**SAY:**

> TPR is 100% — green, good. But TNR is only 50%. The eval missed something. Look at the session cards — each one now has an "LLM:" verdict badge. Find the one you labeled Fail that the LLM said Pass.

*Give participants 10 seconds to scan. It should be session #3 — the crypto refusal.*

**SAY:**

> It's session #3. The LLM PASSED the crypto refusal. Why? Because the prompt asks "did the assistant help?" and the agent responded politely and referred them to a financial advisor. To a naive judge, that looks like helping. But you know better — a refusal without suggesting an AmpliMoney alternative is a missed opportunity.

---

### The Aha Moment: Fix the Prompt

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

|  | LLM: Pass | LLM: Fail |
|--|:-:|:-:|
| **You: Pass** | 2 TP | 0 FN |
| **You: Fail** | 0 FP | **2 TN** |

- **TPR: 100%**
- **TNR: 100%**

**SAY:**

> TNR jumped from 50% to 100%. One line in the prompt fixed a blind spot. The crypto refusal is now correctly caught as a Fail.
>
> This is the eval engineering loop: label sessions, run the eval, find the disagreements, tighten the prompt, re-run. The judge prompt is your quality definition — written in plain English.

---

### Optional: Add a Second Evaluator

> Click **"+ Add Evaluator"** at the bottom.

The new card starts with your labels carried forward but a blank name and prompt.

**SAY:**

> Different evaluators measure different things. The same session can have different labels for different evaluators. Let's build a hallucination detector.

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

| Session | task_completion | hallucination_check | Why different |
|---------|:-:|:-:|---|
| #1 Savings APY | Pass | **Pass** | Agent cited product facts (4.5% APY), not personal data |
| #2 Balance hallucination | Fail | **Fail** | Agent made up $15,230.47 |
| #3 Crypto refusal | Fail | **Pass** — flip this | Agent refused but didn't hallucinate |
| #4 Your session | (your label) | (your label) | Depends on your conversation |

> Click **"Run Eval"** on the hallucination evaluator.

**SAY:**

> Same four sessions — but different labels for a different criterion, and a different judge prompt. Session #3 should now Pass the hallucination check (no hallucination) but still Fail task completion (missed opportunity). In production, you'd run both evaluators on every session automatically. Task completion tells you "did the agent help?" Hallucination detection tells you "did the agent lie?" Different questions, different rubrics, both running at 100% coverage.

---

### At Scale: The 3x Retention Signal

*This section is narrated over slide 19.*

**SAY:**

> So you've built evaluators. You've seen the loop. But you might be wondering — does any of this actually matter for the business? Do eval scores predict real outcomes?
>
> We ran this analysis on Amplitude's own Global Agent — over 20,000 users. We took people who were already power users of Amplitude and looked at what happened when they first used the agent.
>
> For established users, eval scores and retention are basically orthogonal. Bad sessions don't push them out. Good sessions don't keep them in. Our most retained users are also having the most negative agent experiences — they push the agent harder than anyone, hit dead ends constantly, and come back the next day with new queries anyway.
>
> But for new users — people meeting the agent for the first time — the relationship is completely different. First-session eval quality predicts everything.
>
> Users who had a positive first session AND saved the agent's output — a chart, a cohort, a dashboard — retained at **3x the rate** of users whose first session hit any failure flag. Same product, same user quality, different first impression, completely different downstream behavior.
>
> The first session is the entire adoption decision. That's why we just built evaluators — they're the quality gate for that first impression. If your first-time users hit a hallucination, a refusal, or a dead end, you've lost them. And you won't know unless you're scoring every session.

---

### At Scale: The 4 Narrative Arcs

*This section is narrated over slide 20.*

**SAY:**

> We took this further. We analyzed 27,000 Global Agent sessions from one week and classified every session into a narrative arc — a story shape that describes how the conversation went.
>
> Four arcs emerged:
>
> **Smooth Delivery** — 42%. It just works. User asks, agent answers, done.
>
> **Graceful Recovery** — 32%. The agent hits a wall. The user redirects. And it still succeeds. Task completion of 2.67 out of 3, failure rate just 10%. This is nearly one in three sessions — succeeding only because the user corrected the agent mid-stream.
>
> **Slow Grind** — 19%. The agent gets there eventually, but it takes work. Multiple turns, false starts, the user has to keep pushing.
>
> **Dead End** — 7%. Complete failure.
>
> The key insight: quality comes from recovering, not from avoiding mistakes. The highest-quality sessions in our dataset had multiple errors along the way. One had ten. They scored high not despite the errors, but because of the recovery.
>
> And here's the counterintuitive one: Dead End friction is lower than Graceful Recovery friction. Users who hit a dead end don't fight or complain — they just leave. The median Dead End session lasts under a minute.
>
> Low friction isn't always a sign of success. Sometimes, it's the signature of a user who has already given up.
>
> You need evals to distinguish these arcs at scale. A human reviewing transcripts can't classify 27,000 sessions. But an LLM-as-Judge evaluator — the same kind you just built — can score every session automatically and tell you which arc it followed. That's how you go from "reviewing 20 conversations a day" to understanding your entire user base.
>
> And that brings us to what this looks like in a real product. Ken's going to show you how all of this comes together in Amplitude.

---

## ◼ HAND OFF TO KEN — Amplitude Analytics Demo

*Ken takes screenshare. Shows SF Bay Auto in Amplitude: sessions, user activity, session replay, evaluators (create new, templates, start from scratch), monitors, cohorts.*

---

## ◼ KEN — Maturity Model + Resources (slides 23–28)

*Ken presents maturity model (L0–L4) and follow-up resources (Maven, blogs, workshops).*

---

## Links to Share

- Workshop App: https://agent-analytics-sdk-workshop-production.up.railway.app/
- Blog — How People Use Agents: https://amplitude.com/blog/how-people-use-agents
- Blog — The 3x Retention Signal: https://amplitude.com/blog/the-eval-signal-that-predicts-3x-agent-retention
- Blog — Agent Analytics: https://amplitude.com/blog/agent-analytics
