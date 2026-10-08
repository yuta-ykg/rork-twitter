import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("the slim migration keeps only post and profile access", async () => {
  const sql = await readFile(new URL("../migrations/20261008020000_slim_posts_only.sql", import.meta.url), "utf8");
  assert.match(sql, /function public\.create_post/);
  assert.match(sql, /function public\.get_visible_posts/);
  assert.match(sql, /delete from public\.posts where parent_id is not null/);
});
