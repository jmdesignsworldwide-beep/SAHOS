# Database migrations

SQL in this folder is applied **automatically** to the production Supabase
project when it merges to `main`, by
[`.github/workflows/supabase-migrations.yml`](../../.github/workflows/supabase-migrations.yml)
(which runs `supabase db push`). No more copy-pasting into the SQL editor.

## One-time setup

Add three repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Where to find it |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Supabase → Account → **Access Tokens** → generate |
| `SUPABASE_DB_PASSWORD` | Supabase → Project Settings → **Database** → password |
| `SUPABASE_PROJECT_REF` | Supabase → Project Settings → **General** → Reference ID |

Until these exist, the workflow is a harmless no-op (it logs a notice and
passes), so merges are never blocked.

## Adding a migration

1. Create a new file here named `<UTC-timestamp>_short_name.sql`, e.g.
   `20260801120000_add_wishlist.sql`. The 14-digit timestamp
   (`YYYYMMDDHHMMSS`) sets the order — always use one later than the last file.
2. Write **idempotent** SQL where practical (`create table if not exists`,
   `create or replace`, `drop policy if exists ...` before `create policy`).
   `db push` records each file as applied and won't re-run it, but idempotency
   keeps things safe if a file is ever applied by hand too.
3. Keep the Fort Knox posture: `enable row level security` + `force row level
   security`, real policy predicates (never a bare `true`), and never grant the
   anon role more than it needs.
4. Open a PR. On merge, the Action applies it. Run the **Supabase Security
   Advisor** afterward for any migration that adds tables/policies.

## History / baseline

The `.sql` files in the parent `supabase/` folder (`schema.sql`, `portal.sql`,
`fase2.sql`, `contact.sql`, `site-images.sql`, …) are the **baseline that was
applied by hand before this pipeline existed**. They are kept for reference and
are **not** re-run by the pipeline. Everything from
`20260715000000_analytics.sql` onward is CI-managed here.
