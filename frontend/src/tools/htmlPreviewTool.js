// The HTML preview (/tools/html-preview): assemble the HTML, CSS and JS panes into one document
// for a sandboxed iframe. Everything stays in the page; the frame gets scripts but no same-origin
// access, so the preview cannot touch the site.

export const MAX_PREVIEW_CHARS = 100_000

// </style> or </script> typed inside a pane must not end our wrapper tags early.
const safeCss = (css) => css.replace(/<\/(style)/gi, '<\\/$1')
const safeJs = (js) => js.replace(/<\/(script)/gi, '<\\/$1')

// One self-contained document. Errors in the user's JS land in a strip at the bottom of the frame
// instead of a silent nothing.
export function buildDoc(html, css, js) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>${safeCss(css)}</style>
</head>
<body>
${html}
<script>
window.onerror = function (msg, src, line) {
  var el = document.getElementById('__err');
  if (!el) {
    el = document.createElement('pre');
    el.id = '__err';
    el.style.cssText = 'position:fixed;left:0;right:0;bottom:0;margin:0;padding:8px 12px;background:#7f1d1d;color:#fecaca;font:12px/1.5 monospace;white-space:pre-wrap;z-index:9999';
    document.body.appendChild(el);
  }
  el.textContent += 'Error: ' + msg + (line ? ' (line ' + line + ')' : '') + '\\n';
};
</script>
<script>${safeJs(js)}</script>
</body>
</html>`
}

export const SAMPLE_HTML = '<h1>Hello!</h1>\n<p>Edit the HTML, CSS and JS panes — the preview updates as you type.</p>\n<button id="btn">Click me</button>'
export const SAMPLE_CSS = 'body { font-family: system-ui, sans-serif; padding: 24px; }\nh1 { color: #0ea5e9; }\nbutton { padding: 8px 16px; border-radius: 8px; border: 1px solid #cbd5e1; cursor: pointer; }'
export const SAMPLE_JS = "document.getElementById('btn').addEventListener('click', () => {\n  document.querySelector('h1').textContent = 'It works!';\n});"
