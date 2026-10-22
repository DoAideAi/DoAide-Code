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
  {
    slug: 'github',
    title: 'Use DoAide Code with GitHub: Review PRs and Repos with Free AI',
    description:
      'How to use DoAide Code with your GitHub repositories: AI review before you raise a PR, explaining unfamiliar repo code, diffing branches, and the assistant working on local clones.',
    h1: 'DoAide Code + GitHub',
    updated: '2026-10-22',
    body: `<p class="meta">Updated 2026-10-22</p>
<h1>DoAide Code + GitHub</h1>
<p>DoAide Code fits around a GitHub workflow at two levels: the free paste-in tools polish the code you are about to push, and the full assistant works directly on your local clones — so everything it does flows through your normal <code>git commit</code> and <code>git push</code>, reviewed by you.</p>
<a class="cta" href="/tools/code-review">Review code before your next PR</a>
<h2 id="before-pr">Before you raise a pull request</h2>
<p>The cheapest review comment is the one that never gets written. Before opening a PR:</p>
<ol>
<li><strong>Review the change:</strong> paste the function or file you touched into the <a href="/tools/code-review">AI code review tool</a>. Fix correctness and security findings first.</li>
<li><strong>Diff what you changed:</strong> paste the old and new version into the <a href="/tools/diff-checker">diff checker</a> for a clean side-by-side you can sanity-check (or screenshot into the PR description).</li>
<li><strong>Cover it with tests:</strong> the <a href="/tools/generate-tests">unit test generator</a> turns the new function into a runnable suite — PRs with tests merge faster.</li>
<li><strong>Explain it to reviewers:</strong> run <a href="/tools/explain-code">Explain code</a> on a gnarly change and paste the summary into the PR description. Reviewers love you for it.</li>
</ol>
<h2 id="reading-repos">Understanding a repository you just cloned</h2>
<p>Dropped into an unfamiliar codebase — a new job, an open-source project, a teammate's branch? Work file by file: copy the entry point into <a href="/tools/explain-code">Explain code</a>, then follow the imports. For suspicious functions, <a href="/tools/find-bugs">Find bugs</a> tells you whether that edge case you noticed is real. It is the fastest way to turn "I have no idea what this does" into a mental map.</p>
<h2 id="assistant">The assistant: your clones, your commits</h2>
<p>DoAide Code's assistant works on repositories the way you do: on a local clone. Point it at a project directory on your laptop and it reads the code, makes edits there, and leaves <strong>you</strong> to review the diff and commit. There is no GitHub OAuth app to authorize and no bot pushing to your branches — your repo never leaves your machine, and everything that reaches GitHub went through your own <code>git push</code>.</p>
<p>A typical loop: ask for a change → the assistant edits your working directory → <code>git diff</code> (or your editor's git pane) shows exactly what changed → commit, push, open the PR. It tries free local models first and uses Claude only when needed, so most tasks cost nothing.</p>
<a class="cta" href="/">See how the assistant works</a>
<h2 id="faq">Frequently asked questions</h2>
<details><summary>Does DoAide Code need access to my GitHub account?</summary><p>No. The free tools take pasted code, and the assistant works on local clones. Nothing connects to your GitHub account, and nothing pushes on your behalf.</p></details>
<details><summary>Can DoAide Code review a whole pull request?</summary><p>The free tool reviews what you paste — for a focused PR, that is usually the changed file or functions. The assistant can work across a whole local clone, including changes spanning files.</p></details>
<details><summary>Can I use it on private repositories?</summary><p>Yes — because it works on your local clone, private repos work exactly like public ones. Only the snippets you paste into the free tools are sent for analysis.</p></details>
<details><summary>Is there a GitHub App or bot that comments on PRs?</summary><p>Not today. DoAide Code is deliberately pull-based: you bring it code and decide what to do with its answers. A PR-review bot is on the roadmap.</p></details>`,
    faqs: [
      [
        'Does DoAide Code need access to my GitHub account?',
        'No. The free tools take pasted code, and the assistant works on local clones. Nothing connects to your GitHub account, and nothing pushes on your behalf.',
      ],
      [
        'Can I use DoAide Code on private repositories?',
        'Yes — it works on your local clone, so private repos work exactly like public ones. Only the snippets you paste into the free tools are sent for analysis.',
      ],
      [
        'Is there a GitHub App or bot that comments on PRs?',
        'Not today. DoAide Code is pull-based: you bring it code and decide what to do with its answers. A PR-review bot is on the roadmap.',
      ],
    ],
  },
]
