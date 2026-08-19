---
tags: [ops]
---

# Security

## Secrets

- All keys live in env only; `.env*` is gitignored. Nothing secret in the repo,
  including examples/comments (`.env.example` has empty values).
- `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are **server-only** — never
  imported into client components or the browser bundle. AI/DB calls happen in
  route handlers. See [[Environment Variables]].

## Database

- RLS enabled on `leads` and `estimates` with **no anon policies** — the public
  anon key can't read or write. All access is server-side via the service role.
  See [[Database]].
- Estimate pages are addressed by an **unguessable token** and are `noindex`
  (`robots.txt` disallows `/estimate/`).

## Input validation

- Every API payload is validated with **Zod on the server** (not only client).
- **Honeypot** anti-spam field (`company`) on the contact form and calculator —
  must be empty.

## Error handling

- API routes log failures without leaking details; clients get generic messages
  (502 for AI, 500 for DB).

## ⚠️ Key hygiene

If an API key is ever shared in plaintext (chat, screenshot, commit), **rotate
it**. Store the new one in `.env.local` and in the Vercel dashboard — never in
git.

Related: [[Deployment]] · [[AI Layer]]
