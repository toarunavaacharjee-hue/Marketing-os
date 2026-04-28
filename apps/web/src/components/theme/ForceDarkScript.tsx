export function ForceDarkScript() {
  const code = `
(() => {
  try {
    document.documentElement.classList.add('dark');
  } catch {}
})();`.trim();
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

