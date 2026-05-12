---
title: Supabase client and admin gate scaffold
status: todo
priority: urgent
type: chore
tags:
  - supabase
  - auth
  - foundation
created_by: agent
created_at: 2026-05-02
position: 1
---

## Notes

The frontend has no Supabase integration files — `src/integrations/supabase/` and `src/services/` do not exist (recent revert wiped them). All other tasks depend on this scaffold landing first.

Admin identity is locked to `thebestofgaming2008@gmail.com`. Admin status is determined by checking that the signed-in user's email matches AND that the user has a row in `user_roles` with role `admin` or `super_admin`. The DB-side admin role row is created in task 6, but the frontend gate must already trust that table.

Environment: `.env.local` already holds `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Project uses Vite + React Router (not Next.js — confirmed by `vite.config.ts`), so use `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` and update `.env.local` with `VITE_` prefixed copies of the same values. Do NOT log keys.

## Checklist

- [ ] Supabase browser client wired with typed Database generic, single instance, persisted session storage
- [ ] Generated database types committed, with re-exports for `Tables<"products">`, `Tables<"orders">`, `Tables<"profiles">`, `Tables<"addresses">`, `Tables<"wishlists">`, `Tables<"user_roles">`
- [ ] Auth service: `signInWithPassword`, `signUp`, `signOut`, `getSession`, `onAuthStateChange`, `resetPassword` with redirect URL helper that uses current origin
- [ ] Auth context provider mounted at app root exposing `{ user, profile, role, isAdmin, loading, signIn, signOut }`
- [ ] Admin gate component that redirects to `/login?next=/admin` when user is missing, not admin, or email is not `thebestofgaming2008@gmail.com`
- [ ] Login page wired to real auth (currently a placeholder) with friendly error mapping for `Invalid login credentials`, `Email not confirmed`, rate-limit
- [ ] Sign-out from header `User` icon menu plus `/account` page
- [ ] Loading skeletons during initial session bootstrap so protected routes don't flash login redirect

## Acceptance

A signed-in non-admin reaching `/admin` is redirected away; the configured admin email reaches `/admin` after sign-in. Refreshing any page restores the session without flashing the login screen.