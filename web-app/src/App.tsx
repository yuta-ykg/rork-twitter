import { useAuth } from "@/hooks/authContext";
import { t } from "@/lib/language";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";

const LoginPage = lazy(() => import("./pages/Login"));
const ComposePage = lazy(() => import("./pages/Compose"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const HomePage = lazy(() => import("./pages/Home"));
const NotificationsPage = lazy(() => import("./pages/Notifications"));
const MessagesPage = lazy(() => import("./pages/Messages"));
const MinePage = lazy(() => import("./pages/Mine"));
const EditProfilePage = lazy(() => import("./pages/EditProfile"));
const PostDetailPage = lazy(() => import("./pages/PostDetail"));
const SearchPage = lazy(() => import("./pages/Search"));

const queryClient = new QueryClient();

/** ログインしていないときはアプリの内容を見せない。 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return <div className="grid min-h-dvh place-items-center text-[#536471]">{t("読み込み中…")}</div>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;
  return children;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<div className="grid min-h-dvh place-items-center text-[#536471]">{t("読み込み中…")}</div>}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
          <Route path="/search" element={<RequireAuth><SearchPage /></RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
          <Route path="/messages" element={<RequireAuth><MessagesPage /></RequireAuth>} />
          <Route path="/mine" element={<RequireAuth><MinePage /></RequireAuth>} />
          <Route path="/mine/edit" element={<RequireAuth><EditProfilePage /></RequireAuth>} />
          <Route path="/post/:id" element={<RequireAuth><PostDetailPage /></RequireAuth>} />
          <Route path="/compose" element={<RequireAuth><ComposePage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
