import { createRoot } from "react-dom/client";

import { AuthProvider } from "@/hooks/useAuth";

import App from "./App.tsx";
import "./index.css";
import { applyTheme } from "@/lib/theme";

applyTheme();

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);
