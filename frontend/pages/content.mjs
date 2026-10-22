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
  {
    slug: 'api-docs',
    title: 'DoAide Code API: Free REST API for AI Code Review, Explain & Tests',
    description:
      'REST API documentation for the free DoAide Code tools: one POST endpoint for explain, review, find-bugs, comments, convert, optimize and test generation. No key needed, fair-use rate limits.',
    h1: 'DoAide Code API',
    updated: '2026-10-22',
    body: `<p class="meta">Updated 2026-10-22</p>
<h1>DoAide Code API</h1>
<p>Everything the free tools on this site do is available over one small REST API — the same endpoints the pages call. No API key, no sign-up: just fair-use rate limits. Use it from scripts, git hooks, CI, or your own editor plugins.</p>
<p><strong>Base URL:</strong> <code>https://code.doaide.com</code> · All requests and responses are JSON.</p>
<h2 id="run">POST /api/public/code-tool</h2>
<p>Runs one tool on one snippet and returns the answer as Markdown.</p>
<pre><code>curl -s https://code.doaide.com/api/public/code-tool \\
  -H 'Content-Type: application/json' \\
  -d '{
    "action": "review",
    "code": "def avg(nums):\\n    return sum(nums) / len(nums)",
    "language": "Python"
  }'</code></pre>
<h3>Request body</h3>
<table>
<tr><th>Field</th><th>Type</th><th>Required</th><th>Meaning</th></tr>
<tr><td><code>action</code></td><td>string</td><td>yes</td><td>One of <code>explain</code>, <code>review</code>, <code>bugs</code>, <code>comments</code>, <code>convert</code>, <code>optimize</code>, <code>tests</code></td></tr>
<tr><td><code>code</code></td><td>string</td><td>yes</td><td>The snippet to analyze, up to 12,000 characters</td></tr>
<tr><td><code>language</code></td><td>string</td><td>no</td><td>Hint like <code>"Python"</code>; omit for auto-detect</td></tr>
<tr><td><code>target</code></td><td>string</td><td>convert only</td><td>The language to convert to, e.g. <code>"Go"</code></td></tr>
</table>
<h3>Response</h3>
<pre><code>{ "answer": "### Review\\n1. **Division by zero** — \`avg([])\` raises \`ZeroDivisionError\` …" }</code></pre>
<p>The <code>answer</code> is Markdown: render it, or pipe it to a terminal viewer like <code>glow</code>.</p>
<h3>Errors</h3>
<table>
<tr><th>Status</th><th>Meaning</th></tr>
<tr><td><code>400</code></td><td>Bad input — unknown action, empty code, over the 12,000-character limit, or convert without a target. The <code>detail</code> field says which.</td></tr>
<tr><td><code>429</code></td><td>Rate limited — more than 8 requests in 10 minutes from your address, or the shared hourly cap. Back off and retry later.</td></tr>
<tr><td><code>502</code> / <code>503</code></td><td>The AI service is busy or the tools are off on this server. Retry with backoff.</td></tr>
</table>
<h2 id="stats">GET /api/public/tool-stats</h2>
<p>How many snippets the tools have analyzed, ever. Handy for status pages and badges.</p>
<pre><code>curl -s https://code.doaide.com/api/public/tool-stats
{ "snippets": 1234 }</code></pre>
<h2 id="recipes">Recipes</h2>
<h3>Review staged changes in a git pre-commit hook</h3>
<pre><code>#!/bin/sh
# .git/hooks/pre-commit — AI-review each staged file (advisory, never blocks)
git diff --cached --name-only --diff-filter=ACM | while read -r f; do
  jq -n --arg code "$(git show ":$f")" '{action:"review", code:$code}' \\
  | curl -s https://code.doaide.com/api/public/code-tool \\
      -H 'Content-Type: application/json' -d @- \\
  | jq -r '.answer' | sed "s|^|[$f] |"
done
exit 0</code></pre>
<h3>Python</h3>
<pre><code>import requests

r = requests.post(
    "https://code.doaide.com/api/public/code-tool",
    json={"action": "tests", "code": open("utils.py").read(), "language": "Python"},
    timeout=90,
)
r.raise_for_status()
print(r.json()["answer"])</code></pre>
<h3>JavaScript / Node</h3>
<pre><code>const res = await fetch("https://code.doaide.com/api/public/code-tool", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "explain", code: "const f = (n) => (n <= 1 ? 1 : n * f(n - 1))" }),
})
const { answer } = await res.json()</code></pre>
<h2 id="fair-use">Fair use</h2>
<ul>
<li><strong>8 requests per 10 minutes</strong> per client address, plus a shared hourly cap — designed for interactive and hook-style use, not batch processing.</li>
<li>Send one focused snippet per request (a function or file, not a whole repo).</li>
<li>Don't send secrets: strip API keys and passwords before submitting, as with any online tool.</li>
<li>The API may evolve; this page documents the current contract.</li>
</ul>
<a class="cta" href="/tools">Try the same tools in the browser</a>
<h2 id="faq">Frequently asked questions</h2>
<details><summary>Do I need an API key?</summary><p>No. The public endpoints are open with fair-use rate limits. If you need higher limits for a real integration, reach out via doaide.com.</p></details>
<details><summary>Is my code stored?</summary><p>Snippets are processed to produce the answer and counted in aggregate (the total on the tools page). Don't send secrets or code you cannot share.</p></details>
<details><summary>Can I use this in CI?</summary><p>Yes, within the rate limits — review the changed files of a commit rather than the whole repository, and treat failures as advisory so a busy API never blocks your pipeline.</p></details>`,
    faqs: [
      [
        'Does the DoAide Code API need an API key?',
        'No. The public endpoints are open with fair-use rate limits: 8 requests per 10 minutes per client address.',
      ],
      [
        'What can the DoAide Code API do?',
        'One POST endpoint runs any of the free tools on a pasted snippet: explain, review, find bugs, add comments, convert between languages, optimize, and generate unit tests. Answers come back as Markdown.',
      ],
      [
        'Is code sent to the API stored?',
        'Snippets are processed to produce the answer and counted in aggregate. Do not send secrets or code you cannot share.',
      ],
    ],
  },
  {
    slug: 'compare/doaide-code-vs-github-copilot',
    title: 'DoAide Code vs GitHub Copilot (2026): Which Do You Actually Need?',
    description:
      'An honest comparison of DoAide Code and GitHub Copilot: price, autocomplete vs review, privacy, setup, and when each one wins. Spoiler: they solve different problems and combine well.',
    h1: 'DoAide Code vs GitHub Copilot',
    updated: '2026-10-22',
    body: `<p class="meta">Updated 2026-10-22</p>
<h1>DoAide Code vs GitHub Copilot</h1>
<p>Short answer: they are different kinds of tool. <strong>GitHub Copilot</strong> is an autocomplete engine that writes code <em>as you type</em> inside your editor, for a monthly subscription. <strong>DoAide Code</strong> is a free review-and-understand layer — paste code and get a senior-style review, an explanation, a conversion or a test suite, no account needed — plus an assistant that works on your whole local repo, trying free models first. Many developers use both: Copilot to write faster, DoAide Code to check what got written.</p>
<h2 id="table">Side by side</h2>
<table>
<tr><th></th><th>DoAide Code</th><th>GitHub Copilot</th></tr>
<tr><td>Core job</td><td>Review, explain, convert, test and debug code you already have</td><td>Suggest code as you type; chat in the editor</td></tr>
<tr><td>Price</td><td>Free tools, no sign-up; assistant routes to free local models first</td><td>Free tier with monthly limits; paid from $10/month</td></tr>
<tr><td>Setup</td><td>None — open a URL</td><td>Editor extension + GitHub account</td></tr>
<tr><td>Code review</td><td>Structured review with severities and fixes, built in</td><td>Via chat prompts; PR review on paid plans</td></tr>
<tr><td>Unit test generation</td><td>One click, idiomatic framework</td><td>Via chat prompts</td></tr>
<tr><td>Language conversion</td><td>Dedicated tool, any pair</td><td>Via chat prompts</td></tr>
<tr><td>Autocomplete while typing</td><td>No</td><td>Yes — its core strength</td></tr>
<tr><td>Works without sending your repo to a vendor</td><td>Yes — paste only the snippet; the assistant keeps the repo local</td><td>Editor context is sent to the service</td></tr>
<tr><td>Account required</td><td>No</td><td>Yes (GitHub)</td></tr>
</table>
<h2 id="copilot-wins">Where Copilot wins</h2>
<p>If you write a lot of boilerplate-heavy code in a supported editor, Copilot's inline completions are genuinely fast — it shines at finishing the line you started, filling in repetitive patterns, and drafting functions from a comment. Nothing on DoAide Code competes with keystroke-level autocomplete, and we don't pretend otherwise.</p>
<h2 id="doaide-wins">Where DoAide Code wins</h2>
<ul>
<li><strong>Price and friction:</strong> the review, explain, convert, bug-finding and test tools are free with no account — useful on a locked-down work machine, a college lab PC, or a friend's laptop.</li>
<li><strong>Checking code, not just writing it:</strong> autocomplete tools generate plausible code; DoAide Code's <a href="/tools/code-review">review</a> and <a href="/tools/find-bugs">bug finder</a> are built to interrogate it. Reviewing Copilot's output is a textbook use.</li>
<li><strong>Understanding unfamiliar code:</strong> <a href="/tools/explain-code">Explain code</a> gives a structured walkthrough without any editor setup.</li>
<li><strong>Privacy posture:</strong> you choose exactly which snippet leaves your machine; the full assistant works on your local clone and tries free local models first.</li>
</ul>
<h2 id="together">Using them together</h2>
<p>A workflow we see a lot: Copilot drafts code in the editor → paste the finished function into the <a href="/tools/code-review">free AI review</a> → fix what it flags → <a href="/tools/generate-tests">generate the tests</a> → commit. The writing tool and the checking tool are different muscles; this uses both.</p>
<a class="cta" href="/tools/code-review">Review your code free — no sign-up</a>
<h2 id="faq">Frequently asked questions</h2>
<details><summary>Is DoAide Code a replacement for GitHub Copilot?</summary><p>Only if what you want from Copilot is review, explanation, conversion or tests — those are free on DoAide Code. If you want inline autocomplete while typing, Copilot is the right tool and DoAide Code complements it.</p></details>
<details><summary>Is DoAide Code really free?</summary><p>The tools at code.doaide.com/tools are free with no sign-up, under fair-use rate limits. The full assistant minimizes cost by trying free local models before Claude.</p></details>
<details><summary>Which is better for students?</summary><p>Students usually start with DoAide Code: zero setup, zero cost, and the review/explain tools teach you why code is wrong, not just what to type. GitHub also offers Copilot free for verified students.</p></details>`,
    faqs: [
      [
        'Is DoAide Code a replacement for GitHub Copilot?',
        'Only if what you want is review, explanation, conversion or tests — those are free on DoAide Code without an account. For inline autocomplete while typing, Copilot is the right tool; many developers use both.',
      ],
      [
        'What does DoAide Code cost compared to GitHub Copilot?',
        'The DoAide Code tools are free with no sign-up. GitHub Copilot has a limited free tier and paid plans from $10/month.',
      ],
    ],
  },
  {
    slug: 'compare/doaide-code-vs-chatgpt',
    title: 'DoAide Code vs ChatGPT for Coding (2026): Honest Comparison',
    description:
      'DoAide Code vs ChatGPT for code review, debugging, conversion and tests: purpose-built prompts vs general chat, sign-up friction, privacy, and when a general chatbot is actually better.',
    h1: 'DoAide Code vs ChatGPT for coding',
    updated: '2026-10-22',
    body: `<p class="meta">Updated 2026-10-22</p>
<h1>DoAide Code vs ChatGPT for coding</h1>
<p>You can paste code into ChatGPT and ask "review this" — so why would anyone use a dedicated tool? Because for the recurring coding tasks (review, explain, find bugs, convert, optimize, generate tests), a purpose-built tool asks the model the right question every time, skips the sign-in, and gives you a workflow — language detection, share links, snippet history, embeds — instead of a chat transcript. For everything else, a general chatbot is genuinely better. Here is the honest split.</p>
<h2 id="table">Side by side</h2>
<table>
<tr><th></th><th>DoAide Code</th><th>ChatGPT</th></tr>
<tr><td>Scope</td><td>Seven focused code tools + developer utilities</td><td>General assistant: anything, including code</td></tr>
<tr><td>Sign-up</td><td>None</td><td>Account required</td></tr>
<tr><td>Prompting</td><td>Built in — tuned per task, consistent output shape</td><td>You write (and rewrite) the prompt yourself</td></tr>
<tr><td>Price for these tasks</td><td>Free, fair-use limits</td><td>Free tier with limits; Plus from $20/month</td></tr>
<tr><td>Review quality consistency</td><td>Same structured review every time</td><td>Varies with how you ask</td></tr>
<tr><td>Dev utilities (diff, regex, JSON, formatter)</td><td>Built in, run in your browser</td><td>Not its job</td></tr>
<tr><td>Long back-and-forth about design</td><td>Not the paste-in tools' job</td><td>Excellent</td></tr>
<tr><td>Whole-project work</td><td>The assistant works on your local repo</td><td>Paste-limited (or separate products)</td></tr>
</table>
<h2 id="chatgpt-wins">Where ChatGPT wins</h2>
<p>Open-ended questions. "Should I use PostgreSQL or MongoDB for this?", "design a schema for a food-delivery app", "why might this architecture not scale?" — conversational, context-heavy, iterative discussions are what a general chatbot is for. The same goes for mixing code with everything else: writing docs, drafting emails about the bug, learning concepts with follow-up questions.</p>
<h2 id="doaide-wins">Where DoAide Code wins</h2>
<ul>
<li><strong>Zero friction:</strong> no account, no login wall, no app — a URL that works on any machine, including the lab computer and the locked-down office laptop.</li>
<li><strong>The prompt is the product:</strong> the <a href="/tools/code-review">review tool</a> always checks correctness, security, performance and readability with severities and fixes; <a href="/tools/generate-tests">test generation</a> always covers happy path, edges and errors in the idiomatic framework. No prompt engineering, no "as an AI" preamble, no variance.</li>
<li><strong>A workflow, not a transcript:</strong> one URL per tool, shareable links that carry the code, WhatsApp sharing, recent-snippet history, <a href="/tools/embed-code">embeddable widgets</a>, and in-browser utilities (diff, regex, JSON, formatter) beside the AI tools.</li>
<li><strong>Repo-scale work stays local:</strong> the full assistant edits your working directory on your laptop instead of you pasting a project into a chat window.</li>
</ul>
<h2 id="pick">Which should you use?</h2>
<p>Use ChatGPT (or any general chatbot) to <em>think</em> — design discussions, concept learning, open questions. Use DoAide Code to <em>check and produce</em> — the five-times-a-day mechanical tasks where you want the same rigorous answer with zero setup. They are not competitors so much as different rooms in the same workshop.</p>
<a class="cta" href="/tools">Try the free code tools</a>
<h2 id="faq">Frequently asked questions</h2>
<details><summary>Is DoAide Code just ChatGPT with a skin?</summary><p>No. Each tool ships a task-specific prompt, input validation, language handling and output formatting, runs on fast server-side models, and sits next to non-AI utilities that run entirely in your browser. You never write or tune a prompt.</p></details>
<details><summary>Can ChatGPT do everything DoAide Code does?</summary><p>Mostly yes, if you sign in, write good prompts and don't mind variance between runs. The point of DoAide Code is that the recurring tasks take one paste and one click, free and without an account.</p></details>
<details><summary>Which is better for debugging?</summary><p>For "here is a function, find what breaks it", DoAide Code's <a href="/tools/find-bugs">Find bugs</a> is faster and more consistent. For "my app misbehaves and I don't know where to look", a conversation — with ChatGPT or with DoAide Code's full assistant on your repo — fits better.</p></details>`,
    faqs: [
      [
        'Is DoAide Code better than ChatGPT for code review?',
        'For the recurring task — paste a function, get a structured review with severities and fixes — yes: no account, no prompt writing, consistent output. For open-ended design discussions, a general chatbot like ChatGPT is better.',
      ],
      [
        'Do I need an account for DoAide Code like I do for ChatGPT?',
        'No. Every tool on code.doaide.com/tools works without sign-up, with fair-use rate limits.',
      ],
    ],
  },
]
