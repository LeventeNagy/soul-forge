# Soul Forge

Generate and customize SOUL.MD persona files for your Hermes Agent.

## What it does

- **8 curated templates** — Code Architect, Research Analyst, Creative Director, Patient Tutor, Executive Assistant, Devil's Advocate, Minimalist, Philosopher
- **AI generation** — describe your ideal agent in plain English, get a full SOUL.MD
- **Reference mode** — paste an existing SOUL.MD to match its style
- **Community gallery** — save and browse SOUL.MD files you found online
- **One-click save** — writes directly to your profile, loads on next session

## Install

```bash
hermes plugins install LeventeNagy/soul-forge
hermes plugins enable soul-forge
```

Then restart Hermes (`/reset` or restart gateway). The **Soul Forge** tab appears in the dashboard.

## How SOUL.MD works

SOUL.MD is injected as the agent's identity in every conversation. It defines personality, communication style, principles, and boundaries. Soul Forge writes the file — Hermes picks it up automatically.

```
~/.hermes/SOUL.md                    ← default profile
~/.hermes/profiles/<name>/SOUL.md    ← named profile
```

## Usage

1. Open the **Soul Forge** tab in the dashboard
2. Pick a template or go to **Generate** and describe your agent
3. Optionally paste a reference SOUL.MD to match its style
4. Preview, edit, and save to your profile
5. Start a new Hermes session — your agent adopts the personality

## Slash commands

None — this is a dashboard-only plugin.

## Dependencies

None — uses only what the Hermes dashboard already provides (FastAPI, Pydantic, OpenAI library).

## License

MIT
