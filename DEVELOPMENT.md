# Development login skip

- Web: run the existing `npm run dev` command inside `web-app`. The Apple/Google login panel also displays **開発用にログインをスキップ**.
- iOS: run a Debug build in Xcode. The same button appears in the login view.
- Skip mode stores posts, likes and profile edits locally, in a separate development namespace. It does not create authenticated Supabase users or write to the shared database.
- Sign out to leave skip mode; local development data remains for the next test session.
- Web production builds hide the button by default. A dedicated development preview can explicitly enable it with the public build variable `EXPO_PUBLIC_ENABLE_DEV_LOGIN=true`. Leave this variable unset for normal production.
- iOS Release builds always disable skipping.
- Web development without Supabase settings can use skip mode; normal Apple/Google login still requires its existing configured services.
