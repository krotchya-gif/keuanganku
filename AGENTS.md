<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Database schema source of truth

`supabase/fullschema.sql` is the local canonical backup and source of truth for
the application database schema. Agents must follow these rules for every task
that touches Supabase:

1. Before changing database-related code, inspect `supabase/fullschema.sql` and
   compare it with the live database using Supabase MCP.
2. Treat the live database as the current deployed state; local migration
   history may be incomplete because some baseline migrations were applied
   manually.
3. After any database mutation, refresh `supabase/fullschema.sql` from the live
   database using a read-only schema dump/query, and commit it with the related
   migration and application changes.
4. Perform DDL through Supabase MCP. Never leave `fullschema.sql` stale after a
   database change.
5. Keep seed data, Vault secrets, API keys, and environment-specific cron
   configuration out of `fullschema.sql`.
6. If the live schema cannot be dumped, report that limitation and do not claim
   the local backup is synchronized.

The synchronization check must cover tables, columns, types, constraints,
indexes, triggers, functions, RLS enablement, and policies. KPR remains part of
the schema backup but must stay functionally independent from onboarding.
