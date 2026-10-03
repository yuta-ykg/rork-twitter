import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('private list RPC authorization, membership and account cleanup', async () => {
  const db = new PGlite();
  try {
    // Minimal existing schema; identity and block helpers stand in for Rork JWT functions.
    await db.exec(`
      create role anon; create role authenticated;
      create table public.profiles(id text primary key,name text,handle text);
      create table public.test_blocks(first_id text,second_id text);
      create function public.user_id() returns text language sql stable as
        $$ select nullif(current_setting('test.user_id',true),'') $$;
      create function public.is_blocked_pair(a text,b text) returns boolean language sql stable as
        $$ select exists(select 1 from public.test_blocks where (first_id=a and second_id=b) or (first_id=b and second_id=a)) $$;
      insert into public.profiles values ('alice','Alice','alice'),('bob','Bob','bob'),('carol','Carol','carol');
    `);
    await db.exec(await readFile(new URL('../migrations/20261003000000_user_lists.sql', import.meta.url), 'utf8'));
    const id = '00000000-0000-4000-8000-000000000001';
    const invoke = async (expected, op = 'read', target = null, name = '', description = '', member = null) => {
      const result = await db.query('select public.manage_user_lists($1,$2,$3::uuid,$4,$5,$6) as lists', [expected,op,target,name,description,member]);
      return result.rows[0].lists;
    };
    await db.exec("set test.user_id='alice'; set role anon;");
    assert.equal((await invoke('alice','create',id,' Friends ','People'))[0].name,'Friends');
    await invoke('alice','add',id,'','','bob');
    assert.equal((await invoke('alice','add',id,'','','bob'))[0].members.length,1);
    await assert.rejects(db.query('select * from public.user_lists'), /permission denied/);
    await assert.rejects(invoke('bob'), /Login required/);
    await assert.rejects(invoke('alice','update',id,' '.repeat(3)), /check constraint/);
    await assert.rejects(invoke('alice','update',id,'😀'.repeat(41)), /check constraint/);
    await assert.rejects(invoke('alice','add',id,'','','missing'), /Profile not found/);
    await db.exec("reset role; insert into public.test_blocks values('alice','carol'); set role anon;");
    await assert.rejects(invoke('alice','add',id,'','','carol'), /Profile not found/);
    const search = await db.query("select public.search_list_profiles('alice','Carol') as matches");
    assert.deepEqual(search.rows[0].matches,[]);
    await db.exec("set test.user_id='bob';");
    assert.deepEqual(await invoke('bob'),[]);
    for (const operation of ['update','delete','add','remove']) {
      await assert.rejects(invoke('bob',operation,id,'Stolen','','alice'), /List not found/);
    }
    await db.exec("set test.user_id='';");
    await assert.rejects(invoke('alice'), /Login required/);
    await db.exec("set test.user_id='alice';");
    assert.equal((await invoke('alice','remove',id,'','','bob'))[0].members.length,0);
    await invoke('alice','add',id,'','','bob');
    await db.exec("reset role; delete from public.profiles where id='bob'; set role anon;");
    assert.equal((await invoke('alice'))[0].members.length,0);
    await invoke('alice','delete',id);
    assert.deepEqual(await invoke('alice'),[]);
    await invoke('alice','create',id,'Final');
    await db.exec("reset role; delete from public.profiles where id='alice';");
    assert.equal((await db.query('select count(*)::int as count from public.user_lists')).rows[0].count,0);
  } finally { await db.close(); }
});
