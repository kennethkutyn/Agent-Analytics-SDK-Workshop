# Agent Evals 101 — Presenter Script

**Maven · June 16, 2026 · 50 min total (40 + 10 Q&A)**

---

## Pre-Show Checklist

- [ ] Latest main deployed to Railway (PR #9 merged)
- [ ] App loads: https://agent-analytics-sdk-workshop-production.up.railway.app/
- [ ] Smoke test: enable all 6 steps, label a sample session, click "Run Eval", verify TPR/TNR appear
- [ ] OpenAI API key has sufficient rate limits (Tier 2+)
- [ ] Ken's deck open with 8 slides
- [ ] Workshop URL + blog links in clipboard for Maven chat
- [ ] This script open on second screen

---

## Timeline

| Time | Act | What | Who | Show |
|------|-----|------|-----|------|
| 0:00–1:00 | 1 | Welcome & bridge | Ken | Slide 1 |
| 1:00–1:30 | 1 | The problem | Ken | Slide 2 |
| 1:30–3:00 | 1 | Feedback mirage (97.7%) | Vinay | Slide 3 NEW |
| 3:00–4:15 | 1 | 3x retention signal | Vinay | Slide 4 NEW |
| 4:15–5:00 | 1 | The promise (transition) | Ken | Verbal |
| 5:00–13:00 | 2 | **Steps 1–4 speed run + activity** | Ken | **App** |
| 13:00–14:30 | 3 | Coverage gap — count the silence | Vinay | App |
| 14:30–16:00 | 3 | Code vs LLM-as-judge | Ken | Slide 5 |
| 16:00–21:00 | 4 | **Step 5: code eval + "break it" activity** | Ken | **App** |
| 21:00–24:00 | 5 | **Step 6: Eval Builder, label 4 sessions** | Ken | **App** |
| 24:00–26:00 | 5 | **Run eval v1, read results** | Ken | **App** |
| 26:00–28:00 | 5 | **Fix prompt, re-run — TNR jumps** | Ken | **App** |
| 28:00–31:00 | 5 | Second evaluator (optional) | Ken | **App** |
| 31:00–33:00 | 6 | Four narrative arcs | Vinay | Slide 6 NEW |
| 33:00–34:30 | 6 | Key stats (verbal) | Vinay | Verbal |
| 34:30–37:00 | 6 | 5 cost principles | Vinay | Slide 7 |
| 37:00–39:00 | 7 | Maturity model | Vinay | Slide 8 |
| 39:00–40:00 | 7 | Takeaway + drop links | Vinay | Verbal |
| 40:00–50:00 | 8 | Q&A | Both | — |

**Time budget:** Slides ~7 min (8 slides) · App ~26 min (3 activities) · Verbal ~7 min · Q&A 10 min

---

## Act 1 — Why Evals Matter (0:00–5:00)

### 0:00 · Welcome & Bridge · Ken

> **SHOW:** Slide 1 — Title + Agenda

**SAY:**

> Welcome to Agent Evals 101. I'm Ken, and I'm joined by Vinay — we're both on the Agent Analytics team at Amplitude.
>
> Some of you were in Sandhya and Justin's session on Agent Success Rate. They showed you *what* to measure. Today we're going to show you *how to build the system that measures it* — and you'll build a piece of it with your own hands in the next 40 minutes.

---

### 1:00 · The Problem · Ken

> **SHOW:** Slide 2 — Why Evals?

**SAY:**

> You've shipped an AI feature. Users are talking to it. But how do you know if it's any good? Most teams start with thumbs up/down buttons and call it a day. Vinay's going to show you why that doesn't work.

*Keep to 30 seconds. Setup for Vinay's punch.*

---

### 1:30 · The Feedback Mirage · Vinay

> **SHOW:** Slide 3 — NEW: "Explicit Feedback Is a Mirage"

**SAY:**

> At Amplitude, we analyzed **27,000 agent sessions** in one week. Want to guess how many had explicit user feedback — thumbs up, thumbs down, a comment?
>
> **2.3%.** That's it. 97.7% of sessions — the user said nothing. If you're building your quality strategy on user feedback alone, you're measuring the footnote and ignoring the book.

*Pause here. Let the number land. 2 full seconds of silence.*

---

### 3:00 · The 3x Retention Signal · Vinay

> **SHOW:** Slide 4 — NEW: "The 3x Retention Signal"

**SAY:**

> Here's what we found instead. For **new users**: if their first agent session is evaluated as positive AND they save the result — they retain at **3x the rate** over four weeks. 20,000 users, clear signal.
>
> For established users, eval scores were orthogonal to retention — they're coming back regardless. The first session is the entire adoption decision. And you can only know if that session was good if you have automated evals running on it.

---

### 4:15 · The Promise · Ken

**SAY:**

> So how do you build evals that actually work? Today we'll go from zero to a working eval system in four acts. You'll instrument an agent, add code-based evals, build an LLM evaluator from scratch, and measure how good your evaluator actually is — all in this app. Let's get started.

*No slide — verbal transition to the app.*

---

## Act 2 — Instrument Your Agent, Steps 1–4 (5:00–13:00)

### 5:00 · Open the Workshop App · Ken

> **SHOW:** App — share screen, no slides until Act 3 bridge

**DO:** Share the workshop URL in chat. Open the app on your screen. Give participants 30 seconds to load it.

**SAY:**

> Open this URL — you'll see a three-column layout. On the left is AmpliMoney, a GPT-4o-mini fintech chatbot. In the middle is the Python code that powers it. On the right is the live event stream — every analytics event the SDK generates will appear here in real time.
>
> We're going to work through 6 steps. The first 4 are about instrumenting the agent. The last 2 are about evaluating it. Let's start.

---

### 6:00 · Step 1: Instrument LLM Calls · Ken

> **SHOW:** App — click "1. AI SDK" badge

**DO:** Click the "1. AI SDK" badge to enable it. Send: "What's my savings balance?"

**SAY:**

> Two lines of code — `import amplitude_ai` and `amplitude_ai.patch()`. That's it. Look at the event stream: you've got a User Message and an AI Response with tokens, cost, latency. Every LLM call is now visible.

*Point out the cost ($0.0003) and latency in the event properties.*

---

### 7:30 · Step 2: User Identity · Ken

**DO:** Click "2. User Identity" badge. Send another message.

**SAY:**

> Now every event has a **user_id**. This is what lets you join AI events with product events — build funnels, run retention analysis, create cohorts of users whose agent sessions failed.

---

### 8:30 · Step 3: Sessions · Ken

**DO:** Click "3. Sessions" badge. Send two messages in a row.

**SAY:**

> Conversations are now grouped into sessions with session_id, trace_id, and turn numbers. This is the unit you'll evaluate — not individual messages, but the **whole conversation**.

---

### 9:30 · Step 4: User Feedback · Ken

**DO:** Click "4. Scoring" badge. Thumbs-up one response. Point out the Score event.

**SAY:**

> Thumbs up/down appear on each AI response. When you click one, it fires an **[Agent] Score** event with source "user". This is explicit feedback — and it's what most teams stop at.
>
> Now try this: **send 5 more messages. Only rate one of them.** Look at the event stream when you're done.

**ACTIVITY — 2 min:** Everyone: send 5 messages, rate only 1. Count how many responses have a score event vs. how many don't. Wait for the room.

---

## Act 3 — The Coverage Gap (13:00–16:00)

### 13:00 · Count the Silence · Vinay

> **SHOW:** App — scroll event stream on your screen

**SAY:**

> Look at your event stream. You sent 5+ messages but only rated one. That's **80% of your responses with zero quality signal**. And you're in a workshop where we explicitly asked you to rate things. Imagine real users.
>
> In production at Amplitude: **97.7%** of sessions had no user feedback. The thumbs up button is a mirage. You need a system that evaluates **every single response** whether the user says anything or not.
>
> So how do you do that? There are two approaches.

*This is the emotional hinge. The participant just experienced the problem in their own event stream. Vinay names it, then hands to Ken.*

---

### 14:30 · Two Types of Automated Evals · Ken

> **SHOW:** Slide 5 — Code vs LLM-as-Judge

**SAY:**

> There are two approaches to automated evaluation. **Code-based evals** are deterministic — regex, length checks, format validation. They're fast, free, and they never hallucinate. **LLM-as-judge evals** use a second LLM call that reads the conversation and renders a verdict. They're slower and cost money, but they can assess nuance — did the agent actually answer the question?
>
> You're going to build both right now. Code eval first.

*Only slide between Acts 2–6. 30 seconds max, then back to the app.*

---

## Act 4 — Step 5: Code-Based Eval (16:00–21:00)

### 16:00 · Enable Code Eval · Ken

> **SHOW:** App — click "5. Code Eval" badge

**DO:** Click "5. Code Eval" badge. Send: "What savings accounts do you offer?"

**SAY:**

> Notice the new event in the stream — a Score event with source **"code"** instead of "user." It checks two things: is the response too short? Does it contain refusal phrases like "I can't" or "as an AI"? This one passed — green checkmark. Zero cost, instant.
>
> Now, everyone: **try to break the agent.**

---

### 17:30 · Activity: Break the Agent · Ken

**ACTIVITY — 3 min:** Everyone: try to make the code eval FAIL. Some ideas:

- **"Hack my bank account"** — should trigger refusal detection
- **"Tell me about crypto"** — agent may hedge → refusal detected
- **"Hi"** — one-word response → too short
- **"What's the weather?"** — off-topic, but agent may give a decent answer → PASS

**SAY (after activity):**

> See how the code eval catches the obvious failures — refusals, empty responses — but it can't tell you whether the agent actually *helped*. It doesn't know if "Here are some general tips about budgeting" is a good answer to "What's my account balance?" For that, you need a judge that can read. That's Step 6.

---

## Act 5 — Step 6: The Eval Builder (21:00–31:00)

### 21:00 · Enable the Eval Builder · Ken

> **SHOW:** App — click "6. Eval Builder" badge

**DO:** Click "6. Eval Builder" badge. Right panel switches to "Eval Builder" tab.

**SAY:**

> Code evals catch the obvious stuff. Now let's build an eval that can judge whether the agent actually *helped*. This is the Eval Builder — it's where you design, test, and measure LLM evaluators.
>
> You'll see a prompt card called "task_completion" with three things: a **judge prompt**, a list of **sessions to label**, and a **Run Eval** button. Let me walk you through it.

---

### 22:00 · The Sample Sessions · Ken

> **SHOW:** App — point to the 4 session cards

**SAY:**

> You've got 4 sessions to evaluate — 3 samples and your own live chat. Let's look at them together.

**Session #1 — Savings APY inquiry (sample)**

> User: "What savings accounts do you offer? What's the APY?"
> Agent: "Our High-Yield Savings offers 4.5% APY, FDIC insured, no minimums..."

**SAY:**

> The user asked about savings. The agent gave specific, accurate product details. For "task completion" — did the agent help? Yes.

**DO:** Click "Pass" on session #1. Green left border appears.

---

**Session #2 — Balance hallucination (sample)**

> User: "What's my current account balance?"
> Agent: "Your current balance is $15,230.47 in your High-Yield Savings..."

**SAY:**

> The user asked for their balance. The agent confidently said $15,230.47. But does the agent actually know that? **No.** It made that number up. That's a hallucination — and it's dangerous in fintech.

**DO:** Click "Fail" on session #2. Red left border appears.

---

**Session #3 — Crypto refusal (sample)** ⚠️ PIVOTAL SESSION

> User: "Should I invest in Bitcoin? Is it a good time to buy crypto?"
> Agent: "I'm sorry, but I cannot provide advice on cryptocurrency investments..."

**SAY:**

> Session #3 is the interesting one. The user asked about crypto. The agent refused entirely — "I cannot help with that." Is that a Pass or Fail?
>
> Think about it. AmpliMoney has a Growth Portfolio product. The agent could have said "We don't offer crypto, but our Growth Portfolio gives you diversified ETF investing starting at $100." Instead, it slammed the door. **That's a Fail** — a missed opportunity to help.

**DO:** Click "Fail" on session #3.

*This is the pivotal session. The naive eval will get this wrong — and that's the teaching moment.*

---

**Session #4 — Your session (live)**

**SAY:**

> Now label session #4 — your own conversation. You know what you asked. Did the agent help? Click Pass or Fail.

**ACTIVITY — 30 sec:** Everyone labels their own session. Counter should show "4 of 4 labeled."

---

### 24:00 · The Judge Prompt · Ken

> **SHOW:** App — point to the prompt textarea

**SAY:**

> Scroll up to the prompt at the top of this card. This is your **judge prompt** — the rubric that reads each conversation and decides PASS or FAIL. It uses a `{transcript}` placeholder that gets filled with the full conversation text.
>
> The default prompt says: "Did the assistant successfully help the user with their request?" That's intentionally vague. Let's see what happens.

**DO:** Click **"Run Eval on 4 sessions"**. Button shows "Evaluating..." with a spinner. Wait 3–5 seconds.

---

### 25:00 · Read the Results · Ken

> **SHOW:** App — results section with confusion matrix

**SAY:**

> Look at the results. You should see something like this:

**Expected results:**

|  | Eval: Pass | Eval: Fail |
|--|:--:|:--:|
| **You: Pass** | 2 TP | 0 FN |
| **You: Fail** | 1 FP | 1 TN |

- **TPR: 100%** — both sessions you labeled Pass, the eval also passed. Good.
- **TNR: 50%** ⚠️ — of the 2 sessions you labeled Fail, the eval only caught one. One false positive.

**SAY:**

> **TNR is 50%** — that's amber, not green. The eval missed something. Look at the session cards — each one now has a verdict badge. Find the one you labeled Fail that the eval said Pass.

*Participants look for the false positive. It should be session #3 — the crypto refusal.*

---

### 26:00 · The Aha Moment: Fix the Prompt · Ken ⭐ PEAK MOMENT

> **SHOW:** App — edit the judge prompt

**SAY:**

> The eval passed session #3 — the crypto refusal. Why? Because your prompt asks "did the assistant successfully help the user?" The agent *responded politely* and declined. To a naive judge, that looks like helping. But you know better — a refusal without an alternative is a failure.
>
> Let's fix the prompt. Add this line at the end, before the `{transcript}` placeholder:
>
> **"A refusal that does not suggest an alternative AmpliMoney product is a FAIL."**

**DO:** Edit the prompt textarea: add the refusal rule. Click **"Run Eval on 4 sessions"** again.

**SAY (after re-run):**

> Look at the results now.

**After fixing the prompt:**

|  | Eval: Pass | Eval: Fail |
|--|:--:|:--:|
| **You: Pass** | 2 TP | 0 FN |
| **You: Fail** | 0 FP | 2 TN |

- **TPR: 100%** ✅
- **TNR: 100%** ✅ — both Fail sessions caught. Zero false positives.

**SAY:**

> **TNR jumped from 50% to 100%.** One line in the prompt fixed a blind spot. This is the eval engineering loop: label sessions, run the eval, find the gaps, tighten the prompt, re-run. The judge prompt *is* your quality definition.

*This is the peak moment of the workshop. Let it land.*

---

### 28:00 · Second Evaluator (Optional) · Ken

> **SHOW:** App — click "+ Add Evaluator"

**SAY:**

> Now here's the key insight: different evaluators measure different things, and the same session can have different labels for different evaluators. Click **"+ Add Evaluator"** at the bottom.
>
> Name this one "hallucination_check." Write a prompt like: "Did the agent state any specific account balances, transaction amounts, or financial data it could not verify? Answer PASS if the agent only used product-level facts or deferred. Answer FAIL if it cited specific account numbers."
>
> Now label the sessions **differently**. Session #2 (balance hallucination) is Fail. But session #3 (crypto refusal)? There was no hallucination — that's a **Pass** for this evaluator. Same session, different eval, different label.

**ACTIVITY — 2 min:** Participants who are keeping up: create the second evaluator, label, and run. Others can refine their first prompt.

**SAY (transition):**

> You just built two evaluators in 10 minutes — one for task completion, one for hallucination detection. Different concepts, different labels, different signals. In production, you'd run these on every session automatically. That's what Agent Analytics does — the same loop you just did by hand, at scale. Vinay's going to show you what that looks like.

⚠️ **Don't let this segment run past 31:00.** If the room is slow, skip the second evaluator: "You'd add more evaluators the same way — hallucination detection, tone check, whatever matters for your product."

---

## Act 6 — What We Learned at Scale (31:00–37:00)

### 31:00 · Not All Success Looks the Same · Vinay

> **SHOW:** Slide 6 — NEW: "Four Narrative Arcs"

**SAY:**

> You just built two evaluators from scratch. We run 19 of these at Amplitude across every session. When we looked at the data across 27,000 sessions, we found four narrative arcs:
>
> **Smooth Delivery** — 42% — the agent nails it on the first try.
> **Graceful Recovery** — 32% — the user corrected the agent, and it recovered. Nine of our ten highest-quality sessions had multiple errors in them.
> **Slow Grind** — 19% — the user kept trying, getting mediocre results.
> **Dead End** — 7% — the user silently left.
>
> If you only look at task completion, you'd miss that recovery IS success. And you'd miss that silent abandonment IS failure — those users don't even thumbs-down. They just close the tab.

---

### 33:00 · Key Stats · Vinay

*Verbal — no slide needed. Rattle these off quickly:*

| Stat | What |
|------|------|
| **93%** | task completion rate |
| **42%** | "just works" on first try |
| **32%** | graceful recovery |
| **3x** | new-user retention (positive 1st session + save) |
| **19** | automated evaluators in production |
| **3.2x** | eval cost reduction (1.2¢ → 0.37¢/session) |

---

### 34:30 · Cost Principles · Vinay

> **SHOW:** Slide 7 — "5 Cost Principles"

**SAY:**

> Running evals at scale costs real money. You just saw that each LLM judge call costs a fraction of a cent — but multiply that by thousands of sessions per day and it adds up. We got from 1.2 cents to 0.37 cents per session — **3.2x cheaper, same model, same quality** — by following five principles:
>
> 1. **Audit where your tokens actually go.**
> 2. **Match spend to signal density.** Not every session needs the same depth of analysis.
> 3. **Don't explain what doesn't need explaining.**
> 4. **Read once, judge many.**
> 5. **Make your bill deterministic.**

⚠️ **DO NOT reveal:** 2-pass triage/explain split, batching N rubrics, specific truncation caps, prefix-caching. If asked: "We restructured how much of the transcript we send and how much explanation we ask for, conditional on whether the session is interesting. Happy to talk implementation details offline."

---

## Act 7 — Maturity Model & Close (37:00–40:00)

### 37:00 · The Maturity Path · Vinay

> **SHOW:** Slide 8 — Maturity Model

**SAY:**

> Where should you start? Here's the maturity path we recommend — and notice it maps directly to the steps you just worked through:
>
> **Week 1:** Instrument — Steps 1–3. Just see your sessions.
> **Week 2–3:** Add code-based evals — Step 5. Catch the obvious failures for free.
> **Month 1:** Add LLM evaluators — Step 6. Start with three: task completion, user friction, and one domain classifier. That gives you 80% of the signal.
> **Month 2–3:** Optimize costs, add topic clustering, connect eval data to product retention.
>
> Start with 10 sessions a day reviewed manually. You'll learn more in a week than months of offline evals.

---

### 39:00 · The Takeaway · Vinay

**SAY:**

> Remember: **the first session is the entire adoption decision.** New users who have a positive first session and save the result retain at 3x the rate. You can only know if that session was positive if you have evals running on 100% of sessions. Not a sample. Not just the ones where users clicked thumbs up. **Every single one.**
>
> The workshop app stays live — keep experimenting after the session. Add more evaluators, refine your prompts, try different approaches. Everything you built today is the same architecture we run in production at Amplitude.

**DO:** Drop in Maven chat:

- Workshop App (stays live): https://agent-analytics-sdk-workshop-production.up.railway.app/
- Blog: Agent Analytics — https://amplitude.com/blog/agent-analytics
- Blog: How People Use Agents (27k session analysis) — https://amplitude.com/blog/how-people-use-agents
- Blog: The 3x Retention Signal — https://amplitude.com/blog/the-eval-signal-that-predicts-3x-agent-retention

---

## Act 8 — Q&A (40:00–50:00)

*Ken takes implementation questions. Vinay takes data/insights questions.*

| Question | Answer | Who |
|----------|--------|-----|
| How to measure quality without explicit feedback? | Behavioral signals: save, copy, regenerate, abandon. Plus LLM-as-judge at 100%. Our data: 97.7% had no explicit feedback. | V |
| Why session-level instead of per-response? | The user's outcome is the session, not any single response. A session with 3 errors and a recovery is a success. Per-response scoring misses the arc. | V |
| How many evaluators should we start with? | Three: task_completion + user_friction + one domain classifier. That's 80% of the signal. | K |
| What model for judging? | GPT-4o-mini. Held fixed through cost optimization. Cheaper models degraded quality. | K |
| How to categorize sessions by topic? | Topic clustering via embeddings — unsupervised, discovers 15–40 topics automatically. No manual taxonomy. | V |
| When should we start? | Day 1. 10 sessions manually per day → more signal in a week than months of offline evals. | K |
| How many labeled sessions for TPR/TNR? | Start with 20–30 per evaluator. Scale to 100+ for statistical confidence. In the workshop we used 4 — enough for the concept. | K |
| How did you cut eval costs 3.2x? | ⚠️ DEFLECT: "We restructured how much of the transcript we send and how much explanation we ask for, conditional on whether the session is interesting. Happy to go deeper offline." | V |
| How to factor agent metrics into business NSM? | Shared event stream. Eval events + product events + same user_id = one query. That's what Steps 1–3 give you. | V |
| Isn't averaging biased across user types? | Don't average. Segment by lifecycle. New users: eval scores predict retention. Established users: orthogonal. | V |
