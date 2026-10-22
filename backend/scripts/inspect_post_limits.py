"""Read-only inspection of deployed post RPCs, constraints and triggers.
Requires pg8000 and SUPABASE_DB_URL from the managed credential tool.
"""
import os
from urllib.parse import urlparse, unquote
import pg8000.dbapi

u = urlparse(os.environ['SUPABASE_DB_URL'])
conn = pg8000.dbapi.connect(user=unquote(u.username), password=unquote(u.password), host=u.hostname, port=u.port or 5432, database=u.path.lstrip('/'), ssl_context=True)
try:
    c = conn.cursor()
    c.execute("select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('create_post','create_quote_post','create_reply_post','edit_post','get_account_plan','enforce_post_plan_limit')")
    for row in c.fetchall():
        print(row[0])
    c.execute("select conname,pg_get_constraintdef(oid) from pg_constraint where conrelid='public.posts'::regclass")
    print(c.fetchall())
    c.execute("select pg_get_triggerdef(oid) from pg_trigger where tgrelid='public.posts'::regclass and not tgisinternal")
    print(c.fetchall())
finally:
    conn.close()
