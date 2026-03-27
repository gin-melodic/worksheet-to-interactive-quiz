---
trigger: always_on
glob: "**/*.{ts,tsx}"
description: AI Prompt Management Rule
---

# Prompt Management Rule

To ensure project security and maintainability, all core AI prompts must be stored as environment variables in `.env.local` and accessed through the server-side API.

- **DO NOT** hardcode detailed AI prompts directly in the source code.
- **DO NOT** modify the prompt logic in the `.tsx` (client-side) or `.ts` (server-side) files if a corresponding environment variable exists.
- **ALWAYS** update the prompts in `.env.local` (local development) and ensure `.env.example` is updated with necessary placeholders.
- **FALLBACKS**: Use simple, non-sensitive default prompts in the code only as fail-safes.
- **SERVER-SIDE INJECTION**: When complex prompts are needed for client-side multimodal requests (like `create/page.tsx`), use the `/api/generate` route to inject the secret prompt from `process.env`.

