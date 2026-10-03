# Public communities

Anyone can browse and read communities at `/communities` and `/communities/:id`.
Signed-in Apple/Google accounts can create and join communities without approval.
Joining is required to post. Guests and development sessions do not create shared
memberships or communities; the UI asks them to use Apple/Google sign-in.

Community posts are stored separately from ordinary posts. They do not appear in
the main timeline, user lists, bookmarks or like notifications. This version
supports text posts of 1–70 Unicode code points; reactions and replies are not part
of the community interface. Names allow 1–40 code points and descriptions up to 160.

Owners can edit the name/description, remove or restore members, delete any
community post, and delete the community. Authors can delete their own posts.
Removing a member prevents rejoining and posting until the owner restores them.
Leaving does not clear a removal restriction. Removed users can still read a
public community; they are hidden from the public member list. Owners cannot leave
their community and can delete it instead.

Deleting a community deletes its memberships and posts. Deleting an account
deletes its owned communities and their contents, its memberships in other
communities, and its own community posts. Community and post creation use stable
IDs so retries do not duplicate successful writes.

Signed-in viewers' mute/block rules filter authors and members. A block between
viewer and owner hides the community and prevents joining/posting. Anonymous
readers have no account-specific filters. Searches return the newest 50 matching
communities, with an optional joined-only filter. Community posts use pages of 50
with a timestamp/UUID cursor, including stable ordering for equal timestamps.

## Navigation and rollout

Web has a community link in the desktop sidebar and in the main header. iOS has
a community entry in the Home header. Apply
`backend/migrations/20261003020000_communities.sql` after the existing profile and
relationship migrations before deploying these clients. The migration is
independent of user lists, but the current branch also includes the prior list
migrations. Regenerate the Supabase schema types after rollout; Web uses a scoped
RPC type extension until then.

The new tables have RLS and no direct client grants. Read RPCs expose only public
community content; mutation RPCs validate the Rork identity, membership and
ownership on the server. Profile-deletion triggers clean up community data.

## Verification

Web: `npx tsc --noEmit -p tsconfig.app.json`, `npm run build`, `npm run lint`,
and `npm test` in `web-app`. Browser tests cover owner creation/editing, posting,
length validation, post/community deletion, joining/leaving and anonymous reading.

SQL: `npm ci && npm test` in `backend`. PGlite applies the actual migration and
checks authorization, direct-table denial, idempotent creation/posting, owner
restrictions, removal/restoration, mute/block filtering, pagination and cleanup.
Existing identity and relationship helpers use fixtures; live auth is not tested.

iOS: build the Yytblue scheme and run `CommunityTests` in Xcode. Confirm discovery,
creation, joining, posting, moderation and Web/iOS synchronization against the
configured backend. iOS compilation and live-service checks require a macOS
environment and were not run in this Linux workspace.
