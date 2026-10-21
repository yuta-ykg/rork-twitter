import { createRoot } from "react-dom/client";

import { AuthProvider } from "@/hooks/useAuth";

import App from "./App.tsx";
import "./index.css";
import "./text-size.css";
import { applyTheme } from "@/lib/theme";
import { applyTextSize } from "@/lib/textSize";

applyTheme();
applyTextSize();

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);
