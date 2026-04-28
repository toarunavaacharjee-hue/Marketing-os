export function ThemeScript() {
  const code = `
(() => {
  try {
    const key = 'aimw_theme';
    const stored = localStorage.getItem(key);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const mode = stored === 'light' || stored === 'dark' ? stored : (prefersDark ? 'dark' : 'light');
    const root = document.documentElement;
    if (mode === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  } catch {}
})();`.trim();

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

