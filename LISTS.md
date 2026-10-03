# Private user lists

Web and the `Yytblue` iOS target support private lists: create/edit/delete a list,
search by display name or handle, add/remove members, and view their root posts.
List timelines reuse the visible timeline, so existing mute and block rules apply.
Replies remain accessible from post details. Deleting a list does not delete posts.
Names allow 1–40 Unicode code points; descriptions allow up to 160.

Signed-in users store lists in Supabase and can access them across devices.
Guest and development sessions store lists locally. Guest lists are deleted with
guest data on logout, expiry or conversion to a signed-in account; only posts use
the existing guest-to-account migration. Guest lists are not transferred.

## Database rollout

Apply `backend/migrations/20261003000000_user_lists.sql` after existing migrations,
before deploying the updated clients. It adds owner-validated RPCs, private tables
with RLS and no direct client grants, and profile-deletion cleanup triggers.
Regenerate the Supabase schema types after applying the migration. Web currently
uses a migration-specific type extension for the two new RPCs.

## Verification

- Web: in `web-app`, run `npm install`, `npx tsc --noEmit -p tsconfig.app.json`,
  `npm run build`, `npm run lint`, and `npm test`.
- Browser tests require `npx playwright install chromium`. They exercise guest
  creation, search, member addition/removal, timeline display, editing, deletion,
  and cleanup after the session ends.
- SQL: in `backend`, run `npm ci` and `npm test`. An isolated PGlite database
  applies the actual migration and checks identity validation, cross-account
  isolation, direct table access denial, blocked accounts, constraints,
  idempotent membership and profile-deletion cleanup. Existing identity/block
  helpers are represented by test fixtures; this does not verify live Rork auth.
- iOS: run the `Yytblue` scheme in Xcode and `UserListTests` on a simulator.
  Confirm signed-in list synchronization between Web and iOS using the configured
  Rork auth and Supabase services.

The implementation was validated locally for Web and SQL. iOS compilation and
live authentication/storage verification require the configured macOS project
environment and were not performed in this Linux workspace.
