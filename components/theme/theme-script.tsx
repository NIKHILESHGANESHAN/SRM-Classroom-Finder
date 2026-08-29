import { THEME_STORAGE_KEY } from "@/components/theme/theme-toggle";

/**
 * Inline script applied before paint to avoid a flash of the wrong theme.
 * Must stay in sync with next-themes `storageKey` and `attribute="class"`.
 */
export function ThemeScript() {
  const script = `(function(){try{var k="${THEME_STORAGE_KEY}";var t=localStorage.getItem(k);var d=document.documentElement;var m=window.matchMedia("(prefers-color-scheme: dark)");if(t==="dark"||(!t||t==="system")&&m.matches){d.classList.add("dark")}else{d.classList.remove("dark")}}catch(e){}})();`;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
