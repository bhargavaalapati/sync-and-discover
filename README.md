# ⚡ SyncExec AI — Voice-First Meeting-to-Execution Agent (`v2.5 Agentic Release`)

[![Hackathon](https://img.shields.io/badge/Hackathon-Product%20Space%20x%20Wispr%20Flow-blueviolet?style=for-the-badge)](https://theproductspace.in/ai-hackathon-details)
[![Problem Statement](https://img.shields.io/badge/Track-Problem%2003%3A%20Meeting--to--Execution%20Agent-emerald?style=for-the-badge)]()
[![Built With Voice](https://img.shields.io/badge/Voice%20Workflow-Wispr%20Flow%20150%2B%20WPM-orange?style=for-the-badge)](https://wisprflow.ai)
[![Release](https://img.shields.io/badge/Release-v2.5%20Agentic%20Edition%20(Nov%205%2C%202026)-blue?style=for-the-badge)](https://sync-and-discover.lovable.app/)
[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Supabase%20%7C%20Gemini%202.5%20%7C%20Make.com%20%7C%20Slack-000000?style=for-the-badge)]()

> **Originally built in 4.5 hours for the Agentic AI Hackathon organized by [Product Space](https://theproductspace.in/) in collaboration with [Wispr Flow](https://wisprflow.ai/), and continuously evolved post-submission into a full-fledged Agentic Governance Platform.**  
> **SyncExec** eliminates *"meeting amnesia"* by combining persistent **Cross-Meeting Institutional Memory**, a **4-Stage Multi-Agent ReAct Conflict Engine**, a **Human-in-the-Loop Confirmation Gate** with Counterfactual Impact Simulation, **`Cmd+K` Memory Copilot**, and real-time **Slack/Tracker Webhook Execution**.

---

## 🔗 Quick Links & Live Deliverables

| Resource | Link / Access |
| :--- | :--- |
| 🚀 **Live Deployed Prototype (`v2.5`)** | **[https://sync-and-discover.lovable.app/](https://sync-and-discover.lovable.app/)** |
| 🎥 **3-Minute Demo Video (Loom)** | **[https://www.loom.com/share/5eea6131ec4e4779aaf799d138dd22f9](https://www.loom.com/share/5eea6131ec4e4779aaf799d138dd22f9)** |
| 💻 **GitHub Repository** | **[https://github.com/bhargavaalapati/sync-and-discover](https://github.com/bhargavaalapati/sync-and-discover)** |
| 🎙️ **Wispr Flow Usage Proof** | [Jump to Wispr Flow Voice-First Workflow Section](#-how-we-built-voice-first-with-wispr-flow-20-rubric) |
| 📅 **Day-by-Day Build Log (Oct 31 – Nov 5)** | [Jump to Daily Engineering & Product Changelog](#-day-by-day-build--iteration-log-oct-31--nov-5-2026) |
| 🧪 **Interactive Walkthrough Guide** | [Jump to Step-by-Step Testing & Walkthrough Guide](#-complete-product-walkthrough--judge-testing-guide) |

> ### ⚠️ Important Note on Free-Tier Rate Limits, Safe Sandbox Mode & Webhook Credits
> * **LLM & Automation Quotas:** This live prototype operates on **free-tier API quotas** (Gemini API / Supabase Free Tier / Make.com Free Operations). Please trigger live execution buttons mindfully during testing!
> * **Zero-Credit Testing via `🧪 Safe Sandbox Mode` & `📡 Logs (N)`:** To inspect exact webhook payloads without burning live Make.com operations, switch the top **Autonomy Mode** bar to **`🧪 Safe Sandbox Mode`**, click **Confirm & Execute**, and open the **`📡 Logs (N)`** slide-over drawer in the header to inspect the intercepted JSON payload, latency, and one-click `cURL` command.
> * **Bring-Your-Own-Webhook Support:** Judges can also paste any test webhook URL (e.g., `webhook.site`, Slack Incoming Webhook, or Make.com URL) directly into the **Header Webhook Input Bar** for live end-to-end delivery.
> * **Resilient Deterministic Fallback Engine:** Even if free-tier LLM rate limits are reached during peak evaluation traffic, SyncExec includes a built-in **Deterministic Conflict & Extraction Fallback Parser** so the demo experience never fails.

---

## 🎯 The Problem: "Meeting Amnesia" (Problem Statement 03)

Standard AI meeting note-takers (Otter, Fireflies, basic LLM wrappers) suffer from two fatal flaws in real engineering and product teams:
1. **Zero Cross-Meeting Memory:** Every call is summarized in a vacuum. If a team locks **PostgreSQL** as their primary database on **October 10** and caps the marketing budget at **$5,000** on **October 20**, and an engineer casually says *"Let's switch to MongoDB and spend $8,000"* on **October 31**, standard AI summarizers blindly turn those contradictions into tasks without flagging that they violate governing decisions.
2. **Unverified Tracker Pollution:** Blindly pushing AI-extracted tasks into Jira, Trello, Linear, or Slack without human verification floods engineering backlogs with hallucinated or rejected scope.

---

## 💡 Our Solution: SyncExec AI (`v2.5` Architecture)

**SyncExec** is an end-to-end **Meeting-to-Execution Agent** built around a 4-stage institutional memory loop and an interactive **Agentic Governance Layer**:

### 🌐 Global Agentic Experience Layer
* **🎯 Interactive Judge 30-Sec Guided Evaluation Bar:** A collapsible 4-step guided tour sitting right below the header that walks evaluators through seeding historical memory, running live conflict analysis, resolving contradictions, and inspecting the 48-hour urgency radar—complete with a **1-click Clean Reset** so the database always starts with an idempotent **4 Decisions Active** baseline.
* **🤖 4-Stage Multi-Agent ReAct Orchestration Pipeline:** Clicking *Analyze Transcript* opens a live glassmorphic reasoning terminal that streams the step-by-step work of 4 specialized sub-agents with millisecond telemetry:
  1. `🎙️ [Diarization & Speech Agent]` — Normalizes Wispr Flow voice input and attributes speaker turns.
  2. `🧠 [Cross-Meeting Memory Agent]` — Queries the Supabase Decision Vault for governing historical records.
  3. `⚖️ [ReAct Conflict Critic Agent]` — Cross-checks new statements against historical constraints and classifies severity.
  4. `🛡️ [Governance Gate Agent]` — Halts autonomous tracker writes when conflicts are detected and routes to the Human-in-the-Loop Gate.
* **🎛️ Shared Autonomy Bar & Live Agent Status Pill:** Real-time header telemetry (`🟢 Agent Idle` → `🎙️ Listening via Wispr Flow` → `🟣 Multi-Agent Reasoning` → `🟠 Halted at Human Gate` → `⚡ Executing Webhook`) paired with a 3-mode **Autonomy Selector**:
  * `🛡️ Strict Human Gate` *(Default — blocks all database/tracker writes until human sign-off)*
  * `⚡ Assisted Co-Pilot` *(Auto-approves non-conflicting items, holds conflicts for review)*
  * `🧪 Safe Sandbox Mode` *(Intercepts webhook dispatches locally for zero-credit payload inspection)*
* **🔍 `Cmd+K` / `Ctrl+K` Memory Copilot Command Palette:** A Raycast/Linear-style natural language search modal (`Ask Memory Agent ⌘K`) that lets users ask questions across all meetings (e.g., *"Why was the MongoDB migration blocked?"*, *"Trace how our Q4 beta launch date evolved"*) and returns grounded answers with clickable `[Oct 10]`, `[Oct 20]`, and `[Oct 31]` source citations.
* **📡 Stripe-Style Developer Webhook Logs Drawer (`📡 Logs`):** Tracks every webhook dispatch in real time with status badges (`200 OK` vs `SANDBOX`), execution latency (`ms`), syntax-highlighted JSON request bodies, **`🔄 Replay Webhook`**, and **`📋 Copy cURL`**.

---

### 🗂️ The Core 4-Tab Execution Workflow

#### 1. 🎙️ Tab 1: Voice & Transcript Ingestion (`Ingest Meeting`)
* Supports speaker-labeled transcripts (`Speaker (Role): Statement`), `.txt/.vtt` file uploads, and **live hands-free voice dictation powered by Wispr Flow**.
* **Live Voice Dictation Bar:** Features a green animated sound-wave equalizer, browser `SpeechRecognition` live mic transcription (`🎙️ Dictate Live Line`), and a **`⚡ Simulate Live Voice Note (Rahul)`** button that streams Rahul's load-testing action item character-by-character so evaluators without a microphone can test voice ingestion in one click.

#### 2. 🛡️ Tab 2: Human-in-the-Loop Conflict & Confirmation Gate (`Review & Confirm Gate`)
* **📊 Executive Alignment Scorecard:** A live 4-metric governance banner at the top of Tab 2:
  * **Alignment Score:** Starts at `58/100 (High Drift)` when 3 conflicts are unresolved and dynamically climbs to **`96/100 (Aligned)`** as conflicts are resolved or rejected.
  * **Budget Variance:** Dynamically computes `+$3,000 (+60%)` when the `$8,000` budget override is active, or `$0` if kept at `$5,000`.
  * **Timeline Slip:** Displays `+10 Days` when the `Nov 15 → Nov 25` beta launch override is accepted.
  * **Rework Saved:** Credits **`16h Eng Saved`** when the unapproved MongoDB migration conflict is rejected (`Keep Past Decision`).
* **🚨 3-Tier Conflict Taxonomy & Side-by-Side Visual Diff:** Categorizes contradictions into **`DIRECTIONAL_REVERSAL`**, **`METRIC_OR_DATE_SHIFT`**, or **`OWNERSHIP_OR_SCOPE_DRIFT`** with confidence scores (`94%–98%`) and a side-by-side comparison of *Governing Memory (Oct 10/20)* vs. *New Transcript Proposal (Oct 31)*.
* **🧠 Explainability-on-Demand & `🔮 Simulate Impact`:** Every conflict card includes a collapsible **Agent Reasoning Trace** and a **Counterfactual Impact Simulator** comparing `If Overridden` vs. `If Rejected (Protected)`.
* **Cascade Task Blocking:** Clicking **"Keep Past Decision (Reject Change)"** on the MongoDB conflict automatically strikes through the decision, unchecks Rahul's downstream *"Complete MongoDB cluster migration"* task, and displays a `Backlog Protected` shield.
* **1-Click Export:** Copy verified decisions and tasks as clean **Markdown for Notion/Linear** or export raw **JSON**.

#### 3. 🧠 Tab 3: Persistent Decision Memory Vault & Lineage Graph (`Decision Memory Vault`)
* **Dual View Modes:** Switch between **`📋 Ledger View`** and **`🕸️ Lineage Timeline View`** (which groups decisions by domain—*Database & Infra*, *Launch Timeline*, *GTM Budget*, and *Security & Auth*—to visualize how each decision evolved from `Oct 10 → Oct 20 → Oct 31`).
* **Decision Lineage Status Badges:**
  * `🟢 GOVERNING (LOCKED)` — Active foundational decisions.
  * `🔄 SUPERSEDED BY OCT 31` — Decisions consciously overridden in Tab 2 with a full audit trail.
  * `🛡️ PROTECTED AGAINST DRIFT` — Decisions defended when a contradicting proposal (like the MongoDB switch) was rejected at the gate.
* **⚡ Pre-Meeting Context Brief Generator:** Synthesizes all active governing decisions into a shareable executive pre-read modal before the next sync, with 1-click Copy or Send to Slack.

#### 4. ⏰ Tab 4: `<48-Hour Urgency Radar`, Weekly Digests & Execution Kanban (`Digests & Reminders`)
* **Dual Execution Views (`🚨 48h List` vs. `🗂️ Kanban Board`):**
  * **48-Hour Urgency Radar List:** Highlights tasks due within 48 hours of `Oct 31` (`Nov 1` & `Nov 2`) with a pulsing red `URGENT: DUE IN < 48H` badge and 1-click Slack reminder triggers.
  * **3-Column Execution Kanban Board:** Organizes tasks across `🔴 Urgent (<48h)`, `🔵 Open Backlog`, and `🟢 Completed` with 1-click status transitions synced directly to Supabase.
* **Executive Weekly Digest Generator:** Compiles per-person priorities (`Priya (PM)` or `Rahul (Eng)`), completed wins, and owned decisions into a formatted Slack/Markdown briefing.

---

## 📅 Day-by-Day Build & Iteration Log (Oct 31 – Nov 5, 2026)

We didn't stop at the hackathon submission buzzer. Here is our transparent day-by-day engineering log showing how **SyncExec** evolved from a 4.5-hour hackathon MVP into a production-grade agentic platform:

| Date | Sprint Milestone | Key Features & Engineering Upgrades Shipped |
| :--- | :--- | :--- |
| **Day 0**<br>*(Sat, Oct 31, 2026)* | **Hackathon Sprint & 11:59 PM Buzzer-Beater (`v1.0`)** | • Built core 4-tab dark-mode architecture with voice-first prompts via **Wispr Flow**.<br>• Configured Supabase PostgreSQL tables (`meetings`, `decisions`, `action_items`) and seeded `Oct 10` & `Oct 20` memory.<br>• Connected Gemini extraction + deterministic fallback parser and live Make.com → Slack webhook pipeline.<br>• Survived Bengaluru night rain, power cuts, and 5G hotspot tethering to submit at **11:59 PM IST**. |
| **Day 1**<br>*(Sun, Nov 1, 2026)* | **Founder Feedback & 3-Tier Conflict Taxonomy (`v1.4`)** | • Incorporated product feedback from AI meeting founders on LinkedIn.<br>• Upgraded Tab 2 Conflict Cards with a formal **3-Tier Contradiction Taxonomy** (`DIRECTIONAL_REVERSAL`, `METRIC_OR_DATE_SHIFT`, `OWNERSHIP_OR_SCOPE_DRIFT`), confidence scores, and **Side-by-Side Visual Diff** boxes.<br>• Added cascade task blocking with `Backlog Protected` verification badges. |
| **Day 2**<br>*(Mon, Nov 2, 2026)* | **Rich Slack Executive Reports & Pre-Read Briefs (`v1.8`)** | • Upgraded webhook payload construction (`digest_summary` & `slack_text`) to format multi-line bulleted Slack reports listing Approved Decisions, Blocked Conflicts, and Verified Tasks without modifying Make.com nodes.<br>• Added **`⚡ Generate Pre-Read Brief for Next Sync`** in Tab 3 and **Markdown/JSON exports** in Tabs 2 & 4. |
| **Day 3**<br>*(Tue, Nov 3, 2026)* | **Judge Guided Tour, Voice Simulator & Multi-Agent ReAct Trace (`v2.1`)** | • Shipped the **`🎯 Interactive Judge Evaluation Flow`** 4-step guided bar and live **Voice Dictation Bar** with animated sound-waves and character-streaming simulation (`⚡ Simulate Live Voice Note`).<br>• Fixed the duplicate test-run data bug (`30 Decisions Active` → strict idempotent **`4 Decisions Active`** clean reset).<br>• Added the **3.2-second Multi-Agent ReAct Orchestration Animation**, **Shared Autonomy Bar** (`Strict Gate`, `Co-Pilot`, `Safe Sandbox Mode`), and collapsible **Agent Reasoning Traces**. |
| **Day 4**<br>*(Wed, Nov 4, 2026)* | **`Cmd+K` Memory Copilot & Decision Lineage Graph (`v2.3`)** | • Built the global **`🔍 Ask Memory Agent (⌘K)`** command palette with starter chips, streaming answers, and clickable `[Oct 10]`/`[Oct 20]`/`[Oct 31]` source citations.<br>• Added **`🕸️ Lineage Timeline View`** and supersession badges (`GOVERNING`, `SUPERSEDED BY OCT 31`, `PROTECTED AGAINST DRIFT`) in Tab 3. |
| **Day 5**<br>*(Thu, Nov 5, 2026)* | **Webhook Telemetry Drawer, Alignment Scorecard & Kanban (`v2.5`)** | • Shipped the Stripe-style **`📡 Logs (N)` Webhook Telemetry Drawer** with live status, latency (`ms`), expandable JSON payload inspection, `Replay Webhook`, and `Copy cURL`.<br>• Added the **Executive Alignment Scorecard** (`58/100 → 96/100`, `+$3,000` budget variance, `+10d` slip, `16h Eng Saved`) and **`🔮 Simulate Impact`** counterfactual toggle on Tab 2.<br>• Added the 3-column **Execution Kanban Board** switcher in Tab 4. |

---

## 🧪 Complete Product Walkthrough & Judge Testing Guide

Follow this **90-second interactive walkthrough** on **[https://sync-and-discover.lovable.app/](https://sync-and-discover.lovable.app/)** to experience every feature in order:

### Phase 1: Clean Memory Seed & `Cmd+K` Copilot (15 Seconds)
1. **Clean Reset Memory:** Look at the **`🎯 Interactive Judge Evaluation Flow`** bar right below the header and click **Step 1 (`1. Seed Oct 10 & 20 Memory`)**. Verify the badge reads **`4 Decisions Active`** (this purges any prior test clutter and loads the clean `Oct 10` & `Oct 20` baseline).
2. **Test the `Cmd+K` Memory Agent:** Press **`Ctrl+K`** (or **`Cmd+K`** on Mac, or click `🔍 Ask Memory Agent` in the header). Click one of the starter prompt chips (e.g., *"Trace how our Q4 beta launch date evolved"*) to watch the agent synthesize cross-meeting answers with clickable date citations. Close the modal.

### Phase 2: Live Voice Dictation & Multi-Agent Reasoning Trace (20 Seconds)
1. **Load the Emergency Sync:** Click **Step 2 (`2. Load & Analyze Oct 31 Sync`)** in the Judge Bar. This switches to **Tab 1** and loads the October 31 transcript containing 3 deliberate contradictions against October 10 & 20 memory.
2. **Test Voice Ingestion:** Above the transcript box, click **`⚡ Simulate Live Voice Note (Rahul)`** (or click `🎙️ Dictate Live Line` to speak into your mic). Watch the green audio waveform animate as Rahul's load-testing task streams live into the bottom of the transcript.
3. **Trigger Multi-Agent Analysis:** Click the pulsing **"Analyze Transcript & Detect Conflicts"** button. Watch the **4-Stage Multi-Agent Orchestration Pipeline** (`Diarization` → `Memory Retriever` → `ReAct Conflict Critic` → `Governance Gate`) execute step-by-step before routing you to Tab 2.

### Phase 3: The 3-Tier Conflict Gate, Impact Simulator & Scorecard (30 Seconds)
1. **Check the Executive Alignment Scorecard (Top of Tab 2):** Notice that with 3 unresolved contradictions, the **Alignment Score** starts at **`58/100 (High Drift)`**.
2. **Inspect the 3 Red Conflict Cards:**
   * Click **`🧠 View Agent Reasoning Trace`** on any card to inspect the exact historical vector match and agent critique.
   * Click **`🔮 Simulate Impact`** on the MongoDB conflict card to compare the counterfactual outcomes (`If Overridden` vs. `If Rejected`).
3. **Resolve the 3 Conflicts:**
   * **Conflict 1 (`METRIC_OR_DATE_SHIFT` — Launch Date `Nov 15 → Nov 25`):** Click **Override Past Decision**. Watch the scorecard update (`Timeline Slip: +10 Days`).
   * **Conflict 2 (`DIRECTIONAL_REVERSAL` — Database `PostgreSQL → MongoDB`):** Click **Keep Past Decision (Reject Change)**. Watch SyncExec automatically strike through the decision, **auto-uncheck Rahul's MongoDB migration task below**, credit **`16h Eng Saved`**, and raise the **Alignment Score** toward **`96/100 (Aligned)`**!
   * **Conflict 3 (`METRIC_OR_DATE_SHIFT` — Budget `$5,000 → $8,000`):** Click **Override Past Decision** (`Budget Variance: +$3,000 (+60%)`).

### Phase 4: Safe Sandbox Execution & Developer Webhook Logs (15 Seconds)
1. **Select Autonomy Mode:** In the top sub-header, choose **`🧪 Safe Sandbox Mode`** (to test without spending Make.com credits) or leave on **`🛡️ Strict Human Gate`** (to fire live to Slack).
2. **Execute Approved Items:** Click **"Confirm & Execute Approved Items"** at the bottom of Tab 2.
3. **Inspect the Webhook Telemetry Drawer:** Click **`📡 Logs (1)`** in the top header. Expand the logged `confirm_and_execute` event to inspect the formatted Slack summary, JSON payload, latency (`ms`), and `📋 Copy cURL` button.

### Phase 5: Decision Lineage Graph & Execution Kanban (10 Seconds)
1. **Explore Decision Lineage (`Tab 3`):** Click **Tab 3 (`Decision Memory Vault`)** and toggle to **`🕸️ Lineage Timeline View`**. Observe how the Launch Date and Budget show `🔄 SUPERSEDED BY OCT 31`, while PostgreSQL displays `🛡️ PROTECTED AGAINST DRIFT`. Click **`⚡ Generate Pre-Read Brief`** to preview the next meeting's executive briefing.
2. **Explore 48h Urgency Radar & Kanban (`Tab 4`):** Click **Step 4 (`4. View <48h Urgency Radar`)** in the Judge Bar (or open **Tab 4**). Toggle between **`🚨 48h List`** and **`🗂️ Kanban Board`** to move tasks across `🔴 Urgent <48h`, `🔵 Open Backlog`, and `🟢 Completed`.

---

## 🎙️ How We Built Voice-First with Wispr Flow (20% Rubric)

**[Wispr Flow](https://wisprflow.ai/)** was central to both our **development velocity** (building the initial product in under 4.5 hours despite power cuts and 5G tethering, and dictating multi-part context-engineered upgrade prompts across Days 1–5) and our **live product UX**:

1. **Voice-Driven System Architecture & Prompt Engineering (150+ WPM):**
   Instead of manually typing complex multi-tab specifications, SQL migrations, and JSON schemas, we dictated our system prompts, edge-function specifications, and TypeScript fallback parsers directly into our AI IDE and builders using Wispr Flow.
2. **Dictating Realistic Multi-Meeting Test Scripts:**
   We used Wispr Flow to rapidly voice-act and transcribe the multi-turn dialogues between `Priya (PM)` and `Rahul (Eng)` across Meetings 1, 2, and 3.
3. **Live In-App Voice Ingestion:**
   During live meetings or emergency standups, users click into SyncExec's transcript box, hold their **Wispr Flow hotkey**, and dictate live action items hands-free (e.g., *"Rahul: I will run load testing on the webhook ingestion endpoint by November 1, 2026"*).

### 📸 Wispr Flow Usage & Product Screenshots

| Wispr Flow Dictation History & Stats | Wispr Flow Active Voice Pill in SyncExec |
| :---: | :---: |
| [Wispr Flow History](https://drive.google.com/file/d/1v39fMeGcHplwST5oXKyiqYgDbMUjyHRK/view?usp=sharing) | [Wispr Flow Live Dictation](https://drive.google.com/file/d/1iRy0Fx6WwKPAjq_-lxpZCm5lvmpeVzra/view?usp=sharing) |

| Red Conflict Detection & Confirmation Gate | Live Make.com → Slack Webhook Execution |
| :---: | :---: |
| [Conflict Gate UI](https://drive.google.com/file/d/1XxWBRLiyPqcy12AIEEkVyEhasSkjMn6j/view?usp=sharing) | [Slack Webhook Alerts](https://drive.google.com/drive/folders/1UbvcrF9Bdr-ytOqCjhWtaIeRBJBo-kEU?usp=sharing) |

---

## 🏗️ System Architecture & Multi-Agent Data Flow (`v2.5`)

```mermaid
flowchart TD
    subgraph Global_Agentic ["🌐 Global Agentic Control & Memory Layer"]
        JudgeBar["🎯 4-Step Judge Guided Tour + Clean Reset"]
        CmdK["🔍 Cmd+K Memory Copilot (Natural Language Q&A)"]
        Autonomy["🎛️ Shared Autonomy Mode\n(Strict Gate | Co-Pilot | Safe Sandbox)"]
    end

    subgraph Ingestion ["1. Voice & Transcript Ingestion (Tab 1)"]
        WF["🎙️ Wispr Flow Hotkey + Web Speech Mic"] --> UI_Ingest["Transcript & Speaker Parser"]
        SimVoice["⚡ Simulate Live Voice Stream"] --> UI_Ingest
        TXT["📄 Raw Meeting Transcript (.txt / Paste)"] --> UI_Ingest
    end

    subgraph ReAct_Pipeline ["2. 4-Stage Multi-Agent Orchestration Pipeline"]
        UI_Ingest --> A1["🎙️ Agent 1: Speaker Diarization"]
        A1 --> A2["🧠 Agent 2: Cross-Meeting Memory Retriever"]
        DB_Read[("🗄️ Supabase PostgreSQL\n(Governing Decisions: Oct 10 & 20)")] --> A2
        A2 --> A3["⚖️ Agent 3: ReAct Conflict Critic\n(3-Tier Taxonomy + Confidence Score)"]
        A3 --> A4["🛡️ Agent 4: Governance Gate Router"]
    end

    subgraph HITL ["3. Human-in-the-Loop Confirmation Gate (Tab 2)"]
        A4 --> Scorecard["📊 Executive Alignment Scorecard\n(58/100 → 96/100 | Budget | Slip | 16h Saved)"]
        A4 --> Conflict_UI["🚨 3-Tier Red Conflict Cards\n(Visual Diff + Reasoning Trace + Simulate Impact)"]
        Conflict_UI -->|Keep Past Decision (Reject MongoDB)| Auto_Uncheck["🛡️ Cascade Block: Unchecks\nDecision & Migration Task"]
        Conflict_UI -->|Override Past Decision| Checklist["✅ Editable Decisions & Tasks Checklist"]
    end

    subgraph Execution ["4. Lineage Vault, Kanban & Webhook Telemetry (Tabs 3 & 4)"]
        Checklist -->|Confirm & Execute| DB_Write[("🗄️ Supabase Persistence +\n🕸️ Decision Lineage Graph (Tab 3)")]
        DB_Write --> Kanban["🗂️ Tab 4: <48h Urgency Radar &\n3-Column Execution Kanban"]
        Checklist -->|HTTP POST / Sandbox Intercept| Logs["📡 Developer Webhook Logs Drawer\n(Status, Latency ms, JSON, Replay, cURL)"]
        Logs -->|Live Mode| Make["⚙️ Make.com Webhook Router"]
        Make --> Slack["💬 Slack Channel Executive Reports\n(Tasks, Blocked Conflicts, <48h Alerts, Digests)"]
    end
```

---

## 🗄️ Database Schema (Supabase PostgreSQL)

Run the following SQL in the **Supabase SQL Editor** to initialize the schema and seed the historical cross-meeting memory (`Oct 10` & `Oct 20`):

```sql
-- 1. Create Tables
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  raw_transcript TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL,
  decision_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  owner TEXT NOT NULL,
  deadline TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  synced_to_tracker BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Clean Reset & Seed Meetings 1 & 2 (Persistent Cross-Meeting Memory)
DELETE FROM action_items;
DELETE FROM decisions;
DELETE FROM meetings;

INSERT INTO meetings (id, title, date, raw_transcript) VALUES
('11111111-1111-1111-1111-111111111111', 'Q4 Architecture & Beta Timeline Sync', '2026-10-10', 'Priya (PM): We are launching the beta on November 15, 2026. Rahul (Eng): Agreed, we will exclusively use PostgreSQL.'),
('22222222-2222-2222-2222-222222222222', 'Sprint 4 API & GTM Budget Review', '2026-10-20', 'Priya (PM): Q4 marketing budget is capped at $5,000. Rahul (Eng): I will finish the JWT auth API by November 2, 2026.');

INSERT INTO decisions (meeting_id, speaker, decision_text, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'Priya (PM)', '[2026-10-10] Public beta launch date is locked for November 15, 2026.', '2026-10-10T10:00:00Z'),
('11111111-1111-1111-1111-111111111111', 'Rahul (Eng)', '[2026-10-10] Exclusively use PostgreSQL as primary production database; no NoSQL.', '2026-10-10T10:05:00Z'),
('22222222-2222-2222-2222-222222222222', 'Priya (PM)', '[2026-10-20] Total Q4 beta marketing budget is strictly capped at $5,000.', '2026-10-20T14:00:00Z'),
('22222222-2222-2222-2222-222222222222', 'Rahul (Eng)', '[2026-10-20] Use JWT-based OAuth2 with Google and GitHub for authentication.', '2026-10-20T14:10:00Z');
```

---

## 🔌 Webhook Payload Contract (Make.com → Slack)

Whenever a user clicks **Confirm & Execute**, **Send Deadline Reminder**, or **Post Weekly Digest** (and can be inspected anytime in the **`📡 Logs (N)`** drawer), SyncExec sends a structured `POST` request to the configured Webhook URL:

```json
{
  "event_type": "confirm_and_execute",
  "meeting_title": "Emergency Pre-Launch Sync",
  "meeting_date": "2026-10-31",
  "approved_decisions": [
    {
      "speaker": "Priya (PM)",
      "decision_text": "Push public beta launch date to November 25, 2026"
    },
    {
      "speaker": "Priya (PM)",
      "decision_text": "Increase Q4 beta marketing budget to $8,000"
    }
  ],
  "approved_tasks": [
    {
      "task": "Patch the staging CORS headers",
      "owner": "Rahul (Eng)",
      "deadline": "2026-11-01",
      "status": "open"
    },
    {
      "task": "Update investor launch deck with Nov 25 timeline and $8,000 budget",
      "owner": "Priya (PM)",
      "deadline": "2026-11-02",
      "status": "open"
    }
  ],
  "target_person": "All Team",
  "digest_summary": "✅ *Approved Decisions (2):*\n• [Priya (PM)]: Push public beta launch date to November 25, 2026\n• [Priya (PM)]: Increase Q4 beta marketing budget to $8,000\n\n🛡️ *Conflicts Blocked from Backlog (1):*\n• [Rahul (Eng)]: Switch primary database to MongoDB (Protected PostgreSQL lock)\n\n🚀 *Verified Action Items (2):*\n• Patch the staging CORS headers — Owner: Rahul (Eng) (Due: 2026-11-01)\n• Update investor launch deck — Owner: Priya (PM) (Due: 2026-11-02)"
}
```

---

## 💻 Local Setup & Installation

```bash
# 1. Clone the repository
git clone [https://github.com/bhargavaalapati/sync-and-discover](https://github.com/bhargavaalapati/sync-and-discover)
cd sync-and-discover

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

*(Optional)* You can configure your own `Supabase URL`, `Supabase Anon Key`, `Gemini API Key`, and `Make.com Webhook URL` at runtime directly via the **Settings** modal in the top-right corner of the app header.

---

## 👥 Team & Hackathon Journey

Initiated during the **Product Space x Wispr Flow Agentic AI Hackathon (Oct 31, 2026)**—shipped through late-night Bengaluru rain, power cuts, 5G mobile hotspot tethering, and a buzzer-beater 11:59 PM IST submission, then expanded across 5 consecutive days of post-hackathon product engineering!

* **Alapati Bhargava Rama Bharadwaja** — Full-Stack & Agentic Architecture, Multi-Agent Conflict Engine, Supabase Memory & Lineage Vault, Make.com/Slack Webhook Telemetry & Voice-First QA
* **Devadula Venkata Jayanth** — Product Strategy, UI/UX Flows & Repository Engineering

---

*Built with ❤️, voice-first speed via **[Wispr Flow](https://wisprflow.ai/)**, and community energy from **[Product Space](https://theproductspace.in/)**.*
