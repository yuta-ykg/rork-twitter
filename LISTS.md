# User lists and public sharing

Web and the `Yytblue` iOS target support lists: create/edit/delete a list,
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
uses a migration-specific type extension for the new RPCs.

Then apply `backend/migrations/20261003010000_public_user_lists.sql` before
deploying clients that support publishing. Existing lists remain private.
An owner can explicitly publish or unpublish a list. Public lists are discoverable
by name (the newest 50 matches) and readable at `/public/lists/:id` without login.
Unpublishing or deleting a list makes that URL unavailable on the next fetch.
Only the owner can change visibility, content or membership. Signed-in viewers'
mute/block rules filter members and posts; blocking the owner hides the list.
Anonymous viewers have no account-specific relationship filters.

Guest and development lists cannot be published. Their publish action is rejected
and the UI explains that Apple/Google sign-in is required.

Web creates share links using the current origin. Configure the iOS build setting
`EXPO_PUBLIC_WEB_URL` with the deployed HTTPS Web origin; it is exposed as
`PublicWebURL` in the generated Info.plist. iOS shows ShareLink only when this
origin is configured, and can discover/view public lists without that setting.
The shared HTTPS link opens the Web public page; universal links are not configured.

## Verification

- Web: in `web-app`, run `npm install`, `npx tsc --noEmit -p tsconfig.app.json`,
  `npm run build`, `npm run lint`, and `npm test`.
- Browser tests require `npx playwright install chromium`. They exercise guest
  creation, search, member addition/removal, timeline display, editing, deletion,
  and cleanup after the session ends.
- Public-sharing browser tests check anonymous access without edit controls,
  private-link denial, publishing, unpublishing and share-link visibility.
- SQL: in `backend`, run `npm ci` and `npm test`. An isolated PGlite database
  applies the actual migration and checks identity validation, cross-account
  isolation, direct table access denial, blocked accounts, constraints,
  idempotent membership and profile-deletion cleanup. Existing identity/block
  helpers are represented by test fixtures; this does not verify live Rork auth.
- Public-sharing SQL tests additionally check private-by-default migration,
  anonymous reads, non-owner mutation denial, publication revocation, deletion,
  viewer mute/block filtering and visibility preservation by older client updates.
- iOS: run the `Yytblue` scheme in Xcode and `UserListTests` on a simulator.
  Confirm signed-in list synchronization between Web and iOS using the configured
  Rork auth and Supabase services.

The implementation was validated locally for Web and SQL. iOS compilation and
live authentication/storage verification require the configured macOS project
environment and were not performed in this Linux workspace.
