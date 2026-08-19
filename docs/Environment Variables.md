---
tags: [ops]
---

# Environment Variables

Template: `.env.example` (committed, empty). Real values go in `.env.local`
(gitignored). See [[Security]].

| Variable | Scope | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | server | [[AI Layer]] — proposal generation |
| `OPENAI_MODEL` | server | model id (default `gpt-4o-mini`) |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | anon key (RLS blocks it — see [[Database]]) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server** | bypasses RLS; never expose |
| `NEXT_PUBLIC_SITE_URL` | public | absolute links in sitemap/PDF |
| `CHROME_EXECUTABLE_PATH` | server (optional) | local Chrome for [[PDF Generation]] |

## Rules

- `.env*` is in `.gitignore`. No secret ever appears in the repo, examples, or
  comments.
- `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are **server-only** — never
  referenced from client components.
- On [[Deployment|Vercel]], set these in Project → Settings → Environment
  Variables (or `vercel env`).

## Status

- ✅ `OPENAI_API_KEY` set locally.
- ⬜ Supabase vars — needed to persist leads/estimates and to render
  `/estimate/[token]`.

Related: [[Deployment]] · [[Tech Stack]]
