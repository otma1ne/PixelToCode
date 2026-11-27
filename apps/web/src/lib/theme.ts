export type ThemeMode = "dark" | "light" | "system";

export const THEME_STORAGE_KEY = "ptc-theme";

/**
 * Runs in <head> before the first paint so the saved theme never flashes.
 * Dark is the default; "system" removes the attribute and lets tokens.css follow the OS.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem("${THEME_STORAGE_KEY}");if(m==="light"||m==="dark")document.documentElement.setAttribute("data-theme",m);else if(m!=="system")document.documentElement.setAttribute("data-theme","dark");}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

export function readThemeMode(): ThemeMode {
  try {
    const m = localStorage.getItem(THEME_STORAGE_KEY);
    if (m === "light" || m === "dark" || m === "system") return m;
  } catch {
    // Storage unavailable.
  }
  return "dark";
}

const THEME_EVENT = "ptc-theme-change";

export function applyThemeMode(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // The choice lasts for this page only.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** For useSyncExternalStore: notifies on changes in this tab and in other tabs. */
export function subscribeThemeMode(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
