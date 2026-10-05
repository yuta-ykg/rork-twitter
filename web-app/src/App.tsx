import { LikeIconProvider } from "@/hooks/useLikeIcon";
import { ThemeProvider } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/language";
import LoginPage from "./pages/Login";
import SettingsPage from "./pages/Settings";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import ProfilePage, { ProfileEditPage } from "./pages/Profile";
import AuthCallback from "./pages/AuthCallback";
import { NotificationsPage, BookmarksPage, HomePage, MinePage, PostPage, SearchPage } from "./pages/Index";
import { ListPage, ListsPage } from "./pages/Lists";
import NotFound from "./pages/NotFound";

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
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
          <Route path="/search" element={<RequireAuth><SearchPage /></RequireAuth>} />
          <Route path="/profile/edit" element={<RequireAuth><ProfileEditPage /></RequireAuth>} />
          <Route path="/profile/:id" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
          <Route path="/bookmarks" element={<RequireAuth><BookmarksPage /></RequireAuth>} />
          <Route path="/lists" element={<RequireAuth><ListsPage /></RequireAuth>} />
          <Route path="/lists/:id" element={<RequireAuth><ListPage /></RequireAuth>} />
          <Route path="/mine" element={<RequireAuth><MinePage /></RequireAuth>} />
          <Route path="/post/:id" element={<RequireAuth><PostPage /></RequireAuth>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<RequireAuth><NotFound /></RequireAuth>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </LikeIconProvider>
  </ThemeProvider>
);

export default App;

