import { LikeIconProvider } from "@/hooks/useLikeIcon";
import { ThemeProvider } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/authContext";
import { t } from "@/lib/language";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const CommunitiesPage = lazy(() => import("./pages/Communities"));
const ListsPage = lazy(() => import("./pages/Lists"));
const PublicListPage = lazy(() => import("./pages/PublicList"));
const LoginPage = lazy(() => import("./pages/Login"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const FeatureGuidePage = lazy(() => import("./pages/FeatureGuide"));
const ProfilePage = lazy(() => import("./pages/Profile"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const HomePage = lazy(() => import("./pages/Home"));
const NotificationsPage = lazy(() => import("./pages/Notifications"));
const BookmarksPage = lazy(() => import("./pages/Bookmarks"));
const MinePage = lazy(() => import("./pages/Mine"));
const PostPage = lazy(() => import("./pages/Post"));
const SearchPage = lazy(() => import("./pages/Search"));
const DiagnosesPage = lazy(() => import("./pages/Diagnoses"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

/** ログインしていないときはアプリの内容を見せない。 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return <div className="grid min-h-dvh place-items-center text-muted-foreground">{t("読み込み中…")}</div>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

const App = () => (
  <ThemeProvider>
  <LikeIconProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<div className="grid min-h-dvh place-items-center text-muted-foreground">{t("読み込み中…")}</div>}>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/communities" element={<CommunitiesPage />} />
            <Route path="/communities/:id" element={<CommunitiesPage />} />
            <Route path="/public/lists/:id" element={<PublicListPage />} />
            <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
            <Route path="/lists" element={<RequireAuth><ListsPage /></RequireAuth>} />
            <Route path="/lists/:id" element={<RequireAuth><ListsPage /></RequireAuth>} />
            <Route path="/search" element={<RequireAuth><SearchPage /></RequireAuth>} />
            <Route path="/diagnoses" element={<RequireAuth><DiagnosesPage /></RequireAuth>} />
            <Route path="/profile/:id" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
            <Route path="/guide" element={<RequireAuth><FeatureGuidePage /></RequireAuth>} />
            <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
            <Route path="/bookmarks" element={<RequireAuth><BookmarksPage /></RequireAuth>} />
            <Route path="/mine" element={<RequireAuth><MinePage /></RequireAuth>} />
            <Route path="/post/:id" element={<RequireAuth><PostPage /></RequireAuth>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<RequireAuth><NotFound /></RequireAuth>} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </LikeIconProvider>
  </ThemeProvider>
);

export default App;
