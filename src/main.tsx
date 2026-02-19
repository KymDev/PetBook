import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/enhanced.css";
import "./styles/mobile-layout.css";
import "./i18n/config";

createRoot(document.getElementById("root")!).render(<App />);

// Enable viewport meta tag for mobile optimization
if (!document.querySelector('meta[name="viewport"]')) {
  const viewport = document.createElement('meta');
  viewport.name = 'viewport';
  viewport.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=5.0';
  document.head.appendChild(viewport);
}
