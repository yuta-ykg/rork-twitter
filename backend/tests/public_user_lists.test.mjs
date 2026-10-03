import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('public sharing is opt-in, read-only, revocable and respects viewer relationships', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create table public.profiles(id text primary key,name text,handle text);
      create table public.test_blocks(first_id text,second_id text);
      create table public.test_mutes(viewer_id text,author_id text);
      create table public.posts(id uuid primary key,user_id text,parent_id uuid,body text,created_at timestamptz default now(),
        author_name text default 'Author',handle text default '@author',initial text default 'A',avatar_index int default 0);
      create function public.user_id() returns text language sql stable as
        $$ select nullif(current_setting('test.user_id',true),'') $$;
      create function public.is_blocked_pair(a text,b text) returns boolean language sql stable as
        $$ select exists(select 1 from public.test_blocks where (first_id=a and second_id=b) or (first_id=b and second_id=a)) $$;
      create function public.can_view_account(a text,b text) returns boolean language sql stable as
        $$ select not public.is_blocked_pair(a,b) and not exists(select 1 from public.test_mutes where viewer_id=a and author_id=b) $$;
      create function public.get_visible_posts(expected_user_id text) returns setof public.posts
        language sql stable security definer as $$ select p.* from public.posts p where public.can_view_account(public.user_id(),p.user_id) $$;
      insert into public.profiles values ('alice','Alice','alice'),('bob','Bob','bob'),('carol','Carol','carol');
      insert into public.posts(id,user_id,parent_id,body) values
        ('00000000-0000-4000-8000-000000000010','bob',null,'Bob post'),
        ('00000000-0000-4000-8000-000000000011','carol',null,'Carol post'),
        ('00000000-0000-4000-8000-000000000012','alice',null,'Not a member'),
        ('00000000-0000-4000-8000-000000000013','bob','00000000-0000-4000-8000-000000000010','Reply');
    `);
    for (const file of ['20261003000000_user_lists.sql','20261003010000_public_user_lists.sql']) {
      await db.exec(await readFile(new URL(`../migrations/${file}`,import.meta.url),'utf8'));
    }
    const id = '00000000-0000-4000-8000-000000000001';
    const manage = async (owner,op,name='Friends',member=null) => (await db.query(
      'select public.manage_user_lists($1,$2,$3::uuid,$4,\'\',$5) as data',[owner,op,id,name,member])).rows[0].data;
    const view = async () => (await db.query('select public.get_public_user_list($1::uuid) as data',[id])).rows[0].data;
    const find = async () => (await db.query("select public.find_public_user_lists('Friends') as data")).rows[0].data;
    await db.exec("set test.user_id='alice'; set role anon;");
    assert.equal((await manage('alice','create'))[0].is_public,false);
    await manage('alice','add','Friends','bob'); await manage('alice','add','Friends','carol');
    await db.exec("set test.user_id='';");
    assert.equal(await view(),null); assert.deepEqual(await find(),[]);
    await assert.rejects(manage('alice','publish'),/Login required/);
    await db.exec("set test.user_id='alice';");
    assert.equal((await manage('alice','publish'))[0].is_public,true);
    assert.equal((await manage('alice','update'))[0].is_public,true); // Older client updates preserve visibility.
    await db.exec("set test.user_id='';");
    const publicData = await view();
    assert.equal(publicData.list.owner_id,'alice'); assert.equal(publicData.list.members.length,2);
    assert.deepEqual(publicData.posts.map(p=>p.body).sort(),['Bob post','Carol post']);
    assert.equal((await find()).length,1);
    await assert.rejects(db.query('select * from public.user_lists'),/permission denied/);
    await db.exec("set test.user_id='bob';");
    for (const op of ['publish','unpublish','delete','update','add','remove']) {
      await assert.rejects(manage('bob',op,'Stolen','alice'),/List not found/);
    }
    await db.exec("reset role; insert into public.test_mutes values('bob','carol'); set role anon;");
    assert.equal((await view()).list.members.length,1); assert.equal((await view()).posts.length,1);
    await db.exec("reset role; insert into public.test_blocks values('bob','alice'); set role anon;");
    assert.equal(await view(),null); assert.deepEqual(await find(),[]);
    await db.exec("set test.user_id='alice';");
    assert.equal((await manage('alice','unpublish'))[0].is_public,false);
    await db.exec("set test.user_id='';");
    assert.equal(await view(),null); assert.deepEqual(await find(),[]);
    await db.exec("set test.user_id='alice';"); await manage('alice','publish'); await manage('alice','delete');
    await db.exec("set test.user_id='';"); assert.equal(await view(),null);
  } finally { await db.close(); }
});
