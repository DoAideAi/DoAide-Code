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
  {
    slug: 'features',
    title: 'DoAide Code Features: 12 Free AI Code Tools & Dev Utilities (No Sign-Up)',
    description:
      'Every DoAide Code feature: free AI code review, explain code, find bugs, add comments, convert between 17 languages, optimize, generate unit tests, plus diff checker, formatter, regex tester, JSON viewer, embeds, a keyless REST API and a local-first AI assistant.',
    h1: 'Every DoAide Code feature',
    updated: '2026-10-23',
    body: `<p class="meta">Updated 2026-10-23</p>
<h1>Every DoAide Code feature</h1>
<p>DoAide Code is 12 free developer tools, a keyless REST API and a local-first AI coding assistant. Everything on this page works without an account, in any browser, under fair-use rate limits. This is the complete list — what each tool does and when to reach for it.</p>
<a class="cta" href="/tools">Open the free tools</a>
<h2 id="ai-tools">The 7 AI code tools</h2>
<div class="card"><h2><a href="/tools/code-review">AI Code Review</a></h2><p>Paste a function or file and get a senior-engineer review: correctness, security, performance and readability findings, grouped by severity, each with a concrete fix. The highest-leverage tool on the site — run it before every commit of non-trivial logic.</p></div>
<div class="card"><h2><a href="/tools/explain-code">Explain Code</a></h2><p>A plain-English, step-by-step walkthrough of any pasted code: what each part does, why it's there, what the idioms mean. For unfamiliar codebases, dense Stack Overflow answers, inherited regexes, and learning a new language from real code.</p></div>
<div class="card"><h2><a href="/tools/find-bugs">Find Bugs</a></h2><p>A focused defect hunt: what breaks this code, the exact input that triggers it, and the fix. Reaches the empty-list division, the Unicode edge case, the unawaited async call — the bugs you can't see because you wrote the code.</p></div>
<div class="card"><h2><a href="/tools/add-comments">Add Comments</a></h2><p>Your code back with clear comments and docstrings explaining what it does and why — ready for teammates, assignments, or future-you. Comment density follows the code's complexity, not a template.</p></div>
<div class="card"><h2><a href="/tools/convert-code">Convert Code</a></h2><p>Idiomatic translation between 17 languages — Python, JavaScript, TypeScript, Java, Go, Rust, C, C++, C#, PHP, Ruby, Kotlin, Swift, SQL, Bash, HTML, CSS. Translates intent, not lines: list comprehensions become streams, callbacks become asyncio, error handling moves styles correctly.</p></div>
<div class="card"><h2><a href="/tools/optimize-code">Optimize Code</a></h2><p>A faster version of your function with every change explained — better algorithms and data structures first, micro-tweaks last. The explanations teach you to spot the next O(n²) loop yourself.</p></div>
<div class="card"><h2><a href="/tools/generate-tests">Generate Unit Tests</a></h2><p>One function in, a runnable suite out: happy path, edge cases and error handling in the idiomatic framework — pytest, JUnit 5, Jest, NUnit/xUnit, Go testing. Generated edge cases double as a bug-finding pass.</p></div>
<h2 id="utilities">The 5 in-browser utilities (nothing is uploaded)</h2>
<div class="card"><h2><a href="/tools/diff-checker">Diff Checker</a></h2><p>Paste two versions of a file and see every added, removed and changed line side by side. Runs entirely in your browser — the fastest answer to "what did I change since it last worked?"</p></div>
<div class="card"><h2><a href="/tools/code-formatter">Code Formatter</a></h2><p>Beautify JavaScript, JSON, CSS, HTML or Python with consistent indentation, right in the page. Format before you debug: tidy code makes bugs visible.</p></div>
<div class="card"><h2><a href="/tools/regex-tester">Regex Tester</a></h2><p>Type a regex and a test string; every match and capture group highlights live as you type. The only way regular expressions are actually learnable.</p></div>
<div class="card"><h2><a href="/tools/json-formatter">JSON Formatter &amp; Validator</a></h2><p>Validate JSON, see the exact line of any error, and explore the result as a collapsible tree. For the first (and five-hundredth) time an API returns a wall of text.</p></div>
<div class="card"><h2><a href="/tools/embed-code">Embeddable Code Widget</a></h2><p>Paste code, get an iframe snippet for your blog, docs or README site. Readers see the highlighted snippet and can open it in the free AI tools with one click.</p></div>
<h2 id="api">The free REST API — no key</h2>
<p>Every AI tool above is one POST endpoint away: <code>POST /api/public/code-tool</code> with an action (<code>explain</code>, <code>review</code>, <code>bugs</code>, <code>comments</code>, <code>convert</code>, <code>optimize</code>, <code>tests</code>) and your code; Markdown comes back. No API key, fair-use limits of 8 requests per 10 minutes. People run it in git pre-commit hooks, CI steps and editor macros — the <a href="/api-docs">API docs</a> include ready-made recipes.</p>
<h2 id="assistant">The AI coding assistant — free local models first</h2>
<p>Beyond the paste-in tools, DoAide Code is a full assistant built as a multi-model harness. A small agent runs on your laptop, reads the repo you point it at, and a router sends each task to the cheapest model that can handle it: free local models (via Ollama) answer first, Claude only when a task genuinely needs it, with automatic escalation and fallback when an executor fails. Your code stays on your machine — edits land in your working directory, you review them with ordinary <code>git diff</code>, and you can chat from your laptop or your phone. Works beside <a href="/vscode">VS Code</a> and your <a href="/github">GitHub workflow</a>.</p>
<h2 id="everywhere">Features that run through everything</h2>
<ul>
<li><strong>No sign-up, anywhere:</strong> every tool is a URL — works on lab PCs, locked-down office laptops and borrowed machines.</li>
<li><strong>Share links:</strong> each result page generates a link that carries the snippet in the URL fragment, so the code never touches the server — plus one-tap WhatsApp sharing.</li>
<li><strong>Snippet history:</strong> recent snippets are kept on your machine for two-keystroke re-checks after an edit.</li>
<li><strong>One URL per tool:</strong> bookmarkable, linkable, embeddable.</li>
<li><strong>17 languages</strong> with auto-detection across all AI tools.</li>
<li><strong>Guides:</strong> practical <a href="/guides">AI coding guides</a> for review, conversion, testing and learning workflows.</li>
</ul>
<a class="cta" href="/tools/code-review">Start with a free AI code review</a>
<h2 id="faq">Frequently asked questions</h2>
<details><summary>Are all DoAide Code features really free?</summary><p>Yes — every tool, the API and the guides are free with no account, under fair-use rate limits (8 AI requests per 10 minutes per address). The assistant minimizes its own cost by trying free local models before Claude.</p></details>
<details><summary>Which features work completely offline / in-browser?</summary><p>The five utilities — diff checker, formatter, regex tester, JSON viewer and embed builder — run entirely in your browser; nothing is uploaded. The seven AI tools send only the snippet you paste.</p></details>
<details><summary>What languages does DoAide Code support?</summary><p>JavaScript, TypeScript, Python, Java, Go, Rust, C, C++, C#, PHP, Ruby, Kotlin, Swift, SQL, Bash, HTML and CSS, with auto-detection. Convert works between any pair.</p></details>
<details><summary>Is there a limit on code size?</summary><p>AI tools take up to 12,000 characters per request — a function, class or file. For whole-project work, use the local assistant, which reads your repo on your own machine.</p></details>`,
    faqs: [
      [
        'Are all DoAide Code features really free?',
        'Yes — every tool, the REST API and the guides are free with no account, under fair-use rate limits of 8 AI requests per 10 minutes.',
      ],
      [
        'Which DoAide Code features run entirely in the browser?',
        'The diff checker, code formatter, regex tester, JSON formatter and embed builder run fully client-side — nothing is uploaded. The AI tools send only the snippet you paste.',
      ],
      [
        'What languages does DoAide Code support?',
        'Seventeen languages including Python, JavaScript, TypeScript, Java, Go, Rust, C, C++, C#, PHP, Ruby, Kotlin, Swift, SQL and Bash, with auto-detection.',
      ],
      [
        'Does DoAide Code have an API?',
        'Yes — a free REST API with no key: one POST endpoint runs any of the AI tools and returns Markdown. Recipes for git hooks and CI are in the API docs.',
      ],
    ],
  },
  {
    slug: 'compare',
    title: 'DoAide Code vs GitHub Copilot, ChatGPT, Cursor & More (2026 Comparison)',
    description:
      'Feature-by-feature comparison of DoAide Code against GitHub Copilot, ChatGPT, Cursor, Windsurf, Tabnine, Amazon Q Developer, JetBrains AI, Qodo and CodeRabbit: price, review, tests, conversion, privacy and setup.',
    h1: 'DoAide Code vs the alternatives',
    updated: '2026-10-23',
    body: `<p class="meta">Updated 2026-10-23</p>
<h1>DoAide Code vs the alternatives</h1>
<p>There are a dozen AI coding tools worth knowing in 2026, and they are not interchangeable: some type for you, some chat with you, some review your pull requests, and some — like <a href="/tools">DoAide Code</a> — check and transform code you already have, free and without an account. This page compares them feature by feature, honestly: where each tool wins is stated plainly, including where it beats us.</p>
<h2 id="table">The full comparison table</h2>
<table>
<tr><th>Tool</th><th>Core job</th><th>Free tier</th><th>Paid from</th><th>Account / setup</th><th>Code review</th><th>Test generation</th><th>Language conversion</th><th>Autocomplete</th><th>Privacy posture</th></tr>
<tr><td><strong>DoAide Code</strong></td><td>Review, explain, convert, test, debug pasted code; local repo assistant; keyless API</td><td>Everything — fair-use limits, no account</td><td>—</td><td>None: open a URL</td><td>Structured, severities + fixes, built in</td><td>One click, idiomatic framework</td><td>Dedicated tool, 17 languages</td><td>No</td><td>You paste only the snippet; utilities fully in-browser; assistant keeps repo local</td></tr>
<tr><td>GitHub Copilot</td><td>Inline autocomplete + editor chat</td><td>Limited monthly completions/chats</td><td>$10/mo</td><td>GitHub account + extension</td><td>Via chat; PR review on higher tiers</td><td>Via chat prompts</td><td>Via chat prompts</td><td>Yes — best in class</td><td>Editor context sent to service</td></tr>
<tr><td>ChatGPT</td><td>General-purpose chat, including code</td><td>Capped free tier</td><td>$20/mo (Plus)</td><td>Account required</td><td>Via prompts you write; quality varies with prompt</td><td>Via prompts</td><td>Via prompts</td><td>No</td><td>Pasted content per OpenAI policy</td></tr>
<tr><td>Cursor</td><td>AI-first code editor (fork of VS Code)</td><td>Limited free plan</td><td>$20/mo</td><td>Account + switch editors</td><td>In-editor chat/agent</td><td>Via chat/agent</td><td>Via chat</td><td>Yes</td><td>Project context sent; privacy mode on paid plans</td></tr>
<tr><td>Windsurf</td><td>AI editor + autocomplete (ex-Codeium)</td><td>Free tier with credits</td><td>$15/mo</td><td>Account + editor/plugin</td><td>In-editor chat</td><td>Via chat</td><td>Via chat</td><td>Yes</td><td>Editor context sent</td></tr>
<tr><td>Tabnine</td><td>Privacy-focused autocomplete</td><td>Basic free plan</td><td>$9/mo</td><td>Account + plugin</td><td>Limited, via chat</td><td>Via chat</td><td>No dedicated tool</td><td>Yes</td><td>Strong: local/VPC options for teams</td></tr>
<tr><td>Amazon Q Developer</td><td>Autocomplete + AWS-centric assistant</td><td>Free tier with limits</td><td>$19/mo (Pro)</td><td>AWS Builder ID + plugin</td><td>Security scans, via IDE</td><td>Via chat; /test in IDE</td><td>Code transformation (Java focus)</td><td>Yes</td><td>AWS data policies</td></tr>
<tr><td>JetBrains AI Assistant</td><td>Assistant inside JetBrains IDEs</td><td>Limited free quota</td><td>$10/mo</td><td>JetBrains account + IDE</td><td>In-IDE chat and actions</td><td>Built-in action</td><td>Via chat</td><td>Yes (full line)</td><td>IDE context sent</td></tr>
<tr><td>Qodo (ex-CodiumAI)</td><td>Test generation + PR review</td><td>Free for individuals (limits)</td><td>$19/mo</td><td>Account + plugin/app</td><td>PR-focused (Qodo Merge)</td><td>Its specialty</td><td>No</td><td>Some</td><td>Repo/PR context sent</td></tr>
<tr><td>CodeRabbit</td><td>Automated PR review bot</td><td>Free for open source</td><td>$12/mo per dev</td><td>GitHub/GitLab app install</td><td>Its specialty — inline PR comments</td><td>No</td><td>No</td><td>No</td><td>Repo access via app permissions</td></tr>
</table>
<p class="meta">Prices are typical individual-plan list prices as of October 2026 and change often — check each vendor. "Via chat" means the capability exists if you prompt for it, without a dedicated, consistent tool.</p>
<h2 id="categories">The honest category guide</h2>
<h3>If you want autocomplete while typing</h3>
<p>Get Copilot, Cursor, Windsurf or Tabnine — that's their core job and DoAide Code doesn't do it. Then use DoAide Code to <a href="/tools/code-review">review what got generated</a>: autocomplete optimizes for plausible, review optimizes for correct, and the pairing is genuinely strong.</p>
<h3>If you want code review</h3>
<p>Three different shapes: <strong>CodeRabbit/Qodo Merge</strong> review pull requests automatically inside GitHub — best for teams with PR flow and the budget/permissions for a bot. <strong>Editor chats</strong> review on request with whatever prompt you write. <strong>DoAide Code</strong> gives the same structured review every time — severities, fixes — with zero install and zero account, plus a <a href="/api-docs">keyless API</a> for hooks and CI. For solo developers, students and anyone on a locked-down machine, that last shape is usually the practical one.</p>
<h3>If you want test generation</h3>
<p>Qodo is the specialist with deep IDE integration; DoAide Code's <a href="/tools/generate-tests">test generator</a> covers the core need — happy path, edges, errors, idiomatic framework — with no setup at all.</p>
<h3>If you want to understand or transform existing code</h3>
<p>Explaining, converting between languages, optimizing, documenting: these are DoAide Code's home turf — <a href="/tools/explain-code">dedicated</a> <a href="/tools/convert-code">tools</a> rather than prompts, each one URL. General chatbots do it too if you write the prompt and don't mind run-to-run variance.</p>
<h3>If your constraint is privacy</h3>
<p>Tabnine (enterprise) and local models are the strictest options. DoAide Code's posture: you choose exactly which snippet leaves your machine, the utilities never upload anything, and the full assistant works on your local clone with free local models first — see <a href="/features">all features</a>.</p>
<h2 id="deep-dives">Deep dives</h2>
<ul>
<li><a href="/compare/doaide-code-vs-github-copilot">DoAide Code vs GitHub Copilot</a> — the autocomplete-vs-review split in detail.</li>
<li><a href="/compare/doaide-code-vs-chatgpt">DoAide Code vs ChatGPT</a> — purpose-built tools vs general chat.</li>
<li><a href="/guides/free-github-copilot-alternative">The free Copilot alternative guide</a> — which jobs move over for free.</li>
<li><a href="/guides/best-free-code-review-tools">Best free code review tools</a> — linters, scanners and AI compared.</li>
</ul>
<a class="cta" href="/tools">Try DoAide Code free — no sign-up</a>
<h2 id="faq">Frequently asked questions</h2>
<details><summary>What is the best free alternative to paid AI coding tools?</summary><p>For review, explanation, conversion, debugging and test generation, DoAide Code covers the jobs free with no account. For autocomplete, the realistic free options are limited tiers of Copilot or Windsurf, or local models in your editor.</p></details>
<details><summary>Why is DoAide Code free when competitors charge $10–20/month?</summary><p>Routing: most tasks are served by cheap or free local models, with expensive models reserved for genuinely hard tasks. Low serving cost sustains the no-login free tier; the tools are also the front door to the full assistant.</p></details>
<details><summary>Can DoAide Code replace my editor's AI assistant?</summary><p>If you mainly use the assistant for review/explain/test/convert — yes, free. If you rely on inline completions while typing, keep the editor tool and add DoAide Code as the checking layer.</p></details>
<details><summary>Which tool is best for students?</summary><p>DoAide Code: zero setup, zero cost, works on lab PCs, and the review/explain tools teach the why, not just the what. Verified students should also claim Copilot's free student plan — the two combine well.</p></details>`,
    faqs: [
      [
        'What is the best free alternative to GitHub Copilot and other paid AI coding tools?',
        'For review, explanation, conversion, debugging and test generation, DoAide Code does those jobs free with no account at code.doaide.com. For inline autocomplete, the free options are limited tiers of Copilot or Windsurf, or local models.',
      ],
      [
        'How does DoAide Code compare to Cursor and Windsurf?',
        'Cursor and Windsurf are AI editors with autocomplete — paid for full use, account required. DoAide Code is a free, no-account checking layer: structured review, explain, convert and tests, plus a local assistant. Different jobs; many developers use both.',
      ],
      [
        'Is there a free AI PR review bot like CodeRabbit?',
        'CodeRabbit is free for open-source repos. For everything else, DoAide Code offers free review of pasted diffs and functions plus a keyless API you can call from hooks and CI without installing a bot.',
      ],
    ],
  },
]
