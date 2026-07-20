# SignalWatch

Automated tech-signal monitor. It watches [Hacker News](https://news.ycombinator.com/), filters stories against tracked topics, uses an LLM to analyze the relevant ones with **structured, schema-constrained output**, stores everything in Postgres, and pushes high-signal alerts to **Telegram** and **Discord** — each channel delivered independently through an authenticated n8n webhook.

Built as a public engineering proof: a scheduled worker, a deterministic pre-filter that keeps LLM cost bounded, strict typed AI output, a durable audit log, and idempotent multi-channel delivery — production concerns, not a demo toy.

## Architecture

```mermaid
flowchart LR
    subgraph GH["GitHub Actions (cron every 2h)"]
        ING["Ingestion worker<br/>scripts/ingest.ts"]
    end

    HN["Hacker News<br/>Firebase API"] -->|new stories| ING
    ING -->|"1 · deterministic<br/>keyword score"| FILTER{"relevant?<br/>score ≥ threshold"}
    FILTER -->|no| DROP["skip<br/>(no AI cost)"]
    FILTER -->|yes| AI["2 · OpenAI<br/>Structured Outputs<br/>(JSON Schema, strict)"]
    AI -->|typed analysis| DB[("Supabase / Postgres<br/>events · analyses<br/>deliveries · runs")]
    DB -->|"3 · relevant &<br/>confidence ≥ 70 &<br/>urgency ≥ medium"| N8N["n8n webhook<br/>(Header Auth)"]
    N8N --> TG["Telegram"]
    N8N --> DC["Discord"]
    DB --> DASH["Next.js dashboard<br/>(read-only, server-side)"]

    style AI fill:#6b46c1,color:#fff
    style DB fill:#3182ce,color:#fff
    style N8N fill:#dd6b20,color:#fff
```

### Pipeline stages

1. **Fetch** — pull recent stories from the public Hacker News Firebase API (no auth), bounded per run.
2. **Deterministic pre-filter** — score each story against `tracked_topics` (keyword/phrase weighting) *before* touching the LLM. Only stories over the threshold become AI candidates, so LLM spend stays bounded and predictable.
3. **AI analysis** — the candidates go to OpenAI's Responses API with a **strict JSON Schema**, returning a validated `SignalAnalysis` (summary, why-it-matters, suggested action, urgency, category, confidence). Output is re-validated with Zod before it's trusted.
4. **Durable log** — events, analyses, deliveries and run metadata are written to Postgres. Ingestion is **idempotent** via a unique `(source, external_id)` constraint, so re-runs never double-process.
5. **Delivery** — signals that are relevant, confident (≥70), and at least medium urgency are dispatched to n8n over an authenticated webhook. Telegram and Discord are delivered **independently**; ambiguous outcomes (timeouts) are recorded as `unknown` rather than silently marked sent.
6. **Dashboard** — a read-only Next.js app renders the signal feed server-side. The database is never exposed to the browser.

## Stack

| Layer | Tech |
|---|---|
| Worker / dashboard | Next.js 16 · TypeScript (strict) · Tailwind |
| AI | OpenAI Responses API · JSON Schema · Zod validation |
| Data | Supabase / PostgreSQL · Row-Level Security |
| Delivery | n8n (Header Auth webhook) → Telegram · Discord |
| Automation | GitHub Actions (scheduled ingestion + CI) |
| Tests | Vitest |

## Security

- All secrets are server-only and live in `.env.local` (gitignored) — never shipped to the client.
- Database access uses the service-role key **only** on the server; RLS is enabled and all grants are revoked from `anon`/`authenticated`.
- A **Husky pre-commit hook** scans staged files for common key patterns; **gitleaks** scans full history in CI.
- The n8n webhook is protected with Header Auth.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your own credentials
npm run dev                  # dashboard at http://localhost:3000
```

Run the ingestion pipeline once, locally:

```bash
npm run ingest
```

Apply the database schema from `supabase/migrations/` in your Supabase project's SQL editor (in order).

## Tests & CI

```bash
npm test        # Vitest: schema + relevance scoring
npm run lint
npm run build
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint, tests, build and `npm audit` on every push. Scheduled ingestion (`.github/workflows/ingest.yml`) runs every 2 hours.

## Configuring what it watches

Tracked topics are rows in the `tracked_topics` table (keywords, phrases, exclusions, per-topic threshold). Changing what SignalWatch monitors is a data change — no code edits required. The reference n8n delivery workflow is exported (with secrets redacted) in [`n8n/signalwatch-delivery.json`](n8n/signalwatch-delivery.json).

---

*A portfolio project by [@georgypevchikh](https://github.com/georgypevchikh).*
