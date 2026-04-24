# Multi-LLM Debate Arena

A production-ready Next.js app for running adversarial debates between two LLMs, scoring each round with a judge model, saving debate history, and exporting full transcripts.

The app is designed for comparing model behavior across providers, prompts, and controversial claims. It supports live browser debates, SQLite persistence through Prisma, and a CLI evaluation mode for batch experiments.

## Features

- Live streamed debates between two selected LLMs
- Third-model judge with structured round-by-round scoring
- Rubric scores for coherence, evidence, and rhetoric
- Built-in Anthropic and OpenAI presets
- Custom OpenRouter model support
- Saved debate history at `/history`
- Markdown transcript export
- CLI batch evaluation from CSV files
- Prisma-backed SQLite database
- Server-only API key handling

## Tech Stack

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Prisma
- SQLite
- OpenAI SDK
- Anthropic SDK
- OpenRouter SDK
- Server-Sent Events

## Requirements

- Node.js 18.18 or newer
- npm
- At least one provider API key:
  - Anthropic
  - OpenAI
  - OpenRouter

## Quick Start

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Before running real debates, add your API keys to `.env`.

## Environment Variables

Create `.env` from `.env.example`.

```env
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""
OPENROUTER_API_KEY=""
```

Optional Anthropic model overrides:

```env
DEFAULT_ANTHROPIC_OPUS_MODEL="claude-opus-4-1-20250805"
DEFAULT_ANTHROPIC_SONNET_MODEL="claude-sonnet-4-20250514"
```

Only the providers you use need keys. API keys are read on the server and are not exposed to the browser.

## Available Scripts

```bash
npm run dev          # Start local development server
npm run build        # Build for production
npm run start        # Start production server after build
npm run lint         # Run Next.js linting
npm run db:generate  # Generate Prisma client
npm run db:push      # Sync Prisma schema to SQLite
npm run eval         # Run CLI debate evaluations
```

## Production Build

```bash
npm install
npm run db:generate
npm run build
npm run start
```

For production deployments, set environment variables in your hosting provider and use a persistent database location. SQLite works well for local and single-server deployments. For serverless or multi-instance deployments, move Prisma to a hosted database such as PostgreSQL and update `prisma/schema.prisma` accordingly.

## Running A Debate

1. Open the home page.
2. Enter a contested claim.
3. Choose Debater A, Debater B, and Judge models.
4. Set rounds and max words per turn.
5. Start the arena.
6. Export the transcript or revisit it from `/history`.

Example claim:

```text
Nuclear power is better than solar for the next decade.
```

## CLI Evaluation

The CLI accepts a CSV file with a `claim` header or claims in the first column.

Example `claims.csv`:

```csv
claim
Remote work is better for innovation than office work.
Open-source foundation models are safer for society than closed models.
```

Run one debate per claim:

```bash
npm run eval -- \
  --input claims.csv \
  --runs 1 \
  --rounds 3 \
  --max-words 180 \
  --debater-a "Claude Opus 4.7" \
  --debater-b "openai:gpt-4o" \
  --judge "openai:gpt-4o-mini"
```

Run a custom OpenRouter matchup and write aggregate JSON:

```bash
npm run eval -- \
  --input claims.csv \
  --runs 3 \
  --debater-a "openrouter:anthropic/claude-sonnet-4" \
  --debater-b "openrouter:openai/gpt-4o-mini" \
  --judge "openrouter:google/gemini-2.5-pro" \
  --out eval-summary.json
```

Useful flags:

- `--persist true` saves CLI debates to SQLite.
- `--out path.json` writes aggregate statistics to a JSON file.

## Model Selection

Built-in presets include:

- Claude Opus 4.7
- Claude Sonnet 4.6
- GPT-4o
- GPT-4o-mini
- Custom OpenRouter model IDs

Model IDs are configured in `lib/model-catalog.ts`. If a provider changes or retires a model snapshot, update that file or use the optional environment overrides.

## Scoring Rubric

Each judge response scores both debaters on three axes:

- Coherence: logical structure, consistency, and response quality
- Evidence: specificity, support, examples, caveats, and factual grounding
- Rhetoric: clarity, framing, persuasion, and articulation

The app stores per-round scores, justifications, winners, final summary, and a Markdown transcript.

## Project Structure

```text
app/                     Next.js routes and API handlers
components/              Arena UI and reusable components
lib/                     Debate engine, model adapters, schemas, helpers
prisma/schema.prisma     Prisma SQLite schema
scripts/eval.ts          Batch evaluation CLI
docs/                    Supporting documentation and screenshots
```

## Data Persistence

Debates are stored in SQLite through Prisma.

Stored data includes:

- Debate claim and settings
- Selected debater and judge models
- Per-round arguments
- Per-rubric judge scores
- Judge justifications
- Final winner
- Final summary
- Markdown transcript

Local database files are ignored by git.

## API

The browser starts debates through:

```text
POST /api/debates/stream
```

The route validates input, runs the debate engine on the server, streams events with Server-Sent Events, and persists completed results.

## Security Notes

- Never commit `.env` files.
- Keep provider API keys server-side only.
- Review generated debate content before publishing it.
- Treat judge scores as model-generated evaluations, not objective truth.
- Use provider billing limits when running large CLI batches.

## Deployment Notes

This app can run anywhere that supports Node.js and Next.js.

Recommended production checklist:

- Set all required environment variables in the host.
- Run `npm run build` during deployment.
- Run `npm run db:generate` before building.
- Use persistent storage for SQLite or migrate to a hosted database.
- Configure provider API spending limits.
- Add observability and request logging for high-volume deployments.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
