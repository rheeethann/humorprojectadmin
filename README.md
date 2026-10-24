# Reality Check Admin

A separate Next.js application for [Reality Check](https://github.com/rheeethann/humorproject), using the same Supabase project. Production: https://humorprojectadmin-two.vercel.app.

## Assignment coverage

| Requirement | Screen / behavior |
| --- | --- |
| Read users | Users: profiles, roles, activity and ratings |
| Read prompt chains | Prompt chains: definitions, linked steps and executions |
| Read prompt chain steps | Chain steps: order, model, exact templates and input/output types |
| Read/update prompt chain mix | Prompt chain mix: enable chains and choose 1–3 outputs each; 1–5 total |
| CRUD terms | Terms: 36 seeded Columbia/college entries, aliases, definitions, examples, provenance and active state |
| Read/view AI-generated media | Generated media plus image previews in run/response details |
| Read generation requests | Generation requests: original prompt, status, quota reservation, complete configuration snapshot |
| CRUD AI generation examples | Generation examples: input, desired image prompt, explanation and optional chain association |
| CRUD LLM models/providers | LLM models / LLM providers; referenced records cannot be deleted |
| Read LLM responses | LLM responses: full prompts, output, model/provider snapshot, timing and errors |
| CRUD allowed signup domains | Allowed signup domains |
| CRUD whitelisted email addresses | Whitelisted emails |

All configuration changes affect new requests. Old request snapshots and response logs preserve their original values. Configuration and history tables have paginated search, record details, and links between chains, requests, runs and responses.

## Access

Google sign-in uses a separate admin cookie. Access requires a verified email admitted by an allowed domain or individual whitelist **and** `profiles.role = 'superadmin'`. The initial allowed domain is `columbia.edu`. Existing superadmins are retained. Configuration writes and all existing admin RPCs enforce admin access in the database; hiding buttons is not the security boundary. An administrator cannot remove the domain/email rule that currently admits their own account.

The app needs only the publishable Supabase key. Do not put API credentials in providers or models. Providers select the supported `google` or `cloudflare` adapter; new adapters require application code. Changing a referenced model identifier changes future requests, so ensure the identifier is valid for the selected provider and kind.

## Database and development

Migrations live in the main repository, including `20261024215209_generation_admin.sql`. Apply them to the shared database before running this release. The older project has some schema changes applied outside migration history; do not blindly replay its historical migrations on production.

```sh
npm ci
cp .env.example .env.local
npm run dev
npm run lint
npm test
npm run build
```

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, and `NEXT_PUBLIC_APP_URL`. Port 3001 is the local default. Add the admin origin plus `/auth/callback` to Supabase's redirect allowlist. Google redirects to Supabase, which then redirects to this app.

## Verification

Tests cover callback admission and fail-closed behavior, external-email exceptions, form validation, table searching/sorting, and unsupported resource selection. The main repository includes transaction-only SQL checks for permissions, CRUD, access revocation, quota reservation, snapshots and mix validation.

The professor's screenshots informed the grouped navigation and expandable prompt/example details. User-provided Columbia descriptions are labeled as project-owner context; generic college definitions and CourseWorks provenance are recorded on individual terms.
