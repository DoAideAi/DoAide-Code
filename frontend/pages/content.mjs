// Static SEO landing pages (rendered to dist/<slug> by scripts/build-guides.mjs, like the
// guides). Each explains one way into DoAide Code and links to the free /tools pages.
// public/serve.json routes each slug to its index.html ahead of the SPA catch-all.

export const pages = [
  {
    slug: 'vscode',
    title: 'Use DoAide Code with VS Code: Free AI Code Review Beside Your Editor',
    description:
      'How to use DoAide Code next to VS Code: AI code review, explain, convert and test tools in a browser pane, and the DoAide assistant editing your working directory live.',
    h1: 'DoAide Code + VS Code',
    updated: '2026-10-22',
    body: `<p class="meta">Updated 2026-10-22</p>
<h1>DoAide Code + VS Code</h1>
<p>DoAide Code runs in the browser, which makes it a natural companion to VS Code: dock it beside your editor and you get free AI code review, explanations, conversions and test generation without installing anything, signing up, or sending your whole project anywhere.</p>
<a class="cta" href="/tools/code-review">Open the free AI tools</a>
<h2 id="setup">The 30-second setup</h2>
<ol>
<li>Open <a href="/tools">code.doaide.com/tools</a> in your browser.</li>
<li>Snap the browser and VS Code side by side (<code>Win + ←/→</code> on Windows, drag to screen edges on macOS, or use a second monitor).</li>
<li>Copy code from VS Code, paste it into a tool, press <code>Ctrl/⌘ + Enter</code>.</li>
</ol>
<p>That's it — there is nothing to install. The tools keep your recent snippets on your machine, so re-checking a function after an edit is two keystrokes.</p>
<h2 id="workflow">A workflow that sticks</h2>
<table>
<tr><th>Moment in VS Code</th><th>Tool to reach for</th></tr>
<tr><td>Before you commit a tricky function</td><td><a href="/tools/code-review">AI code review</a> — correctness, security, performance, with fixes</td></tr>
<tr><td>You inherited code you don't understand</td><td><a href="/tools/explain-code">Explain code</a> — step-by-step, plain English</td></tr>
<tr><td>A bug you can't see</td><td><a href="/tools/find-bugs">Find bugs</a> — the input that breaks it, and the fix</td></tr>
<tr><td>Porting a snippet between languages</td><td><a href="/tools/convert-code">Convert code</a> — idiomatic, not line-by-line</td></tr>
<tr><td>The test file is empty again</td><td><a href="/tools/generate-tests">Generate unit tests</a> — happy path, edge cases, errors</td></tr>
<tr><td>Comparing two versions of a file</td><td><a href="/tools/diff-checker">Diff checker</a> — side-by-side, in the page</td></tr>
</table>
<h2 id="assistant">The full assistant: edits land straight in VS Code</h2>
<p>The paste-in tools are the free, no-account tier. DoAide Code itself is an AI coding assistant that works on your <em>whole</em> project: a small agent runs on your laptop, reads the repo you point it at, and makes edits in your working directory. Because the files change on disk, <strong>VS Code picks every edit up instantly</strong> — you watch diffs appear in your editor, review them with VS Code's own git tools, and commit when happy. It tries free local models first and escalates to Claude only when a task needs it, so most tasks cost nothing.</p>
<a class="cta" href="/">Learn how the assistant works</a>
<h2 id="faq">Frequently asked questions</h2>
<details><summary>Is there a DoAide Code extension in the VS Code marketplace?</summary><p>Not yet. Today DoAide Code runs in the browser beside VS Code, and the assistant's edits appear in your editor automatically because they happen in your working directory. A marketplace extension is on the roadmap.</p></details>
<details><summary>Do I need an account to use the tools next to VS Code?</summary><p>No. Every tool on code.doaide.com/tools is free and works without sign-up, with fair-use rate limits.</p></details>
<details><summary>Does my code leave my machine?</summary><p>Only the snippet you paste into an AI tool is sent for analysis. The utilities (diff, formatter, regex, JSON) run entirely in the page. The full assistant keeps your repo on your laptop and sends only the context a task needs.</p></details>
<details><summary>Does this work with other editors?</summary><p>Yes — the same workflow fits JetBrains IDEs, Vim, Sublime or anything else. Nothing here is specific to VS Code except the window-snapping shortcuts.</p></details>`,
    faqs: [
      [
        'Is there a DoAide Code extension in the VS Code marketplace?',
        'Not yet. DoAide Code runs in the browser beside VS Code, and the assistant edits files in your working directory, so changes appear in the editor automatically. A marketplace extension is on the roadmap.',
      ],
      [
        'Do I need an account to use DoAide Code next to VS Code?',
        'No. Every tool on code.doaide.com/tools is free and works without sign-up, with fair-use rate limits.',
      ],
      [
        'Does my code leave my machine?',
        'Only the snippet pasted into an AI tool is sent for analysis. The diff, formatter, regex and JSON utilities run entirely in the page.',
      ],
    ],
  },
]
