// Static SEO guides, rendered to dist/guides by scripts/build-guides.mjs
// (same approach as DoAide Coach). Each guide links into the free /tools pages.

export const site = {
  name: 'DoAide Code',
  url: 'https://code.doaide.com',
  lang: 'en-IN',
  color: '#0f1013',
  accent: '#60a5fa',
  nav: [
    ['/tools', 'Free tools'],
    ['/all-tools', 'All tools'],
    ['/features', 'Features'],
    ['/guides', 'Guides'],
    ['/compare', 'Compare'],
  ],
  footer:
    'DoAide Code: free AI code tools — review, explain, convert and test code without sign-up. Also from DoAide: <a href="https://resume.doaide.com">free resume builder</a> · <a href="https://coach.doaide.com">AI interview prep</a>',
  indexTitle: 'AI Coding Guides for Developers | DoAide Code',
  indexH1: 'AI coding guides',
  indexDescription:
    'Practical guides for developers and CS students in India: AI code review, converting code between languages, and generating unit tests — with free tools for each.',
  indexCta: 'Try the free AI code tools',
}

export const guides = [
  {
    slug: 'free-ai-code-review-online',
    title: 'Free AI Code Review Online: How to Review Code with AI (2026) | DoAide Code',
    h1: 'How to review code with AI, free and without sign-up',
    description:
      'How AI code review works, what it catches (bugs, security issues, performance problems), how it compares to human review, and how to get a free AI code review online in seconds — no sign-up.',
    updated: '2026-10-22',
    intro: `<p>Code review is the single highest-leverage quality practice in software teams — and the most skipped. Solo developers, students and small startup teams in India often ship code nobody else ever reads. AI code review closes that gap: paste a function or a file, and in seconds you get the kind of feedback a careful senior engineer would leave on a pull request.</p>
<p>This guide explains what AI code review actually catches, where it beats (and loses to) human review, and how to fold it into your daily workflow. You can try everything in it with the <a href="/tools/code-review">free AI code review tool</a> — no account needed.</p>`,
    sections: [
      [
        'what-it-catches',
        'What an AI code review actually catches',
        `<p>A good AI review reads your code the way an experienced reviewer does — line by line, but also as a whole. In practice it reliably flags:</p>
<ul>
<li><strong>Logic bugs:</strong> off-by-one errors, inverted conditions, unhandled <code>null</code>/<code>undefined</code>, mutations of shared state, async calls that are never awaited.</li>
<li><strong>Security issues:</strong> SQL built by string concatenation, unsanitised user input reaching <code>innerHTML</code> or shell commands, secrets hard-coded in source, weak crypto choices.</li>
<li><strong>Error-handling gaps:</strong> empty <code>catch</code> blocks, missing timeouts on network calls, failure paths that leak resources or leave data half-written.</li>
<li><strong>Performance problems:</strong> N+1 database queries, O(n²) loops over large inputs, repeated work inside loops that belongs outside, unnecessary re-renders in React components.</li>
<li><strong>Readability and maintainability:</strong> misleading names, dead code, functions doing three jobs, duplicated logic that should be one helper.</li>
</ul>
<p>Paste any function into the <a href="/tools/code-review">AI code review tool</a> and compare its findings with this list — the structured verdict groups issues by severity so you can fix the dangerous ones first.</p>`,
      ],
      [
        'ai-vs-human',
        'AI review vs human review: strengths and limits',
        `<p>AI review is not a replacement for a teammate — it is the reviewer you get when no teammate is available, and the first pass that makes human review faster.</p>
<table>
<tr><th></th><th>AI review</th><th>Human review</th></tr>
<tr><td>Speed</td><td>Seconds</td><td>Hours to days</td></tr>
<tr><td>Consistency</td><td>Never tired, never skims</td><td>Quality drops with load</td></tr>
<tr><td>Bug patterns, security smells</td><td>Very strong</td><td>Varies by reviewer</td></tr>
<tr><td>Business context ("is this the right feature?")</td><td>Weak — it only sees the code</td><td>Strong</td></tr>
<tr><td>Architecture across many files</td><td>Limited by what you paste</td><td>Strong</td></tr>
<tr><td>Cost</td><td>Free</td><td>Senior engineer time</td></tr>
</table>
<p>The practical takeaway: run AI review <em>before</em> asking a human. Your pull request arrives cleaner, and the human reviewer spends their attention on design questions instead of pointing out a missing null check.</p>`,
      ],
      [
        'how-to',
        'How to get a free AI code review in 30 seconds',
        `<ol>
<li>Open the <a href="/tools/code-review">AI code review tool</a>.</li>
<li>Paste the function, class or file you want reviewed. One focused chunk (up to a few hundred lines) gets sharper feedback than an entire project at once.</li>
<li>Pick the language if it isn't auto-detected.</li>
<li>Read the findings by severity: fix correctness and security first, then performance, then style.</li>
<li>Re-run after fixing — a clean second pass is your merge signal.</li>
</ol>
<p>If the review flags a bug you don't understand, paste the same code into <a href="/tools/explain-code">Explain Code</a> for a plain-English walkthrough, or run <a href="/tools/find-bugs">Find Bugs</a> for a deeper hunt focused purely on defects.</p>`,
      ],
      [
        'workflow',
        'Folding AI review into your daily workflow',
        `<p>Where AI review pays off most:</p>
<ul>
<li><strong>Before every commit</strong> of non-trivial logic — a 30-second check that catches the embarrassing bugs.</li>
<li><strong>Before raising a pull request</strong> — reviewers notice when your PRs are consistently clean.</li>
<li><strong>When touching unfamiliar code</strong> — review your own change plus the surrounding function to catch interactions you didn't see.</li>
<li><strong>In college projects and assignments</strong> — students get reviewer-quality feedback that hostels and labs rarely provide; it is how you learn what "production quality" means before your first job.</li>
<li><strong>In interviews prep</strong> — reviewing your own practice solutions teaches the patterns interviewers probe for.</li>
</ul>`,
      ],
      [
        'writing-reviewable-code',
        'Writing code that reviews well',
        `<p>AI or human, the same habits make code review-friendly: small functions with one job, names that say what things are, early returns over deep nesting, explicit error handling, and comments only where the <em>why</em> isn't obvious from the code. If an AI review keeps flagging the same category of issue in your code, that category is your next skill to level up — the fastest feedback loop a self-taught developer can get.</p>
<p>Two companion tools help here: <a href="/tools/add-comments">Add Comments</a> documents a gnarly function so the next reader (often future you) isn't lost, and <a href="/tools/optimize-code">Optimize Code</a> rewrites hot paths the review flagged as slow.</p>`,
      ],
    ],
    faqs: [
      [
        'Is AI code review accurate?',
        'For well-scoped inputs — a function, a class, a file — modern AI review is highly accurate at catching logic bugs, security smells, error-handling gaps and performance problems, and it never gets tired or skims. It is weaker on business context and cross-file architecture, so treat it as a rigorous first pass, not the final word.',
      ],
      [
        'Is the DoAide Code review tool really free?',
        'Yes. The code review, explain, find-bugs, convert, optimize and test-generation tools on code.doaide.com are free and need no sign-up. There are fair-use rate limits to keep the service available for everyone.',
      ],
      [
        'Is it safe to paste my code into an AI review tool?',
        'Paste nothing you cannot share: strip API keys, passwords and proprietary secrets before submitting, as you would with any online tool. For most application code, snippets and assignments, online review is fine; for highly sensitive code, review policies with your employer first.',
      ],
      [
        'Can AI code review replace human code review?',
        'No — it replaces the absence of review. AI catches mechanical and pattern-level issues faster than humans, but humans judge requirements, architecture and trade-offs. The best workflow is AI first, human second.',
      ],
      [
        'Which languages does AI code review support?',
        'All mainstream languages work well: Python, JavaScript, TypeScript, Java, C, C++, C#, Go, PHP, Ruby, Kotlin, Swift, SQL and shell scripts. The DoAide Code tool auto-detects the language from your paste.',
      ],
    ],
    cta: ['/tools/code-review', 'Get a free AI code review now'],
  },
  {
    slug: 'convert-code-between-languages-ai',
    title: 'Convert Code Between Languages with AI: Python ⇄ Java, JS & More | DoAide Code',
    h1: 'How to convert code between languages with AI (Python, Java, JavaScript and more)',
    description:
      'How to convert Python to Java, JavaScript to Python, or any language pair with an AI code converter — what translates cleanly, what needs care (types, libraries, idioms), and a free online converter.',
    updated: '2026-10-22',
    intro: `<p>"Convert this Python code to Java" is one of the most common requests in CS labs, coding forums and workplaces alike — assignments demand a specific language, a team migrates a service, or you simply understand one language and are learning another. Line-by-line manual translation is slow and error-prone; naive converters produce code that compiles but isn't idiomatic.</p>
<p>AI code conversion does it properly: it understands what the code <em>means</em> and rewrites it the way a fluent developer of the target language would. This guide covers what converts cleanly, what to watch, and how to verify the result. Try any example in the <a href="/tools/convert-code">free AI code converter</a>.</p>`,
    sections: [
      [
        'how-it-works',
        'How AI code conversion is different from transpilers',
        `<p>A transpiler maps syntax mechanically — it turns a Python <code>for</code> loop into a Java <code>for</code> loop and gives up on anything without a direct equivalent. An AI converter translates <em>intent</em>:</p>
<ul>
<li>A Python list comprehension becomes a Java stream pipeline, not a bolted-on loop.</li>
<li>Python's <code>dict.get(key, default)</code> becomes <code>map.getOrDefault(key, default)</code>, not a try/except imitation.</li>
<li>A JavaScript callback chain becomes idiomatic Python with <code>asyncio</code>, or synchronous code where that is the natural fit.</li>
<li>Error handling moves between exception styles (<code>try/except</code> ⇄ <code>try/catch</code> ⇄ Go-style returned errors) correctly.</li>
</ul>
<p>The output reads like it was written in the target language, which matters for grades, reviews and maintenance alike.</p>`,
      ],
      [
        'common-pairs',
        'The most common conversion pairs, and what to watch in each',
        `<table>
<tr><th>Conversion</th><th>Usually clean</th><th>Needs attention</th></tr>
<tr><td>Python → Java</td><td>Control flow, OOP structure, collections</td><td>Static types must be inferred; duck typing has no direct equivalent; integer division and negative modulo differ</td></tr>
<tr><td>Java → Python</td><td>Almost everything — Python is more permissive</td><td>Threads vs the GIL; interfaces become protocols or ABCs; checked exceptions disappear</td></tr>
<tr><td>JavaScript → Python</td><td>Logic, JSON handling, string work</td><td>Async model differs (event loop vs asyncio); <code>==</code> coercion bugs surface; browser APIs have no equivalent</td></tr>
<tr><td>Python → C++</td><td>Algorithms, numeric code</td><td>Memory management, references vs copies, no garbage collector — review carefully</td></tr>
<tr><td>PHP → Python/Node</td><td>Request handling, DB queries</td><td>Framework idioms (Laravel/WordPress) need re-architecture, not line translation</td></tr>
</table>
<p>Numbers deserve special care everywhere: integer overflow exists in Java/C++ but not Python; <code>-7 // 2</code> and <code>-7 / 2</code> round differently across languages; floating-point formatting differs. If the code does arithmetic at boundaries, test those cases first.</p>`,
      ],
      [
        'libraries',
        'Libraries: the real work of any conversion',
        `<p>Syntax converts in seconds; dependencies are where migrations actually spend time. A good AI converter maps standard libraries automatically (Python <code>json</code> → Java Jackson/Gson, <code>requests</code> → <code>fetch</code>/HttpClient, <code>unittest</code> → JUnit) and flags third-party libraries that have no direct equivalent so you can choose a replacement deliberately.</p>
<p>Practical rule: convert the pure logic first, get it tested, then tackle I/O and framework edges one at a time. Converting a 50-line algorithm is a 2-minute job; converting a Django view to Spring Boot is a design task that the converter can draft but you must own.</p>`,
      ],
      [
        'verify',
        'How to verify converted code (do not skip this)',
        `<ol>
<li><strong>Read it.</strong> If you can't follow the output, run it through <a href="/tools/explain-code">Explain Code</a> until you can — submitting or shipping code you don't understand is how converted-code bugs survive.</li>
<li><strong>Test with the same inputs.</strong> Run both versions on identical inputs, including edge cases: empty input, negative numbers, Unicode strings, very large values.</li>
<li><strong>Generate unit tests.</strong> Paste the converted code into the <a href="/tools/generate-tests">unit test generator</a> to get a test suite in the target language's idiomatic framework, then make it pass.</li>
<li><strong>Review it.</strong> A pass through the <a href="/tools/code-review">AI code review tool</a> catches conversion artefacts — unused imports, non-idiomatic patterns, missed error paths.</li>
</ol>`,
      ],
      [
        'learning',
        'Using conversion to learn a new language faster',
        `<p>Conversion is an underrated learning tool. Take code you wrote and understand deeply in your first language, convert it, and study the diff: how the new language names things, handles errors, structures modules. Because you already know what the code does, 100% of your attention goes to <em>how the language expresses it</em> — far more efficient than reading tutorials of toy examples. Convert your old assignments, your utility scripts, your interview-practice solutions; within a week the new language's idioms start appearing in code you write from scratch.</p>`,
      ],
    ],
    faqs: [
      [
        'Can AI convert Python code to Java accurately?',
        'Yes, for well-scoped code — functions, classes and algorithms convert with high accuracy, including idiomatic use of Java collections, streams and exceptions. Full applications with frameworks and third-party dependencies convert in parts, with library choices needing human decisions. Always run tests on the output.',
      ],
      [
        'Is there a free online code converter without sign-up?',
        'Yes — the DoAide Code converter at code.doaide.com/tools/convert-code is free, needs no account, and supports Python, Java, JavaScript, TypeScript, C, C++, C#, Go, PHP, Ruby, Kotlin and more in any direction.',
      ],
      [
        'Does converted code work the same as the original?',
        'For pure logic, usually yes — but languages differ in integer division, overflow behaviour, floating-point formatting, string encoding and async models, so edge cases can diverge. Verify by running both versions on the same inputs and generating a unit test suite for the converted code.',
      ],
      [
        'Can I convert an entire project at once?',
        'Convert module by module instead. Pure-logic files convert almost perfectly; files touching frameworks, databases or OS APIs need per-file decisions. A file-at-a-time approach with tests after each file is faster in practice than one giant conversion you cannot debug.',
      ],
      [
        'Is using an AI converter cheating for college assignments?',
        'Policies vary by institution — check yours. Used well, conversion is a study aid: write the solution yourself in the language you know, convert it, then learn why the target version looks the way it does. Submitting code you cannot explain helps nobody, least of all you in the viva.',
      ],
    ],
    cta: ['/tools/convert-code', 'Convert code free with AI'],
  },
  {
    slug: 'ai-unit-test-generator',
    title: 'AI Unit Test Generator: Write Test Cases Automatically (Free, 2026) | DoAide Code',
    h1: 'How to generate unit tests with AI: from zero tests to a real suite',
    description:
      'How an AI unit test generator works, what makes a good generated test suite (happy path, edge cases, error handling), pytest/JUnit/Jest examples, and a free online tool — no sign-up.',
    updated: '2026-10-22',
    intro: `<p>Everyone agrees tests matter; almost nobody enjoys writing them. The result is codebases — student projects and production services alike — where the test folder is empty or stops at one happy-path check. AI test generation removes the activation energy: paste a function, get a runnable suite covering the happy path, the edge cases you forgot, and the error handling you hoped nobody would trigger.</p>
<p>This guide shows what good generated tests look like, how to adapt them to pytest, JUnit or Jest, and how to use test generation to find bugs <em>before</em> they find you. Everything here works in the <a href="/tools/generate-tests">free unit test generator</a>.</p>`,
    sections: [
      [
        'what-good-tests',
        'What a good generated test suite contains',
        `<p>Ask an AI for tests and you should get three layers, not one:</p>
<ul>
<li><strong>Happy path:</strong> typical inputs producing expected outputs — the tests that document what the function is for.</li>
<li><strong>Edge cases:</strong> empty lists and strings, zero and negative numbers, boundaries like exactly-at-limit values, single-element inputs, Unicode and whitespace, duplicate entries, very large inputs.</li>
<li><strong>Error handling:</strong> wrong types, <code>None</code>/<code>null</code>, malformed data, and assertions that the <em>right</em> exception is raised with the right message — not just that "something fails".</li>
</ul>
<p>Each test should have a name that reads as a sentence (<code>test_empty_cart_total_is_zero</code>), test one behaviour, and use the target framework idiomatically — <code>pytest.raises</code> and parametrize in Python, <code>assertThrows</code> and <code>@ParameterizedTest</code> in JUnit 5, <code>expect().toThrow()</code> and <code>test.each</code> in Jest.</p>`,
      ],
      [
        'how-to',
        'Generating your first suite in under a minute',
        `<ol>
<li>Open the <a href="/tools/generate-tests">unit test generator</a>.</li>
<li>Paste one function or class — focused input produces focused tests. Include type hints or JSDoc if you have them; they sharpen the generated assertions.</li>
<li>The tool picks the idiomatic framework for the language (pytest for Python, JUnit for Java, Jest for JavaScript/TypeScript); the generated file states any assumptions it made.</li>
<li>Run the suite. Failing tests are the interesting ones — each is either a bug in your code or a wrong assumption in the test. Decide which, fix accordingly.</li>
<li>Repeat per function until the module is covered.</li>
</ol>
<p>That last step is the quiet superpower: <strong>generated tests are a bug-finding tool</strong>. The edge cases AI proposes — empty input, negative quantity, duplicate IDs — are exactly the inputs you never tried manually. If a generated test fails, read it before deleting it; more often than not, the test is right. For a second opinion on a suspicious function, run <a href="/tools/find-bugs">Find Bugs</a> alongside.</p>`,
      ],
      [
        'what-to-check',
        'Reviewing generated tests: what to check before committing',
        `<ul>
<li><strong>Do the assertions test behaviour or implementation?</strong> Good: "sorting [3,1,2] returns [1,2,3]". Brittle: "the function calls list.sort exactly once". Keep behaviour tests, drop implementation-coupled ones.</li>
<li><strong>Are the expected values actually correct?</strong> AI infers expectations from your code — if the code has a bug, a naive test can enshrine the bug. Spot-check a few expected outputs by hand.</li>
<li><strong>Is external state mocked?</strong> Network calls, databases, clocks and random number generators should be mocked or injected; a unit test that hits a real API is a flaky test waiting to happen.</li>
<li><strong>Do tests clean up after themselves?</strong> Temp files, environment variables, module-level state — generated tests should leave no residue between runs.</li>
</ul>
<p>If a generated test is hard to read, that is usually feedback about the code under test: functions with many parameters, hidden dependencies or mixed responsibilities are hard to test by nature. A pass through the <a href="/tools/code-review">AI code review tool</a> will point at the refactor that makes testing easy.</p>`,
      ],
      [
        'coverage',
        'From one suite to real coverage discipline',
        `<p>A sensible path for a solo developer or a small team:</p>
<ol>
<li><strong>Cover pure logic first</strong> — parsers, calculators, validators, formatters. Highest value per minute, zero mocking needed.</li>
<li><strong>Add tests with every bug fix</strong> — generate a test that reproduces the bug, fix the code, keep the test. Your regression suite builds itself.</li>
<li><strong>Generate tests before refactoring</strong> — lock in current behaviour, refactor, and the green suite proves you broke nothing. This is the single safest way to clean up legacy code.</li>
<li><strong>Target 70-80% line coverage on core modules</strong> rather than 100% everywhere; the last 20% is usually boilerplate whose tests cost more than they protect.</li>
</ol>`,
      ],
      [
        'interviews',
        'Why test-writing skill shows up in interviews and jobs',
        `<p>Indian IT services companies and product startups alike increasingly probe testing in interviews — "how would you test this function?" is now a standard follow-up to coding rounds, and SDET roles are among the fastest-growing openings. Practising with generated suites teaches the vocabulary (fixtures, mocks, parametrised tests, arrange-act-assert) and the instinct for edge cases that interviewers listen for. Generate tests for your practice solutions, study what the AI covered that you didn't, and that gap closes within weeks.</p>`,
      ],
    ],
    faqs: [
      [
        'Can AI write unit tests automatically?',
        'Yes. Paste a function into an AI test generator and it produces a runnable suite covering the happy path, edge cases and error handling in the idiomatic framework for your language — pytest, JUnit, Jest and others. You should still review assertions and run the suite before committing.',
      ],
      [
        'Is there a free AI test case generator online?',
        'Yes — the DoAide Code unit test generator at code.doaide.com/tools/generate-tests is free and requires no sign-up. It supports Python, Java, JavaScript, TypeScript, C#, Go, PHP and more.',
      ],
      [
        'Which test framework does the generated code use?',
        'The generator picks the standard framework for the language: pytest for Python, JUnit 5 for Java, Jest for JavaScript and TypeScript, NUnit/xUnit for C#, and the built-in testing package for Go. You can ask for a specific framework in the input.',
      ],
      [
        'Can generated tests find bugs in my code?',
        'Frequently, yes. Generated edge-case tests — empty inputs, zeros, negatives, boundary values, malformed data — are exactly the inputs developers skip when testing manually. A failing generated test is either a real bug or a wrong assumption; both are worth knowing about.',
      ],
      [
        'Should I trust AI-generated tests completely?',
        'Trust but verify: AI infers expected behaviour from your code and naming, so if the code itself is wrong, a naive test can encode the bug. Spot-check expected values, keep behaviour-based assertions, and drop tests coupled to implementation details.',
      ],
    ],
    cta: ['/tools/generate-tests', 'Generate unit tests free with AI'],
  },
  {
    slug: 'best-free-code-review-tools',
    title: 'Best Free Code Review Tools in 2026: AI, Linters and CI Compared | DoAide Code',
    h1: 'The best free code review tools in 2026',
    description:
      'The free code review stack in 2026: AI review tools, linters and static analysis, and CI-based review bots compared — what each catches, where each fits, and how to combine them for ₹0.',
    updated: '2026-10-22',
    intro: `<p>You no longer need a paid plan — or even a teammate — to get real code review. In 2026 the free tier covers three distinct layers: <strong>linters and static analyzers</strong> that catch mechanical issues instantly, <strong>AI review tools</strong> that read code the way a senior engineer does, and <strong>CI-based checks</strong> that gate what merges. The teams (and solo developers) with the cleanest code use all three, because they catch different things.</p>
<p>This guide compares the layers honestly — including where our own <a href="/tools/code-review">free AI code review</a> fits and where a linter beats it.</p>`,
    sections: [
      [
        'layers',
        'The three layers of free code review',
        `<table>
<tr><th>Layer</th><th>Examples</th><th>Catches</th><th>Misses</th></tr>
<tr><td>Linters & formatters</td><td>ESLint, Ruff, golangci-lint, Prettier, Black</td><td>Style drift, unused variables, suspicious constructs, known footguns — instantly, deterministically</td><td>Logic bugs, security flaws, design problems</td></tr>
<tr><td>Static analysis & security scanner</td><td>Semgrep, CodeQL (free for open source), Bandit, npm audit</td><td>Known vulnerability patterns, tainted data flows, risky APIs</td><td>Novel logic errors, intent mismatches</td></tr>
<tr><td>AI review</td><td><a href="/tools/code-review">DoAide Code review</a>, editor AI chats</td><td>Logic bugs, edge cases, error-handling gaps, performance problems, readability — with reasoning and fixes</td><td>Project-wide architecture unless you provide it; non-deterministic</td></tr>
</table>
<p>The pattern: linters are fast and certain but shallow; AI is deep but should be re-checked; security scanners are narrow but authoritative in their lane. None replaces the others.</p>`,
      ],
      [
        'ai-tools',
        'Free AI review tools compared',
        `<p>What matters when choosing an AI reviewer in 2026:</p>
<ul>
<li><strong>Friction:</strong> does it need an account, an editor, an extension? <a href="/tools/code-review">DoAide Code</a> is a URL — paste, click, done. Editor-integrated chats (Copilot, Cursor and friends) need a sign-in and setup but see more context.</li>
<li><strong>Output structure:</strong> a good review groups findings by severity and shows the fix, not just the complaint. Chat tools give you whatever your prompt earns; purpose-built tools give the same structure every time.</li>
<li><strong>Limits:</strong> free tiers differ — DoAide Code allows 8 reviews per 10 minutes with no account; editor assistants meter monthly completions or requests.</li>
<li><strong>Privacy:</strong> paste-based tools see only the snippet you choose. Editor integrations see your open files. Read the policy either way, and never paste secrets.</li>
</ul>`,
      ],
      [
        'ci',
        'Free review in CI: the merge gate',
        `<p>Whatever reviews code before a commit, CI is where standards become enforceable. The free stack that works on GitHub, GitLab and Bitbucket alike:</p>
<ol>
<li><strong>Lint on every push</strong> — the same config as local, so CI never argues with your editor.</li>
<li><strong>Run the tests</strong> — a reviewer's "looks right" is worthless next to a green suite. If a module has no tests, <a href="/guides/ai-unit-test-generator">generate them</a>.</li>
<li><strong>Scan dependencies</strong> — free vulnerability alerts (Dependabot and equivalents) catch the issues nobody reviews for.</li>
</ol>
<p>AI review fits <em>before</em> the push in this picture: it is the fastest of the three at the "is this logic right?" question, so running it while the code is still in your paste buffer costs the least.</p>`,
      ],
      [
        'stack',
        'A sensible ₹0 stack for a solo dev or small team',
        `<ol>
<li><strong>Editor:</strong> formatter + linter on save (Prettier/ESLint, Black/Ruff — pick per language).</li>
<li><strong>Before each commit:</strong> paste changed functions into the <a href="/tools/code-review">AI review</a>; fix correctness and security findings. Thirty seconds, and it is where most real bugs die.</li>
<li><strong>Before each PR:</strong> <a href="/tools/diff-checker">diff</a> the branch, <a href="/tools/generate-tests">generate tests</a> for new logic.</li>
<li><strong>In CI:</strong> lint + tests + dependency alerts, all free.</li>
<li><strong>Humans:</strong> whatever reviewer time you have goes to design and requirements — the machines above already did the mechanical pass.</li>
</ol>`,
      ],
    ],
    faqs: [
      [
        'What is the best free code review tool in 2026?',
        'There is no single best — linters (ESLint, Ruff), security scanners (Semgrep, CodeQL) and AI reviewers catch different classes of problems. For instant senior-style review of a snippet with no sign-up, DoAide Code’s free AI review is the lowest-friction option; combine it with a linter and CI tests.',
      ],
      [
        'Are free AI code review tools good enough for professional work?',
        'As a first pass, yes — they reliably catch logic bugs, security smells and error-handling gaps. Professional teams still add linters for consistency, CI tests for proof, and human review for design. The free stack covers everything except human judgment.',
      ],
      [
        'Do I need a GitHub account or CI pipeline to get code review?',
        'No. Paste-based AI review works with zero setup, and linters run locally. CI adds enforcement when you work with others, but a solo developer gets most of the value from the local loop.',
      ],
      [
        'Can AI code review tools see my whole repository?',
        'Paste-based tools see only what you paste. Editor-integrated assistants see open files or more. For sensitive code, paste-based review gives you exact control over what leaves your machine.',
      ],
    ],
    cta: ['/tools/code-review', 'Run a free AI code review now'],
  },
  {
    slug: 'ai-code-tools-for-beginners',
    title: 'AI Code Tools for Beginners: Learn to Code Faster in 2026 | DoAide Code',
    h1: 'AI code tools for beginners: learn faster without learning less',
    description:
      'How beginners and CS students should use AI code tools in 2026: explain-first workflows, using review as a tutor, generating tests to understand edge cases — and the habits that keep you learning.',
    updated: '2026-10-22',
    intro: `<p>Every beginner now codes next to an AI. The difference between the students who level up fast and the ones who stall is <em>how</em> they use it: as a tutor that explains and checks, or as a vending machine that dispenses homework. This guide is the tutor setup — a set of free, no-sign-up tools and the habits that make them teach you, aimed at first-year CS students, self-taught developers and anyone switching careers into code.</p>`,
    sections: [
      [
        'explain-first',
        'Habit 1: explain before you copy',
        `<p>Whenever you meet code you didn't write — a tutorial snippet, a Stack Overflow answer, something a chatbot generated — run it through <a href="/tools/explain-code">Explain code</a> before you use it. You get a step-by-step walkthrough: what each part does, why it is there, what the idioms mean.</p>
<p>This single habit separates learning from copying. Reading explanations of real code teaches you patterns 10× faster than tutorials built on toy examples, because the code in front of you is the code you actually care about. If the explanation contains a term you don't know, that term is your next thing to learn.</p>`,
      ],
      [
        'review-as-tutor',
        'Habit 2: use code review as a private tutor',
        `<p>Finished an exercise? It works? You are not done. Paste it into the <a href="/tools/code-review">AI code review</a> and read the findings. Working code that a reviewer would tear apart is the default state of beginner code — unhandled empty inputs, variables named <code>data2</code>, the same logic pasted three times.</p>
<p>The review tells you what a senior engineer would say, with the fix. Two rules make it a tutor instead of a crutch:</p>
<ul>
<li><strong>Fix each finding yourself</strong>, by hand, before re-running the review. The re-run is your exam.</li>
<li><strong>Track your repeat offenders.</strong> Flagged three times for missing error handling? That is your curriculum talking.</li>
</ul>
<p>When a finding confuses you, run <a href="/tools/find-bugs">Find bugs</a> on the same code — seeing the input that breaks your function is the most convincing teacher there is.</p>`,
      ],
      [
        'tests-teach',
        'Habit 3: generate tests to discover edge cases',
        `<p>Beginners test with one happy input. The <a href="/tools/generate-tests">unit test generator</a> shows you what testing actually means: paste your function and look at what comes back — empty lists, zero, negatives, huge inputs, wrong types. Those are the edge cases experienced developers check by reflex, and reading generated suites is how the reflex forms.</p>
<p>Run the tests. When one fails, you have found a real bug in code you believed worked — the single most educational moment programming offers.</p>`,
      ],
      [
        'utilities',
        'The non-AI utilities you should know on day one',
        `<ul>
<li><a href="/tools/json-formatter">JSON formatter</a> — the first time an API returns a wall of JSON, paste it here and explore it as a tree.</li>
<li><a href="/tools/diff-checker">Diff checker</a> — "what did I change since it last worked?" answered visually.</li>
<li><a href="/tools/regex-tester">Regex tester</a> — regex is unlearnable without live feedback; this gives you matches as you type.</li>
<li><a href="/tools/code-formatter">Formatter</a> — consistent indentation makes bugs visible. Format before you debug.</li>
</ul>
<p>These run entirely in your browser — nothing is uploaded — and they are the same category of tool you will use daily in your first job.</p>`,
      ],
      [
        'honest-use',
        'Using AI honestly (assignments, interviews, your own brain)',
        `<p>Three lines worth drawing for yourself:</p>
<ul>
<li><strong>Assignments:</strong> check your institution's policy. A safe default: write the solution yourself, then use review and explain tools to improve it — and be ready to explain every line in a viva, because "the AI wrote it" fails vivas.</li>
<li><strong>Interviews:</strong> you will not have AI in most interviews. Practice solving first and reviewing after, so the solving muscle grows.</li>
<li><strong>The 15-minute rule:</strong> struggle with a bug for 15 minutes before asking the AI. Struggle is where learning happens; the AI's job is to cap it, not to replace it.</li>
</ul>`,
      ],
    ],
    faqs: [
      [
        'Should beginners use AI coding tools or learn without them?',
        'Use them — but as a tutor, not a vending machine. Explain code before copying it, review your own solutions after they work, and fix findings by hand. Learners who use AI to understand code progress faster than those who avoid it or those who paste its output unread.',
      ],
      [
        'Which free AI tools should a CS student start with?',
        'Three cover most of it: Explain code for anything you read, AI code review for everything you write, and the unit test generator to learn edge-case thinking. All are free without sign-up at code.doaide.com/tools.',
      ],
      [
        'Will using AI tools make me a worse programmer?',
        'Only if you let them do the thinking. The risk is real for pure code generation; it is near zero for explain/review/test workflows, which add feedback to code you wrote yourself — the same loop a human mentor provides.',
      ],
      [
        'Is it cheating to use AI tools for college assignments?',
        'Policies differ — check yours. Using AI to explain concepts and review your own work is usually fine; submitting generated solutions as your own usually is not, and it collapses in any viva. When in doubt, ask the instructor.',
      ],
    ],
    cta: ['/tools/explain-code', 'Start with Explain code — free'],
  },
  {
    slug: 'free-ai-code-tools-2026',
    title: '10 Free AI Code Tools Every Developer Needs in 2026 | DoAide Code',
    h1: '10 free AI code tools every developer needs in 2026',
    description:
      'The 10 free AI code tools worth bookmarking in 2026: review, explain, bug finding, test generation, conversion, optimization, local models and more — what each is for and when to reach for it.',
    updated: '2026-10-23',
    intro: `<p>The free tier of AI developer tooling got genuinely good. In 2026 you can get senior-style code review, a full unit-test suite, an idiomatic language conversion and a local model running on your own laptop — all for ₹0 and mostly without an account. The catch is knowing which tool fits which moment.</p>
<p>This list is that map: ten tools (and tool categories), what each one is actually for, and the thirty-second way to try it. Several live right here on <a href="/tools">code.doaide.com/tools</a> — free, no sign-up — and the rest are things we use and recommend even though we didn't build them.</p>`,
    sections: [
      [
        'code-review',
        '1. AI code review — the tool that pays for itself first',
        `<p>If you bookmark one tool from this list, make it review. Paste a function or file into the <a href="/tools/code-review">free AI code review</a> and get findings grouped by severity — correctness, security, performance, readability — each with a concrete fix. It catches the off-by-ones, unhandled empty inputs, SQL built by string concatenation and N+1 queries that slip past tired human eyes.</p>
<p>When to reach for it: before every commit of non-trivial logic, and before every pull request. Thirty seconds that routinely saves a round of review comments.</p>`,
      ],
      [
        'explain',
        '2. Explain code — for every snippet you didn’t write',
        `<p><a href="/tools/explain-code">Explain code</a> turns any pasted snippet into a step-by-step plain-English walkthrough: what each part does, why it is there, what the idioms mean. It is the fastest way through an unfamiliar codebase, a dense Stack Overflow answer, or a regex someone wrote in 2019 and left behind.</p>
<p>When to reach for it: onboarding to a new repo, reviewing AI-generated code before using it, and learning a new language by reading real code instead of toy tutorials.</p>`,
      ],
      [
        'find-bugs',
        '3. A dedicated bug finder — not the same thing as review',
        `<p>Review tells you everything worth improving; <a href="/tools/find-bugs">Find bugs</a> answers one question with full force: <em>what breaks this code, and with which input?</em> It hunts defects — the empty list that divides by zero, the Unicode string that breaks the parser, the race in the async handler — and shows the triggering input plus the fix.</p>
<p>When to reach for it: "it fails sometimes and I can't see why", and as a pre-flight check on functions that handle money, auth or user input.</p>`,
      ],
      [
        'tests',
        '4. Unit test generator — from empty test folder to real suite',
        `<p>The <a href="/tools/generate-tests">AI unit test generator</a> takes one function and returns a runnable suite in the idiomatic framework — pytest, JUnit 5, Jest — covering the happy path, the edge cases you forgot, and error handling. Generated edge-case tests double as a bug-finding tool: a failing generated test is either a real bug or a wrong assumption, and both are worth knowing.</p>
<p>When to reach for it: before refactoring (lock in behaviour first), after fixing a bug (keep the regression test), and whenever the test file is embarrassingly empty.</p>`,
      ],
      [
        'convert',
        '5. Code converter — idiomatic translation between 17 languages',
        `<p>The <a href="/tools/convert-code">AI code converter</a> translates intent, not syntax: a Python list comprehension becomes a Java stream, callback JavaScript becomes idiomatic asyncio Python, error handling moves between exception styles correctly. It beats line-by-line transpilers because the output reads like it was written in the target language.</p>
<p>When to reach for it: assignments that demand a specific language, migrating a service, or learning a new language by converting code you already understand deeply.</p>`,
      ],
      [
        'optimize',
        '6. Code optimizer — algorithms first, micro-tweaks last',
        `<p>Paste a slow function into <a href="/tools/optimize-code">Optimize code</a> and get a faster version with every change explained — better algorithms and data structures first (the O(n²) loop that should be a set lookup), micro-optimizations last. The explanation matters as much as the code: it teaches you to see the next slow loop yourself.</p>
<p>When to reach for it: the endpoint that got slow as data grew, the loop a review flagged, the function profiling pointed at.</p>`,
      ],
      [
        'comments',
        '7. Comment generator — documentation for the next reader',
        `<p><a href="/tools/add-comments">Add comments</a> returns your code with clear comments explaining what it does and why — docstrings, parameter descriptions, the non-obvious decisions. Used well, it documents the gnarly function you wrote at 2 AM so that future-you (the next reader, statistically) isn't lost.</p>
<p>When to reach for it: before handing code to a teammate, submitting an assignment, or archiving a project you'll revisit in six months.</p>`,
      ],
      [
        'utilities',
        '8. Browser-only dev utilities — zero upload, zero AI, daily use',
        `<p>Not everything needs a model. Four utilities you will use weekly, all running entirely in your browser (nothing is uploaded): the <a href="/tools/diff-checker">diff checker</a> for "what changed since it last worked?", the <a href="/tools/regex-tester">regex tester</a> with live matches as you type, the <a href="/tools/json-formatter">JSON formatter</a> that turns an API's wall of text into a collapsible tree, and the <a href="/tools/code-formatter">code formatter</a> — because consistent indentation makes bugs visible.</p>`,
      ],
      [
        'local-models',
        '9. Local models — free AI that never leaves your laptop',
        `<p>Ollama (and tools like it) run open coder models — qwen2.5-coder, DeepSeek-Coder and friends — on your own machine. Free forever, fully private, works offline. On a 16 GB laptop a 7B coder model handles explain/complete/small-edit tasks surprisingly well; with more RAM, 32B models are genuinely capable.</p>
<p>This is the engine behind the DoAide Code assistant's cost model: it <a href="/">routes every task to the cheapest capable model</a> — a local model first, Claude only when the task is hard. You can adopt the same principle manually: local model for routine tasks, hosted tools for the hard ones.</p>`,
      ],
      [
        'api',
        '10. A code-tools API in your hooks and CI — review on every commit',
        `<p>The sleeper pick: all seven AI tools above are also a <a href="/api-docs">free REST API</a> — one POST endpoint, no key, Markdown out. That turns "paste into a website" into "runs automatically": a pre-commit hook that reviews staged files, a CI step that reviews changed functions, an editor macro bound to a keystroke.</p>
<pre><code>curl -s https://code.doaide.com/api/public/code-tool \\
  -H 'Content-Type: application/json' \\
  -d '{"action":"review","code":"def avg(nums):\\n    return sum(nums) / len(nums)"}'</code></pre>
<p>When to reach for it: the moment you notice you've pasted into the same tool three days running — automate it.</p>`,
      ],
    ],
    faqs: [
      [
        'Are these AI code tools really free?',
        'Yes. Every DoAide Code tool listed here is free with no sign-up, under fair-use rate limits (8 AI requests per 10 minutes). The browser utilities and local models via Ollama are free without any limits because they run on your machine.',
      ],
      [
        'What is the best free AI code tool in 2026?',
        'For impact per minute, AI code review — it catches real bugs in code you were about to ship. The best toolkit combines review with explain, a test generator, and a local model for private day-to-day tasks.',
      ],
      [
        'Do free AI code tools require an account or credit card?',
        'The tools on code.doaide.com need neither — open the URL, paste code, done. Some other free tiers (editor autocomplete assistants) require accounts; local models via Ollama need only an install.',
      ],
      [
        'Is it safe to paste code into free AI tools?',
        'Paste only what you can share: strip API keys, passwords and proprietary secrets first. The DoAide utilities (diff, regex, JSON, formatter) run entirely in your browser, and nothing is uploaded at all.',
      ],
      [
        'Can free AI tools replace paid ones like GitHub Copilot?',
        'For review, explanation, conversion and test generation — yes, the free tools here cover it. For inline autocomplete while typing, paid tools like Copilot still lead; see our guide on the free Copilot alternative for the honest split.',
      ],
    ],
    cta: ['/tools', 'Try all 12 free code tools'],
  },
  {
    slug: 'free-github-copilot-alternative',
    title: 'DoAide Code: The Free Alternative to GitHub Copilot (2026) | DoAide Code',
    h1: 'DoAide Code: the free alternative to GitHub Copilot',
    description:
      'Looking for a free GitHub Copilot alternative? What Copilot actually charges for, which of those jobs DoAide Code does free with no sign-up, and the honest cases where Copilot is still worth it.',
    updated: '2026-10-23',
    intro: `<p>"Free GitHub Copilot alternative" is usually a search made at one of three moments: the free tier's monthly limit just ran out, the $10/month renewal came up, or you're on a machine where you can't install extensions at all — the office laptop, the college lab PC. The honest answer depends on which part of Copilot you actually use.</p>
<p>Copilot bundles two different products: <strong>autocomplete while you type</strong>, and <strong>chat-based help with code you already have</strong> — review it, explain it, test it, convert it, debug it. The second bundle is what <a href="/tools">DoAide Code</a> does free, with no account, no extension and no editor requirement. This guide maps exactly which jobs move over, and which don't.</p>`,
    sections: [
      [
        'what-you-pay-for',
        'What you actually pay Copilot for',
        `<p>Copilot's paid plans (from $10/month individual) buy you: unlimited inline completions, editor chat, PR summaries on higher tiers, and access inside supported editors with a GitHub account signed in. The free tier gives a limited monthly allowance of completions and chat requests.</p>
<p>Break that into jobs-to-be-done and a pattern appears: the <em>typing accelerators</em> (completions) genuinely need the paid product, while the <em>understanding and checking</em> jobs — the ones you do in bursts, a few times a day — don't need an editor integration at all. They need a place to paste code and a well-tuned prompt behind it.</p>`,
      ],
      [
        'what-moves-free',
        'The jobs that move to DoAide Code for free',
        `<table>
<tr><th>Job</th><th>In Copilot</th><th>Free on DoAide Code</th></tr>
<tr><td>Review my code</td><td>Chat prompt (counts against limits); PR review on paid tiers</td><td><a href="/tools/code-review">AI code review</a> — structured severities and fixes, every time</td></tr>
<tr><td>Explain this code</td><td>Chat prompt</td><td><a href="/tools/explain-code">Explain code</a> — step-by-step walkthrough</td></tr>
<tr><td>Why does this break?</td><td>Chat back-and-forth</td><td><a href="/tools/find-bugs">Find bugs</a> — the triggering input plus the fix</td></tr>
<tr><td>Write unit tests</td><td>Chat prompt or /tests command</td><td><a href="/tools/generate-tests">Generate tests</a> — idiomatic pytest/JUnit/Jest suite</td></tr>
<tr><td>Convert between languages</td><td>Chat prompt</td><td><a href="/tools/convert-code">Convert code</a> — 17 languages, idiomatic output</td></tr>
<tr><td>Make this faster</td><td>Chat prompt</td><td><a href="/tools/optimize-code">Optimize code</a> — algorithms first, explained</td></tr>
<tr><td>Document this function</td><td>Chat prompt</td><td><a href="/tools/add-comments">Add comments</a></td></tr>
<tr><td>Automate review in hooks/CI</td><td>Paid API/enterprise features</td><td><a href="/api-docs">Free REST API</a>, no key</td></tr>
</table>
<p>The difference in kind, not just price: each DoAide tool ships a task-tuned prompt and a consistent output shape, so "review this" means the same rigorous checklist every time — no prompt engineering, no variance between runs, no monthly request budget to ration.</p>`,
      ],
      [
        'where-copilot-wins',
        'Where Copilot is still worth paying for',
        `<p>Honesty section. Keep (or get) Copilot if:</p>
<ul>
<li><strong>Inline completions are your main speed-up.</strong> Nothing on DoAide Code competes with keystroke-level autocomplete — finishing your line, filling repetitive patterns, drafting a function from a comment. If you write boilerplate-heavy code all day, completions pay for themselves.</li>
<li><strong>You want chat with whole-project context inside the editor.</strong> Copilot sees your open files; the free paste-in tools see only what you paste. (DoAide Code's local assistant closes this gap differently — see below.)</li>
<li><strong>You're a verified student:</strong> GitHub offers Copilot Pro free through the Student Developer Pack — take it, and still use the no-login tools on machines where you can't install anything.</li>
</ul>`,
      ],
      [
        'assistant',
        'The repo-scale alternative: an assistant that tries free models first',
        `<p>For whole-project work, DoAide Code's answer isn't a paste box — it's a <a href="/">local assistant</a> built as a multi-model harness. A small agent runs on your laptop, reads the repo you point it at, and routes each task to the cheapest model that can handle it: free local models (via Ollama) answer first, and only genuinely hard tasks escalate to Claude. Your code stays on your machine; edits land in your working directory where you review them with ordinary <code>git diff</code>.</p>
<p>That's a different trade than Copilot's: no inline completions, but repo-scale help where most tasks cost nothing and the project never leaves your laptop.</p>`,
      ],
      [
        'switch-plan',
        'A practical switch (or combine) plan',
        `<ol>
<li><strong>Audit a week of Copilot use.</strong> Count completions-driven minutes vs chat requests like "review/explain/test this".</li>
<li><strong>Move the burst tasks</strong> to the free tools — bookmark <a href="/tools/code-review">review</a>, <a href="/tools/explain-code">explain</a> and <a href="/tools/generate-tests">tests</a>; they're each one URL.</li>
<li><strong>Automate what repeats:</strong> wire the <a href="/api-docs">free API</a> into a pre-commit hook so review happens without pasting at all.</li>
<li><strong>Then decide about the subscription.</strong> If completions still earn their keep, keep Copilot for typing and use DoAide Code for checking — they combine well. If chat was most of your usage, you just made it free.</li>
</ol>`,
      ],
    ],
    faqs: [
      [
        'Is there a completely free alternative to GitHub Copilot?',
        'For review, explanation, debugging, conversion, documentation and test generation — yes: DoAide Code does those free with no account at code.doaide.com/tools. For inline autocomplete specifically, free options are limited tiers (Copilot Free, Windsurf/Codeium free plans) or local models in your editor.',
      ],
      [
        'Does DoAide Code have autocomplete like Copilot?',
        'No. DoAide Code checks and transforms code you already have (review, explain, convert, tests) and offers a local repo assistant; it does not suggest code as you type. Many developers pair it with an autocomplete tool.',
      ],
      [
        'Do I need to install anything to use DoAide Code?',
        'No. The tools are URLs that work in any browser — including lab PCs and locked-down work laptops where you cannot install extensions. The optional local assistant installs on your own machine.',
      ],
      [
        'Is DoAide Code free for commercial use?',
        'Yes — the tools and API are free under fair-use rate limits (8 AI requests per 10 minutes) for any use. Don’t paste code you’re not allowed to share; check your employer’s policy for proprietary code, as with any online tool.',
      ],
      [
        'How is this free when Copilot costs $10/month?',
        'Routing. Most review/explain/test tasks don’t need a frontier model, so DoAide Code serves them with cheap or local models and reserves expensive models for hard tasks. Low serving cost is what makes the no-login free tier sustainable.',
      ],
    ],
    cta: ['/tools/code-review', 'Try the free Copilot alternative now'],
  },
  {
    slug: 'how-to-review-code-with-ai',
    title: 'How to Review Code with AI for Free: Step-by-Step Workflows (2026) | DoAide Code',
    h1: 'How to review code with AI for free: workflows that stick',
    description:
      'Step-by-step AI code review workflows for free: reviewing a function before commit, reviewing a pull request, automating review in a git hook, and reading AI findings like a senior engineer.',
    updated: '2026-10-23',
    intro: `<p>Knowing that AI code review exists is one thing; having a workflow where every risky change actually gets reviewed — automatically, for free, without anyone remembering to do it — is another. This is the workflow guide: four concrete routines, from a 30-second manual check to a pre-commit hook that reviews every staged file, all built on the <a href="/tools/code-review">free DoAide Code review tool</a> and its <a href="/api-docs">keyless API</a>.</p>
<p>(For what AI review catches and how it compares to human review, start with the companion guide: <a href="/guides/free-ai-code-review-online">how AI code review works</a>. This one assumes you're sold and want the habit.)</p>`,
    sections: [
      [
        'workflow-1',
        'Workflow 1: the 30-second pre-commit check (manual)',
        `<ol>
<li>You've just finished a function or fixed a bug. Copy the changed function — not the whole file; focused input gets sharper findings.</li>
<li>Open <a href="/tools/code-review">code.doaide.com/tools/code-review</a> (bookmark it; the page remembers recent snippets on your machine).</li>
<li>Paste, press <code>Ctrl/⌘ + Enter</code>.</li>
<li>Triage the findings top-down: <strong>correctness and security first</strong> — fix those before anything else. Performance next if the code is on a hot path. Style last, and feel free to disagree with it.</li>
<li>Fix, re-run. A clean (or consciously-accepted) second pass is your commit signal.</li>
</ol>
<p>That's the whole habit. The trick to making it stick: attach it to a trigger you already have, like writing the commit message — "no commit message before the review verdict".</p>`,
      ],
      [
        'workflow-2',
        'Workflow 2: reviewing a pull request (yours or a teammate’s)',
        `<p>For a PR, review the <em>diff</em>, not the files:</p>
<ol>
<li>Get the changed code: <code>git diff main...feature-branch</code>, or copy the changed functions from the PR's Files view.</li>
<li>Review each substantial changed function separately in the <a href="/tools/code-review">review tool</a> — three focused reviews beat one giant paste.</li>
<li>For a change you don't understand, run <a href="/tools/explain-code">Explain code</a> first, then review — you'll judge the findings better.</li>
<li>Check the diff itself with the <a href="/tools/diff-checker">diff checker</a> for a clean side-by-side when the platform's view is noisy.</li>
<li>If the PR adds logic without tests, paste the new function into <a href="/tools/generate-tests">Generate tests</a> and attach the suite to your review comment. Reviewers who bring tests get listened to.</li>
</ol>
<p>Reviewing your own PR this way before requesting human review is the single best "make reviewers like you" move: your PRs arrive pre-cleaned, and humans spend their attention on design.</p>`,
      ],
      [
        'workflow-3',
        'Workflow 3: automate it — AI review in a git pre-commit hook',
        `<p>The review you don't have to remember is the one that always happens. The same review tool is a <a href="/api-docs">free REST API</a> — one POST, no key — so a git hook can review every staged file:</p>
<pre><code>#!/bin/sh
# .git/hooks/pre-commit — AI-review staged files (advisory, never blocks)
git diff --cached --name-only --diff-filter=ACM | while read -r f; do
  jq -n --arg code "$(git show ":$f")" '{action:"review", code:$code}' \\
  | curl -s https://code.doaide.com/api/public/code-tool \\
      -H 'Content-Type: application/json' -d @- \\
  | jq -r '.answer' | sed "s|^|[$f] |"
done
exit 0</code></pre>
<p>Two design choices worth copying: it's <strong>advisory</strong> (always exits 0 — a busy API should never block your commit), and it reviews <strong>staged files</strong>, not the whole repo, staying well inside the fair-use limits (8 requests per 10 minutes). For CI, the same call works in any pipeline step; treat failures as warnings there too.</p>`,
      ],
      [
        'workflow-4',
        'Workflow 4: reading AI findings like a senior engineer',
        `<p>The skill that multiplies all three workflows is triage. For each finding, ask:</p>
<ul>
<li><strong>Is it real?</strong> Reproduce correctness findings before fixing: write the failing input as a test (the <a href="/tools/find-bugs">bug finder</a> hands you the input). A finding you reproduced is a bug; one you can't is a question.</li>
<li><strong>Is it in scope?</strong> A valid finding about code you didn't touch goes in a ticket, not in this commit. Keep diffs focused.</li>
<li><strong>Is it a pattern?</strong> The third time review flags your missing error handling, the finding isn't about this function — it's about your habits. That's the free mentorship hiding in the tool.</li>
<li><strong>Do you disagree?</strong> Fine — but say why in a comment or commit message. "Reviewed, accepted the O(n²) because n ≤ 20" is engineering; silently ignoring findings is how they stop being read.</li>
</ul>`,
      ],
      [
        'free-stack',
        'The complete free review stack, assembled',
        `<p>Putting it together with the rest of the free layer (full comparison in <a href="/guides/best-free-code-review-tools">best free code review tools</a>):</p>
<ol>
<li><strong>Editor:</strong> linter + formatter on save — catches the mechanical issues before AI ever sees them.</li>
<li><strong>On commit:</strong> the pre-commit hook above, or the 30-second manual check for risky changes.</li>
<li><strong>On PR:</strong> workflow 2 — self-review, tests attached.</li>
<li><strong>In CI:</strong> lint + tests as gates; AI review as an advisory step.</li>
<li><strong>Humans:</strong> design and requirements — the machines did the rest.</li>
</ol>
<p>Total cost: ₹0. Total setup: one bookmark and one shell script.</p>`,
      ],
    ],
    faqs: [
      [
        'How do I review code with AI for free?',
        'Paste the function or file into a free review tool like code.doaide.com/tools/code-review — no account needed — and triage the findings: correctness and security first, then performance, then style. For automatic review, call the free API from a git pre-commit hook.',
      ],
      [
        'Can I automate AI code review on every commit?',
        'Yes. The DoAide Code review tool is also a keyless REST API; a ten-line pre-commit hook reviews every staged file and prints findings before you commit. Keep it advisory (never blocking) and within the fair-use limit of 8 requests per 10 minutes.',
      ],
      [
        'Should I review the whole file or just my changes?',
        'Review the changed functions plus just enough surrounding code for context. Focused input produces sharper findings, uses fewer requests, and keeps your fixes inside the scope of the commit.',
      ],
      [
        'What should I do when the AI review is wrong?',
        'Treat findings as claims, not verdicts: reproduce correctness findings before fixing, and when you disagree, record why. AI review is a rigorous first pass — the judgment stays yours.',
      ],
      [
        'Can AI review a whole pull request at once?',
        'The free paste-in tool reviews what you paste, so review a PR as its changed functions, one at a time. For changes spanning a whole repository, DoAide Code’s local assistant works on your clone directly.',
      ],
    ],
    cta: ['/tools/code-review', 'Review your code free — no sign-up'],
  },
  {
    slug: 'how-to-write-clean-code-2026',
    title: 'How to Write Clean Code in 2026: Practical Rules That Survive AI | DoAide Code',
    h1: 'How to write clean code in 2026',
    description:
      'Clean code rules that still matter when AI writes half of it: naming, small functions, low complexity, honest error handling, and how to use AI review, complexity metrics and formatters to keep a codebase readable.',
    updated: '2026-10-23',
    intro: `<p>In 2026 a lot of code is first drafted by an AI assistant - and that has made clean code more important, not less. Generated code compiles and often works, but it lands in your repository at the speed you can prompt, and whoever maintains it (you, in three months) pays for every unclear name and tangled function. Clean code is what keeps a fast-growing codebase understandable.</p>
<p>This guide is a practical set of rules - what to name things, how small to cut functions, how much complexity to tolerate, what to do with errors and comments - plus the free tools that enforce each rule in seconds: the <a href="/tools/code-complexity">complexity analyzer</a>, <a href="/tools/code-formatter">formatter</a> and <a href="/tools/code-review">AI code review</a>.</p>`,
    sections: [
      [
        'naming',
        'Names carry the design',
        `<p>A reader meets your names a hundred times before they read any logic. The rules that pay off:</p>
<ul>
<li><strong>Say what it is, not how it is stored:</strong> <code>activeUsers</code>, not <code>userArr</code>; <code>retryDelayMs</code>, not <code>num2</code>.</li>
<li><strong>Put units and qualifiers in the name:</strong> <code>timeoutMs</code>, <code>priceInr</code>, <code>maxRetries</code>. Half of all production surprises are a unit mismatch.</li>
<li><strong>Verbs for functions, nouns for values:</strong> <code>sendInvoice(invoice)</code> reads like a sentence. A function named <code>invoice()</code> makes every call site ambiguous.</li>
<li><strong>One vocabulary per concept:</strong> pick <code>fetch</code>, <code>get</code> or <code>load</code> - and then use the same one everywhere for the same kind of operation.</li>
</ul>
<p>Renaming is the cheapest refactor there is. If you inherit cryptic code, paste it into <a href="/tools/explain-code">Explain code</a> first, then rename while the understanding is fresh.</p>`,
      ],
      [
        'functions',
        'Small functions, one job each',
        `<p>A function should do the thing its name says, completely, and nothing else. The practical thresholds most teams converge on:</p>
<ul>
<li><strong>Length:</strong> most functions under ~25 lines; past 50, split it.</li>
<li><strong>Cyclomatic complexity:</strong> 1-5 is easy to test, 6-10 deserves a look, above 10 is a refactor candidate. Measure it in seconds with the <a href="/tools/code-complexity">free complexity analyzer</a> - it scores every function and flags the risky ones first.</li>
<li><strong>Parameters:</strong> three is comfortable; past four, pass an options object or split the function.</li>
<li><strong>Nesting:</strong> two levels read fine; four levels means invert conditions and return early.</li>
</ul>
<p>Early returns are the single easiest win: handle the error cases at the top and let the happy path flow unindented to the end.</p>`,
      ],
      [
        'comments',
        'Comments explain why, code explains what',
        `<p>The 2026 consensus hasn't changed: a comment that restates the code (<code>// increment i</code>) is noise, and noise trains readers to skip all comments, including the one that matters. Comment the things code cannot say:</p>
<ul>
<li>Why this approach and not the obvious one (<em>"binary search is wrong here because the list is almost always under 10 items"</em>).</li>
<li>Invariants and units the type system doesn't capture.</li>
<li>Links to the issue, spec or incident that forced an odd decision.</li>
</ul>
<p>Public APIs deserve real documentation comments - JSDoc, docstrings, Javadoc - with parameters, return values and one example. The <a href="/tools/generate-docs">documentation generator</a> drafts those in your language's idiomatic style; our <a href="/guides/code-documentation-best-practices">documentation guide</a> goes deeper.</p>`,
      ],
      [
        'errors',
        'Handle errors honestly',
        `<p>Clean error handling is mostly about not lying to the caller:</p>
<ul>
<li><strong>Never swallow:</strong> an empty <code>catch</code> turns a crash into a mystery. Log it, rethrow it, or handle it - visibly.</li>
<li><strong>Fail at the edge:</strong> validate inputs where they enter the system and keep the core free of defensive clutter.</li>
<li><strong>Error messages are UI:</strong> include what failed, with which input, and what the caller can do about it.</li>
<li><strong>Make the unhappy path testable:</strong> if simulating a failure is hard, the design is wrong. The <a href="/tools/generate-tests">test generator</a> writes the error-path cases people skip.</li>
</ul>`,
      ],
      [
        'consistency',
        'Consistency beats personal style',
        `<p>A codebase written ten slightly different ways is harder to read than one written in a single mediocre style. Automate it: a formatter in the pre-commit hook ends every style debate, and the <a href="/tools/code-formatter">free formatter</a> cleans a pasted snippet when you don't have the project set up. The same goes for structure - same folder layout per feature, same test naming, same import order. Readers should be able to predict where things are.</p>`,
      ],
      [
        'ai-era',
        'Clean code when AI writes the first draft',
        `<p>AI assistants changed the bottleneck: generating code is instant, so review is where quality is decided. A workflow that holds up:</p>
<ol>
<li><strong>Prompt small:</strong> ask for one function or one change, not a whole feature - small diffs are reviewable.</li>
<li><strong>Review everything generated</strong> the way you'd review a new teammate's PR. A <a href="/tools/code-review">second AI's review</a> is surprisingly effective at catching the first AI's shortcuts - missing edge cases, quadratic loops, invented APIs.</li>
<li><strong>Measure before merging:</strong> run generated code through the <a href="/tools/code-complexity">complexity analyzer</a>; AI happily writes a complexity-15 function if you let it.</li>
<li><strong>Keep ownership:</strong> if you can't explain a generated line, have <a href="/tools/explain-code">Explain code</a> walk you through it - or delete it.</li>
</ol>`,
      ],
    ],
    faqs: [
      [
        'What is clean code, in one sentence?',
        'Code a competent stranger can read once and change safely: clear names, small single-purpose functions, low complexity, honest errors, consistent style.',
      ],
      [
        'What cyclomatic complexity should a function have?',
        'Keep most functions at 5 or below; look hard at 6-10; refactor above 10. You can measure any snippet free at code.doaide.com/tools/code-complexity.',
      ],
      [
        'Does clean code still matter when AI writes the code?',
        'More than before: AI multiplies the volume of code entering a repository, and unreadable generated code becomes unmaintainable at the same speed. Review, complexity limits and consistent style are the controls.',
      ],
      [
        'Is there a free tool to check my code quality?',
        'Yes - the free AI code review at code.doaide.com/tools/code-review flags correctness, security, performance and readability problems with fixes, and the complexity analyzer scores every function, both without sign-up.',
      ],
    ],
    cta: ['/tools/code-complexity', 'Measure your code complexity free'],
  },
  {
    slug: 'code-documentation-best-practices',
    title: 'Code Documentation Best Practices: JSDoc, Docstrings & READMEs (2026) | DoAide Code',
    h1: 'Best practices for code documentation',
    description:
      'How to document code people actually read: what to document (and what not to), JSDoc and Python docstring conventions with examples, README structure, keeping docs honest in review, and generating first drafts with AI.',
    updated: '2026-10-23',
    intro: `<p>Nobody reads documentation for fun, so every line has to earn its place. Good code documentation answers the questions a reader has at the moment they have them: What does this function expect? What do I get back? What happens on failure? Why is this designed this way?</p>
<p>This guide covers the conventions that work - JSDoc for JavaScript/TypeScript, docstrings for Python, READMEs for repositories - what to skip, and how to keep documentation true as code changes. You can draft documentation for any snippet in seconds with the <a href="/tools/generate-docs">free documentation generator</a>.</p>`,
    sections: [
      [
        'what-to-document',
        'Document the contract, not the implementation',
        `<p>The highest-value documentation describes the <em>contract</em>: what a caller may rely on. For every public function, class or endpoint, that means:</p>
<ul>
<li><strong>Purpose</strong> - one sentence, in terms of the caller's problem.</li>
<li><strong>Parameters</strong> - types, units, valid ranges, defaults.</li>
<li><strong>Return value</strong> - shape and meaning, including the empty/none case.</li>
<li><strong>Failures</strong> - which errors it throws or returns, and when.</li>
<li><strong>One example</strong> - a realistic call with its result; examples are read ten times more than prose.</li>
</ul>
<p>Implementation details belong in code comments only when the why is non-obvious - see the <a href="/guides/how-to-write-clean-code-2026">clean code guide</a> on comments.</p>`,
      ],
      [
        'jsdoc',
        'JSDoc that pulls its weight',
        `<p>For JavaScript and TypeScript, JSDoc feeds editors, type checkers and doc sites at once:</p>
<pre><code>/**
 * Splits an amount into equal shares, assigning the rounding
 * remainder to the first share so the total is always exact.
 *
 * @param {number} amountPaise - Total in paise (not rupees).
 * @param {number} ways - Number of shares, &gt;= 1.
 * @returns {number[]} Shares in paise, summing to amountPaise.
 * @throws {RangeError} If ways &lt; 1 or amountPaise &lt; 0.
 * @example
 * splitAmount(1001, 3) // [335, 333, 333]
 */</code></pre>
<p>Notes that make JSDoc useful rather than ceremonial: document units in the parameter description, document the rounding/edge behavior (that is what people come looking for), and in TypeScript skip type annotations JSDoc would duplicate - keep the prose.</p>`,
      ],
      [
        'docstrings',
        'Python docstrings: pick a style and stay with it',
        `<p>PEP 257 sets the frame; Google style is the most readable of the common formats:</p>
<pre><code>def split_amount(amount_paise: int, ways: int) -&gt; list[int]:
    """Split an amount into equal shares with an exact total.

    The rounding remainder goes to the first share, so
    sum(result) == amount_paise always holds.

    Args:
        amount_paise: Total in paise (not rupees).
        ways: Number of shares, at least 1.

    Returns:
        Shares in paise, largest first.

    Raises:
        ValueError: If ways &lt; 1 or amount_paise &lt; 0.
    """</code></pre>
<p>The first line is a complete sentence that fits on one line - tools like <code>help()</code>, IDE hovers and documentation generators show it alone. Type hints belong in the signature, not repeated in prose.</p>`,
      ],
      [
        'readme',
        'The README is the front door',
        `<p>A repository README answers four questions in order: <strong>what is this</strong> (two sentences), <strong>how do I run it</strong> (copy-pasteable commands that actually work), <strong>how do I use it</strong> (one real example), and <strong>where do I go deeper</strong> (links). Everything else - architecture notes, decision records, contribution rules - links out rather than piling in. Draft and preview yours in the <a href="/tools/markdown-editor">free Markdown editor</a>, which renders code blocks with syntax highlighting as you type.</p>`,
      ],
      [
        'honest-docs',
        'Keep documentation honest',
        `<p>Wrong documentation is worse than none - readers trust it over the code and ship the bug. What keeps docs true:</p>
<ul>
<li><strong>Docs change in the same commit as behavior.</strong> A diff that changes a default without touching the docstring is an incomplete diff - reviewers should block it.</li>
<li><strong>Examples are tests:</strong> Python doctests and example-based unit tests fail when the documented behavior drifts. The <a href="/tools/generate-tests">test generator</a> happily turns an @example into cases.</li>
<li><strong>Date your prose docs</strong> ("Updated 2026-10") so readers can calibrate trust.</li>
<li><strong>Delete dead docs:</strong> a paragraph about a removed flag costs every future reader a detour.</li>
</ul>`,
      ],
      [
        'ai-drafts',
        'Let AI write the first draft, you write the truth',
        `<p>Documentation has a blank-page problem, and AI solves exactly that part. Paste a function into the <a href="/tools/generate-docs">documentation generator</a> and you get idiomatic JSDoc or docstrings - summary, parameters, returns, raises, example - in seconds. Then do the human pass: correct the intent ("why" is yours, the AI only sees "what"), check the edge cases it inferred, and cut anything that merely restates the signature. Ten minutes of editing a complete draft beats an hour facing an empty comment block - and the result is documentation that actually exists.</p>`,
      ],
    ],
    faqs: [
      [
        'What should code documentation include?',
        "The contract: purpose in one sentence, parameters with types and units, return value including the empty case, errors thrown, and one realistic example. Skip anything that restates the code.",
      ],
      [
        'JSDoc or TypeScript types - do I need both?',
        'In TypeScript, let the type system carry types and use JSDoc for what types cannot say: units, valid ranges, edge-case behavior, and examples. In plain JavaScript, JSDoc carries both.',
      ],
      [
        'Which Python docstring format is best?',
        'Any of Google, NumPy or Sphinx style works - consistency matters more than the pick. Google style is the most readable in plain text and is what most new projects choose.',
      ],
      [
        'Can AI generate code documentation?',
        'Yes - paste code into the free generator at code.doaide.com/tools/generate-docs and get JSDoc, docstrings, Javadoc or godoc comments with parameters, returns and examples. Review the draft: AI documents what the code does, you confirm what it is for.',
      ],
    ],
    cta: ['/tools/generate-docs', 'Generate documentation free with AI'],
  },
  {
    slug: 'best-free-online-code-formatter',
    title: 'Best Free Online Code Formatter 2026: JavaScript, JSON, CSS, HTML, Python | DoAide Code',
    h1: 'The best free online code formatter in 2026',
    description:
      'What makes a good online code formatter in 2026, how to beautify JavaScript, JSON, CSS, HTML and Python in your browser without uploading anything, and when a web formatter beats installing Prettier.',
    updated: '2026-10-23',
    intro: `<p>Messy code costs you twice: once when a reviewer squints at it, and again three months later when you do. A code formatter fixes that in one paste — consistent indentation, one statement per line, nesting you can actually see. But many "free online formatters" in 2026 are ad farms that upload your code to a server you know nothing about, or thin wrappers that choke on anything beyond JSON.</p>
<p>This guide covers what actually matters when you pick an online code formatter, how formatting differs across languages, and when a browser tool beats installing Prettier or Black locally. Everything here can be tried in the <a href="/tools/code-formatter">free online code formatter</a> — it runs entirely in your browser, uploads nothing, and needs no sign-up.</p>`,
    sections: [
      [
        'what-matters',
        'What makes a code formatter worth using in 2026',
        `<p>Four things separate a formatter you can trust from the rest:</p>
<ul>
<li><strong>It must not break your code.</strong> Strings, template literals and comments have to pass through byte-for-byte untouched. A formatter that re-wraps the SQL inside your string or "fixes" a URL in a comment is worse than no formatter.</li>
<li><strong>It should run in your browser, not on a server.</strong> Code often contains table names, internal endpoints or half-written secrets. A formatter that computes everything client-side — like the <a href="/tools/code-formatter">DoAide Code formatter</a> — means your paste never leaves your machine.</li>
<li><strong>It should know the language's rules.</strong> JSON can be parsed and re-printed exactly. JavaScript and CSS can be re-indented token by token. Python is different: its whitespace <em>is</em> the program, so a safe formatter only does clean-ups (trailing whitespace, blank-line runs, tabs-to-spaces) rather than guessing new indentation and silently changing behaviour.</li>
<li><strong>No sign-up, no file-size games.</strong> If a tool asks for an account before beautifying 40 lines of CSS, close the tab.</li>
</ul>`,
      ],
      [
        'by-language',
        'Formatting JavaScript, JSON, CSS, HTML and Python',
        `<p>Each language needs a different approach, and a good tool is honest about that:</p>
<ul>
<li><strong>JSON</strong> is the easy case: parse it, then print it back with clean indentation. Invalid JSON should produce a clear error, not a mangled guess — for error line numbers and a collapsible tree view, use the dedicated <a href="/tools/json-formatter">JSON formatter and validator</a>.</li>
<li><strong>JavaScript</strong> formatting is token-aware re-indentation: braces and semicolons get their newlines, every line is indented by nesting depth, and strings, template literals and comments are skipped entirely.</li>
<li><strong>CSS</strong> follows the same idea — one declaration per line, selectors and closing braces aligned, nested rules indented a step.</li>
<li><strong>HTML</strong> is re-nested tag by tag, so a wall of markup becomes a readable tree.</li>
<li><strong>Python</strong> gets conservative clean-ups only. Changing Python indentation changes meaning, so anything beyond normalising tabs and trimming whitespace belongs to a full parser like Black on your machine.</li>
</ul>
<p>SQL deserves its own mention: clause-per-line layout and uppercased keywords need a SQL-aware engine, which is why there is a separate <a href="/tools/sql-formatter">SQL formatter and validator</a>.</p>`,
      ],
      [
        'online-vs-local',
        'Online formatter vs Prettier, Black and editor plugins',
        `<p>If you own the project, install the real thing: Prettier for JavaScript and CSS, Black or Ruff for Python, with a pre-commit hook so nobody argues about style again. Local formatters are configurable, deterministic and CI-enforceable.</p>
<p>An online formatter wins in every situation where that setup does not exist:</p>
<ul>
<li>Code from a Stack Overflow answer, a PDF, a lecture slide or a WhatsApp message that arrived as one long line.</li>
<li>A machine that is not yours — a college lab, a client's laptop, a locked-down office desktop where you cannot <code>npm install</code> anything.</li>
<li>A quick look at minified or copy-pasted vendor code you just need to read, not adopt.</li>
<li>Snippets for a blog post, documentation or an assignment submission that should look professional.</li>
</ul>
<p>The two are complements: Prettier for the repo, a browser formatter for everything that never touches the repo.</p>`,
      ],
      [
        'workflow',
        'A 30-second clean-up workflow',
        `<ol>
<li>Open the <a href="/tools/code-formatter">free code formatter</a> and paste your code.</li>
<li>Pick the language — JavaScript, JSON, CSS, HTML or Python.</li>
<li>Format, skim the result (strings and comments should be exactly as you wrote them), and copy it back.</li>
<li>Cleaning up before a review? Run the before/after through the <a href="/tools/diff-checker">diff checker</a> to confirm only whitespace changed.</li>
<li>Sharing the result? The <a href="/tools/share-code">code snippet sharing tool</a> turns it into a short, syntax-highlighted link.</li>
</ol>
<p>If the formatted code still reads badly — deep nesting, functions doing three jobs — formatting is not the fix. Run it through the <a href="/tools/code-review">free AI code review</a> to find out what to restructure.</p>`,
      ],
      [
        'mistakes',
        'Mistakes people make with code formatters',
        `<ul>
<li><strong>Formatting a whole file to change one line.</strong> In a shared repo this buries your real change in whitespace noise and makes the reviewer's job harder. Format whole files only in dedicated clean-up commits.</li>
<li><strong>Pasting secrets.</strong> Strip API keys and passwords before pasting code into any online tool — even one that runs client-side, out of habit.</li>
<li><strong>Trusting a formatter to fix broken code.</strong> A formatter makes valid code readable; it does not repair syntax errors. If the output looks wrong, the input probably doesn't parse.</li>
<li><strong>Letting a tool reformat Python aggressively.</strong> If an online tool re-indents your Python, test it before committing — indentation is semantics there.</li>
</ul>`,
      ],
    ],
    faqs: [
      [
        'What is the best free online code formatter in 2026?',
        'The best free option is one that runs entirely in your browser, uploads nothing, needs no sign-up, and never rewrites strings or comments. The DoAide Code formatter at code.doaide.com/tools/code-formatter beautifies JavaScript, JSON, CSS, HTML and Python client-side for free.',
      ],
      [
        'Is it safe to format code online?',
        'It depends on the tool. Server-based formatters receive your code; client-side formatters never send it anywhere. The DoAide Code formatter computes everything in the page — your code stays on your machine. Either way, strip secrets like API keys before pasting code into any website.',
      ],
      [
        'Which languages can I format online for free?',
        'JavaScript, JSON, CSS, HTML and Python are supported in the free formatter, each with language-appropriate rules. SQL has its own dedicated formatter and validator, and Markdown has a live editor with preview.',
      ],
      [
        'Why does the formatter only do light clean-ups on Python?',
        'Because Python indentation changes program behaviour. Re-guessing indentation could silently alter your logic, so the safe clean-ups are normalising tabs to spaces, trimming trailing whitespace and collapsing blank-line runs. For full Python reformatting, use Black or Ruff locally where you can run the tests.',
      ],
      [
        'Do I still need Prettier if I use an online formatter?',
        'For your own projects, yes — Prettier (or Black for Python) in a pre-commit hook keeps a whole team consistent automatically. An online formatter covers everything else: code from chats and PDFs, machines where you cannot install tools, and one-off snippets.',
      ],
    ],
    cta: ['/tools/code-formatter', 'Format your code free — no sign-up'],
  },
  {
    slug: 'online-regex-tester-and-builder',
    title: 'Online Regex Tester and Builder: Test Regular Expressions Free (2026) | DoAide Code',
    h1: 'Online regex tester and builder: write regular expressions that actually work',
    description:
      'How to build a regular expression step by step and test it live in your browser: flags, capture groups, common patterns (email, mobile numbers, PIN codes, GSTIN) and the mistakes that make a regex fail in production.',
    updated: '2026-10-23',
    intro: `<p>Nobody writes a correct regular expression on the first try — not juniors, not staff engineers. The difference is that experienced developers never trust a regex they haven't watched run against real input. That is the whole job of an online regex tester: type the pattern, type the text, and see every match and capture group highlighted as you type.</p>
<p>This guide shows how to build a regex incrementally instead of guessing, what each flag actually does, and the handful of patterns — emails, mobile numbers, PIN codes, GSTIN — that cover most day-to-day validation. Follow along in the <a href="/tools/regex-tester">free online regex tester</a>: it runs entirely in your browser, nothing is uploaded, and there is no sign-up.</p>`,
    sections: [
      [
        'how-it-works',
        'How an online regex tester works',
        `<p>A regex tester is a tight feedback loop. You give it two things — a pattern and a test string — and it gives you back three:</p>
<ul>
<li><strong>Every match, highlighted in place</strong>, so you see at a glance what the pattern grabbed and, just as importantly, what it missed.</li>
<li><strong>Capture groups per match</strong> — both numbered groups like <code>(\\d{4})</code> and named ones like <code>(?&lt;year&gt;\\d{4})</code> — which is what you'll actually extract in code.</li>
<li><strong>Clear errors for bad patterns</strong>, like an unclosed bracket or a stray quantifier, instead of a silent zero-matches.</li>
</ul>
<p>The <a href="/tools/regex-tester">DoAide Code regex tester</a> uses the JavaScript regex engine, re-running on every keystroke. Since everything is computed in the page, you can safely paste real log lines or data samples — they never leave your machine.</p>`,
      ],
      [
        'builder',
        'Building a regex step by step (the builder mindset)',
        `<p>The reliable way to write a regex is to grow it one piece at a time with the tester open. Say you need to pull dates like <code>23/10/2026</code> out of messy text:</p>
<ol>
<li><strong>Start with the literal core:</strong> <code>/</code> matches itself, so begin with <code>\\d/\\d</code> and confirm it highlights something.</li>
<li><strong>Add quantifiers:</strong> <code>\\d{2}/\\d{2}/\\d{4}</code> — two digits, two digits, four digits. Check it against a real sample.</li>
<li><strong>Add capture groups</strong> for the parts you need: <code>(\\d{2})/(\\d{2})/(\\d{4})</code>, or named groups <code>(?&lt;day&gt;\\d{2})/(?&lt;month&gt;\\d{2})/(?&lt;year&gt;\\d{4})</code> so your code reads <code>match.groups.year</code> instead of <code>match[3]</code>.</li>
<li><strong>Test the negatives:</strong> paste text that should <em>not</em> match — <code>123/45/678901</code>, a phone number, an IP address — and tighten with boundaries: <code>\\b(\\d{2})/(\\d{2})/(\\d{4})\\b</code>.</li>
<li><strong>Only then</strong> copy it into your code, flags included.</li>
</ol>
<p>Each step is a five-second check in the tester. Skipping those checks is how a regex that "looked right" ends up matching half your log file.</p>`,
      ],
      [
        'patterns',
        'Common patterns: email, mobile numbers, PIN codes, GSTIN',
        `<p>A starter set worth keeping (test each against your own data before shipping):</p>
<table>
<tr><th>What</th><th>Pattern</th><th>Notes</th></tr>
<tr><td>Email (pragmatic)</td><td><code>[\\w.+-]+@[\\w-]+\\.[\\w.]{2,}</code></td><td>Catches real addresses; full RFC-compliant email regexes are a trap — validate by sending a mail.</td></tr>
<tr><td>Indian mobile number</td><td><code>\\b[6-9]\\d{9}\\b</code></td><td>Ten digits starting 6–9; add <code>(?:\\+91[ -]?)?</code> in front to allow a +91 prefix.</td></tr>
<tr><td>PIN code</td><td><code>\\b[1-9]\\d{5}\\b</code></td><td>Six digits, no leading zero.</td></tr>
<tr><td>GSTIN</td><td><code>\\b\\d{2}[A-Z]{5}\\d{4}[A-Z]\\d[A-Z]\\d\\b</code></td><td>State code + PAN + entity, Z is literal in position 14 for most registrations — this shape-check catches typos, not validity.</td></tr>
<tr><td>ISO date</td><td><code>\\b\\d{4}-\\d{2}-\\d{2}\\b</code></td><td>Shape only; 2026-13-45 still matches. Parse to validate.</td></tr>
<tr><td>Number with decimals</td><td><code>-?\\d+(?:\\.\\d+)?</code></td><td><code>(?: )</code> groups without capturing.</td></tr>
</table>
<p>Paste any of these into the <a href="/tools/regex-tester">regex tester</a> with a page of your real data and watch what over- and under-matches before trusting it.</p>`,
      ],
      [
        'flags',
        'Flags: what g, i, m and s actually change',
        `<ul>
<li><strong>g (global):</strong> find every match, not just the first. Almost always what you want in a tester; in code, required for <code>matchAll</code> and replace-all.</li>
<li><strong>i (ignore case):</strong> <code>error</code> also matches <code>Error</code> and <code>ERROR</code> — the flag to reach for when scanning logs.</li>
<li><strong>m (multiline):</strong> <code>^</code> and <code>$</code> anchor to each line instead of the whole string. Essential when testing against multi-line pastes.</li>
<li><strong>s (dotall):</strong> <code>.</code> also matches newlines, so <code>start.*end</code> can span lines.</li>
</ul>
<p>A classic confusion: with multiline text and no <code>m</code>, <code>^\\w+</code> matches only the very first word of the paste. Toggle flags in the tester and watch the highlights move — it teaches the difference faster than any cheat sheet.</p>`,
      ],
      [
        'mistakes',
        'The regex mistakes that bite in production',
        `<ul>
<li><strong>Greedy wildcards:</strong> <code>".*"</code> grabs from the first quote to the <em>last</em> quote on the line. Use the lazy form <code>".*?"</code> or, better, <code>"[^"]*"</code>.</li>
<li><strong>Unescaped special characters:</strong> <code>.</code>, <code>+</code>, <code>(</code>, <code>[</code> and friends mean something. Matching a literal dot in <code>app.doaide.com</code> needs <code>\\.</code> — otherwise <code>appXdoaide</code> matches too.</li>
<li><strong>Missing anchors in validation:</strong> <code>\\d{6}</code> happily finds six digits <em>inside</em> a 16-digit number. Validation patterns should be anchored: <code>^\\d{6}$</code>.</li>
<li><strong>Catastrophic backtracking:</strong> nested quantifiers like <code>(a+)+$</code> can take seconds on a 40-character non-matching input — a real denial-of-service vector if user input hits that regex on your server.</li>
<li><strong>Using regex where a parser belongs:</strong> HTML, JSON and SQL are not regular languages. Extract a quick value, fine; parse structure, use a parser — or the <a href="/tools/json-formatter">JSON validator</a> for JSON.</li>
</ul>
<p>If a hairy regex in a codebase resists understanding, paste the surrounding function into <a href="/tools/explain-code">Explain Code</a> and get the pattern translated into English, piece by piece.</p>`,
      ],
    ],
    faqs: [
      [
        'What is the best free online regex tester?',
        'A good regex tester highlights every match and capture group live as you type, explains pattern errors, supports the g/i/m/s flags, and runs in your browser so your test data is never uploaded. The DoAide Code regex tester at code.doaide.com/tools/regex-tester does all of this free, with no sign-up.',
      ],
      [
        'Which regex engine does an online tester use?',
        "The DoAide Code tester runs your pattern on the browser's own JavaScript (ECMAScript) engine. JavaScript regex covers the common syntax shared with Python and Java; a few advanced features differ (for example Python's re.VERBOSE or possessive quantifiers), so always re-test in your target language for exotic patterns.",
      ],
      [
        'How do I test a regex with capture groups?',
        'Wrap the parts you want to extract in parentheses, or use named groups like (?<year>\\d{4}). The tester lists each match with its numbered and named groups, so you can confirm exactly what match.groups.year will contain in your code.',
      ],
      [
        'Why does my regex match too much?',
        'Usually a greedy quantifier: .* expands to the longest possible match. Make it lazy with .*? or replace the dot with a negated class like [^"]* that cannot cross the closing delimiter. Testing against realistic multi-line input in a tester shows the over-match immediately.',
      ],
      [
        'Is it safe to paste real data into an online regex tester?',
        'In the DoAide Code tester, yes in the technical sense: matching runs entirely in the page and nothing is sent to a server. Still, mask customer personal data out of habit before pasting it anywhere — a few X characters rarely change whether the pattern works.',
      ],
    ],
    cta: ['/tools/regex-tester', 'Test your regex free — live highlighting'],
  },
  {
    slug: 'free-online-sql-formatter-validator',
    title: 'Free Online SQL Formatter and Validator: Beautify SQL Queries (2026) | DoAide Code',
    h1: 'Free online SQL formatter and validator',
    description:
      'Format SQL queries online — one clause per line, keywords uppercased, subqueries indented — and catch unbalanced parentheses, unterminated strings and dangerous missing WHERE clauses before they reach your database. Free, in-browser, no sign-up.',
    updated: '2026-10-23',
    intro: `<p>SQL arrives messy. It gets copied out of ORMs and log files as one endless line, assembled in application code with the formatting of a ransom note, and pasted into chats where every line break dies. Reading a 400-character single-line query to find the one wrong JOIN is miserable — and running an <code>UPDATE</code> that turned out to be missing its <code>WHERE</code> clause is a career memory.</p>
<p>A SQL formatter fixes the first problem; a validator catches the second before your database does. This guide covers how both work and how to fold them into the two minutes before you run, review or share a query. Everything here can be tried in the <a href="/tools/sql-formatter">free online SQL formatter and validator</a> — it runs in your browser, uploads nothing, and needs no sign-up.</p>`,
    sections: [
      [
        'what-formatting-does',
        'What a good SQL formatter does to your query',
        `<p>Readable SQL follows a layout experienced engineers converge on everywhere:</p>
<ul>
<li><strong>One clause per line:</strong> <code>SELECT</code>, <code>FROM</code>, each <code>JOIN</code>, <code>WHERE</code>, <code>GROUP BY</code>, <code>ORDER BY</code> and <code>LIMIT</code> each start their own line, so the shape of the query is visible before you read a word of it.</li>
<li><strong>Keywords uppercased:</strong> <code>select id from users</code> becomes <code>SELECT id FROM users</code> — keywords and identifiers stop blurring together.</li>
<li><strong>Conditions as continuations:</strong> <code>AND</code>, <code>OR</code> and <code>ON</code> lines indent one step under their clause, so a five-condition <code>WHERE</code> reads like a checklist.</li>
<li><strong>Subqueries indented by depth:</strong> a nested <code>SELECT</code> sits visibly inside its parentheses instead of hiding mid-line.</li>
<li><strong>Strings and comments untouched:</strong> anything inside quotes — names, patterns for <code>LIKE</code>, JSON payloads — and every comment passes through byte-for-byte. A formatter that uppercases words inside your string literals is corrupting data.</li>
</ul>
<p>Paste any query into the <a href="/tools/sql-formatter">SQL formatter</a> and compare: the before and after run identically, but only one of them can be reviewed.</p>`,
      ],
      [
        'what-validation-catches',
        'What the validator catches before your database does',
        `<p>The validator is not a full SQL parser — it is a fast sanity check for the mistakes people actually paste:</p>
<ul>
<li><strong>Unbalanced parentheses:</strong> the classic result of editing a subquery by hand. The database error ("syntax error at or near...") points somewhere unhelpful; the validator just tells you the brackets don't close.</li>
<li><strong>Unterminated strings:</strong> a lost closing quote swallows the rest of the query — easy to cause, hard to spot in a wall of text.</li>
<li><strong>Trailing commas:</strong> the leftover comma after deleting the last column in a <code>SELECT</code> list or <code>INSERT</code>.</li>
<li><strong>UPDATE or DELETE without a WHERE clause:</strong> the big one. Sometimes you really do mean every row — but you want that to be a decision, not a surprise. A warning here has saved more production data than most backup strategies.</li>
</ul>
<p>Shape-checking is not semantic checking: the validator cannot know your schema, so a typo in a column name still only surfaces at the database. For that class of problem, paste the query into the <a href="/tools/code-review">free AI code review</a>, which also flags injection-prone string concatenation and N+1 patterns in the surrounding code.</p>`,
      ],
      [
        'when-to-format',
        'When to format: the three moments that matter',
        `<ol>
<li><strong>Before you run it.</strong> Formatting a query is how you re-read it. The missing <code>WHERE</code>, the <code>LEFT JOIN</code> that should be <code>INNER</code>, the <code>OR</code> that needed parentheses — all of these are visible in clause-per-line layout and invisible on one line.</li>
<li><strong>Before you review or commit it.</strong> SQL embedded in a pull request gets reviewed like code, and reviewers skim what they cannot read. Migrations, report queries and anything in a <code>.sql</code> file deserve the same formatting discipline as the application code around them.</li>
<li><strong>Before you share it.</strong> A query pasted into Slack or WhatsApp as one line is a puzzle, not a question. Format it, then send it as a short link with the <a href="/tools/share-code">code snippet sharing tool</a> — syntax highlighted, up to 20,000 characters, no account needed on either end.</li>
</ol>`,
      ],
      [
        'conventions',
        'SQL style choices worth standardising',
        `<p>Formatters settle the mechanical layout; a few choices remain yours. Pick once per team and stop debating:</p>
<table>
<tr><th>Choice</th><th>Common pick</th><th>Why</th></tr>
<tr><td>Keyword case</td><td>UPPERCASE</td><td>Keywords jump out in editors without SQL highlighting — chat, diffs, logs.</td></tr>
<tr><td>Identifier case</td><td>snake_case, lowercase</td><td>Avoids quoted-identifier pain across PostgreSQL and MySQL.</td></tr>
<tr><td>SELECT * in application code</td><td>Avoid</td><td>Explicit columns survive schema changes and document intent.</td></tr>
<tr><td>JOIN style</td><td>Explicit <code>JOIN ... ON</code></td><td>Comma joins with WHERE-clause conditions hide the relationship and invite accidental cross joins.</td></tr>
<tr><td>Aliases</td><td>Short but meaningful (<code>u</code>, <code>ord</code>)</td><td>Single letters scale badly past two tables.</td></tr>
</table>
<p>If a query resists formatting — six subqueries deep, conditions nobody can explain — the problem is the query. The <a href="/tools/explain-code">Explain Code tool</a> turns inherited SQL into plain English, and <a href="/tools/optimize-code">Optimize Code</a> suggests rewrites (CTEs, window functions, pushed-down filters) that are usually faster <em>and</em> more readable.</p>`,
      ],
      [
        'privacy',
        'Why in-browser formatting matters for SQL in particular',
        `<p>Queries leak more than code does: table names, column names, internal report logic, sometimes literal customer values in <code>WHERE</code> clauses. Sending that to a random "free SQL beautifier" backend is a quiet data-handling decision nobody signed off on.</p>
<p>The <a href="/tools/sql-formatter">DoAide Code SQL formatter</a> formats and validates entirely in the page — up to 50,000 characters, nothing leaves your machine. The habit still applies everywhere: replace literal personal values with placeholders before pasting a query into any tool, including your team chat.</p>`,
      ],
    ],
    faqs: [
      [
        'What is the best free online SQL formatter?',
        'One that puts each clause on its own line, uppercases keywords, indents subqueries, leaves strings and comments untouched, and runs in your browser so your query is never uploaded. The DoAide Code SQL formatter at code.doaide.com/tools/sql-formatter does this free, with validation included and no sign-up.',
      ],
      [
        'Does formatting change what the SQL query does?',
        'No. Formatting only changes whitespace, line breaks and keyword casing — identifiers, strings and comments pass through untouched, and SQL keywords are case-insensitive in every major database. The formatted query executes identically to the original.',
      ],
      [
        'Can an online tool validate my SQL query?',
        'It can catch structural mistakes: unbalanced parentheses, unterminated strings, trailing commas and UPDATE/DELETE statements missing a WHERE clause. It cannot know your schema, so wrong table or column names only surface when the database runs the query.',
      ],
      [
        'Which SQL dialects does the formatter support?',
        'The layout rules — clause per line, uppercased keywords, indented subqueries — are dialect-neutral and work for PostgreSQL, MySQL, SQL Server, Oracle and SQLite queries alike. Dialect-specific syntax inside the query passes through unchanged.',
      ],
      [
        'Is it safe to paste production SQL into an online formatter?',
        'In the DoAide Code formatter the processing is client-side, so the query never leaves your browser. Even so, strip literal customer data from WHERE clauses out of habit before pasting a query into any tool — the formatting result is the same with placeholders.',
      ],
    ],
    cta: ['/tools/sql-formatter', 'Format and validate SQL free — no sign-up'],
  },
  {
    slug: 'code-snippet-sharing-tool',
    title: 'Code Snippet Sharing Tool for Developers: Share Code with a Link (2026) | DoAide Code',
    h1: 'Code snippet sharing for developers: stop pasting code into chat',
    description:
      'Why pasting code into WhatsApp and Slack mangles it, what a good code snippet sharing tool does (short links, syntax highlighting, no sign-up), how it compares to GitHub Gists and pastebins, and how to embed snippets in blogs and docs.',
    updated: '2026-10-23',
    intro: `<p>Every developer has received code as a screenshot. Or as a WhatsApp message where the indentation died, the quotes turned "smart", and line 40 wrapped into line 41 so the bug became invisible. Chat apps are built for sentences, not source code — and yet chat is where debugging help actually happens: with a teammate, a senior, a study group, a community.</p>
<p>A code snippet sharing tool fixes the medium. You paste the code once, get a short link, and everyone who opens it sees the same thing: monospaced, syntax-highlighted, line breaks intact. This guide covers what separates a good snippet tool from a pastebin full of ads, when a gist is the better choice, and how to embed shared code in a blog or docs site. You can try everything with the <a href="/tools/share-code">free code snippet sharing tool</a> — no sign-up on either end of the link.</p>`,
    sections: [
      [
        'why-chat-fails',
        'Why pasting code into chat fails',
        `<p>The failure modes are so common we stop noticing them:</p>
<ul>
<li><strong>Whitespace dies.</strong> Chat apps collapse spaces and strip leading indentation — fatal for Python, where indentation is the program, and painful everywhere else.</li>
<li><strong>Quotes get "fixed".</strong> Autocorrect turns straight quotes into curly ones, so the code the helper copies back doesn't even parse.</li>
<li><strong>Long code becomes "Read more".</strong> The relevant line is always below the fold, and nobody expands it on a phone.</li>
<li><strong>Screenshots can't be copied.</strong> The helper has to retype your code to run it — so they don't, and you get a guess instead of an answer.</li>
<li><strong>Versions multiply.</strong> Three pastes into a group chat later, nobody knows which version has the fix.</li>
</ul>
<p>A link solves all five at once: one URL, one canonical version, rendered properly on every device that opens it.</p>`,
      ],
      [
        'what-good-looks-like',
        'What a good code snippet sharing tool does',
        `<p>The bar is simple but most tools miss at least one piece:</p>
<ul>
<li><strong>Short links.</strong> A link like <code>code.doaide.com/s/aB3xY9kQ</code> survives WhatsApp, SMS, a QR code or being read out loud. Links that embed the whole file in the URL get truncated by apps and break silently.</li>
<li><strong>Syntax highlighting</strong> for the language, picked automatically or in one click — the reader's eyes need the same cues their editor gives them.</li>
<li><strong>No sign-up on either end.</strong> The person helping you should never hit a login wall. Sender creates without an account; receiver reads without an account.</li>
<li><strong>Room for real code.</strong> The <a href="/tools/share-code">DoAide Code share tool</a> takes up to 20,000 characters — a whole file or a meaty stack trace, not just ten lines.</li>
<li><strong>A title and a view count</strong>, so "payment webhook bug" is findable later and you can see whether anyone actually opened it.</li>
</ul>
<p>Sharing takes about twenty seconds: open the tool, paste, pick the language, copy the link. There is a one-tap WhatsApp share for the group-chat workflow half of us live in.</p>`,
      ],
      [
        'vs-gists',
        'Snippet links vs GitHub Gists vs pastebins',
        `<p>Three tools, three jobs — use the right one:</p>
<table>
<tr><th></th><th>Snippet link</th><th>GitHub Gist</th><th>Classic pastebin</th></tr>
<tr><td>Sign-up to create</td><td>No</td><td>GitHub account</td><td>No</td></tr>
<tr><td>Best for</td><td>Quick help, chat, interviews, teaching</td><td>Code you'll keep: dotfiles, reusable utilities</td><td>Logs and text dumps</td></tr>
<tr><td>Versioning</td><td>No — share a new link</td><td>Yes, full git history</td><td>No</td></tr>
<tr><td>Syntax highlighting</td><td>Yes</td><td>Yes</td><td>Varies, often behind ads</td></tr>
<tr><td>Forks/comments</td><td>No</td><td>Yes</td><td>No</td></tr>
</table>
<p>The rule of thumb: if the code matters next month, it belongs in a gist or a repo. If it matters in the next hour — a bug you're stuck on, an example for a student, a query for a teammate — a snippet link is faster for you and friction-free for them.</p>`,
      ],
      [
        'embedding',
        'Embedding snippets in blogs, docs and READMEs',
        `<p>Sharing into chat is one direction; publishing is the other. If you write tutorials, internal docs or a README site, you want the snippet rendered <em>inside</em> the page, not behind a link. The companion <a href="/tools/embed-code">embeddable code widget</a> turns a paste into an iframe snippet you drop into any HTML page or docs platform that allows embeds — readers see the highlighted code in place and can open it in the free AI tools with one click.</p>
<p>Two habits make published snippets age well:</p>
<ul>
<li><strong>Format before you share.</strong> Run the code through the <a href="/tools/code-formatter">code formatter</a> (or the <a href="/tools/sql-formatter">SQL formatter</a> for queries) first — a public snippet with ragged indentation undercuts the explanation around it.</li>
<li><strong>Trim to the point.</strong> Share the twenty lines that matter, not the whole file. If the reader needs context, a comment saying what the caller does beats three screens of scrolling.</li>
</ul>`,
      ],
      [
        'safety',
        'Snippet hygiene: what never goes in a share link',
        `<p>A share link is a URL — treat everything behind it as public, whatever the tool's privacy model:</p>
<ul>
<li><strong>No secrets.</strong> API keys, passwords, tokens and connection strings get rotated the moment they're pasted anywhere. Replace them with <code>YOUR_API_KEY</code> placeholders before sharing — the helper doesn't need the real one.</li>
<li><strong>No customer data.</strong> Mask emails, phone numbers and IDs in sample rows and stack traces.</li>
<li><strong>Mind your employer's rules.</strong> Assignment code and open-source snippets are fine to share; proprietary code follows your company's policy, same as with any external tool.</li>
</ul>
<p>Before sharing a snippet you're unsure about, a 30-second pass through <a href="/tools/find-bugs">Find Bugs</a> or the <a href="/tools/code-review">AI code review</a> sometimes answers the question yourself — the fastest share is the one you didn't need to send.</p>`,
      ],
    ],
    faqs: [
      [
        'What is the best way to share a code snippet with someone?',
        'Paste it into a snippet sharing tool and send the short link. The receiver sees syntax-highlighted code with the indentation and quotes intact, on any device, with nothing to install and no account to create. The free tool at code.doaide.com/tools/share-code does this in about twenty seconds.',
      ],
      [
        'How do I share code on WhatsApp without breaking it?',
        'Never paste code directly — WhatsApp collapses whitespace and converts quotes. Create a share link instead and send that: the DoAide Code share tool even has a one-tap WhatsApp share button, and the person opens perfectly formatted code in their browser.',
      ],
      [
        'Is the DoAide Code snippet sharing tool really free?',
        'Yes — creating and viewing snippets is free with no sign-up on either end. Snippets take up to 20,000 characters with a title and language for syntax highlighting, and there are fair-use rate limits to keep the service available for everyone.',
      ],
      [
        'Should I use a snippet link or a GitHub Gist?',
        "Snippet links are for the next hour: debugging help, teaching, interviews, quick chat shares, with zero friction for the receiver. Gists are for code you'll keep — they version with git and attach to your GitHub identity. Most developers end up using both for different jobs.",
      ],
      [
        'Is it safe to share code through an online snippet tool?',
        'Treat any share link as public: strip API keys, passwords and customer data before pasting, exactly as you would before posting on Stack Overflow. For ordinary application code, assignments and examples, link sharing is the standard way developers ask for help.',
      ],
    ],
    cta: ['/tools/share-code', 'Share a code snippet free — get a short link'],
  },
  {
    slug: 'generate-json-schema-from-json',
    title: 'Generate a JSON Schema from JSON: Practical Guide (2026) | DoAide Code',
    h1: 'How to generate a JSON Schema from a JSON sample',
    description:
      'What JSON Schema is for, how to generate one automatically from sample JSON, what inference gets right (types, required keys, formats) and where to edit by hand — with a free in-browser JSON Schema generator.',
    updated: '2026-10-23',
    intro: `<p>Every API contract argument ends the same way: someone finally writes a schema. JSON Schema is how services tell each other — and tell their tests, their editors and their AI tools — exactly what a payload looks like: which keys exist, which are required, what type each one is. OpenAPI request bodies, form validators, config file linting in VS Code, structured output from LLMs — all of it runs on JSON Schema.</p>
<p>Writing one by hand is tedious, and the fastest way to start is to generate it from a real sample of your data. This guide shows how schema inference works, what it gets right automatically, and the handful of things you should still edit by hand. You can follow along with the <a href="/tools/json-schema-generator">free JSON Schema generator</a> — paste JSON, get a draft 2020-12 schema instantly, nothing uploaded.</p>`,
    sections: [
      [
        'what-schema-does',
        'What a JSON Schema actually buys you',
        `<p>A schema is machine-checkable documentation. Concretely it gives you:</p>
<ul>
<li><strong>Validation at the boundary.</strong> Reject a bad request with a precise error ("age must be an integer") instead of a 500 three layers deeper.</li>
<li><strong>Editor support.</strong> VS Code validates and autocompletes JSON and YAML files against a schema — that is how it knows the keys of package.json.</li>
<li><strong>Contract tests.</strong> Validate real API responses against the schema in CI and catch breaking changes before clients do.</li>
<li><strong>Typed clients and structured AI output.</strong> Code generators turn schemas into TypeScript types; LLM APIs accept a JSON Schema to force well-formed output.</li>
</ul>
<p>The draft to use in 2026 is <strong>2020-12</strong> — it is what OpenAPI 3.1 and modern validators (Ajv, jsonschema) speak natively.</p>`,
      ],
      [
        'how-inference-works',
        'How generating a schema from a sample works',
        `<p>A generator walks your sample value and mirrors its shape:</p>
<ul>
<li><strong>Scalars</strong> map to their JSON Schema types, with whole numbers becoming <code>integer</code> (stricter and almost always what an API means) and decimals becoming <code>number</code>.</li>
<li><strong>Objects</strong> become <code>type: "object"</code> with a <code>properties</code> map, and the keys present in the sample are listed as <code>required</code>.</li>
<li><strong>Arrays</strong> are the interesting case: the generator infers a schema for every element and merges them — properties are unioned, and only keys present in <em>every</em> element stay required. Genuinely mixed arrays become an <code>anyOf</code>.</li>
<li><strong>Recognizable strings</strong> get a <code>format</code>: ISO dates become <code>date-time</code>, and emails, URLs, UUIDs and IPv4 addresses are tagged too — validators and docs both benefit.</li>
</ul>
<p>Paste a realistic sample into the <a href="/tools/json-schema-generator">generator</a> and read the output next to this list — each rule is visible in the result.</p>`,
      ],
      [
        'edit-by-hand',
        'What to edit by hand afterwards',
        `<p>Inference sees one sample, not your intent. After generating, spend five minutes on:</p>
<ul>
<li><strong>Optional keys.</strong> If a field can be absent but your sample happened to include it, delete it from <code>required</code>. (Feed the generator an array of several samples and it does this intersection for you.)</li>
<li><strong>Nullability.</strong> A field that was <code>null</code> in the sample is typed <code>null</code>; widen it to what it really is, e.g. <code>{"type": ["string", "null"]}</code>.</li>
<li><strong>Constraints.</strong> Add <code>minimum</code>, <code>maxLength</code>, <code>pattern</code> and <code>enum</code> where business rules exist — no sample can reveal that status is one of three values.</li>
<li><strong>Descriptions.</strong> A one-line <code>description</code> per property is what turns a schema into documentation humans read.</li>
<li><strong>additionalProperties.</strong> Set it to <code>false</code> on strict API contracts so typos in keys fail loudly instead of passing silently.</li>
</ul>`,
      ],
      [
        'validate-workflow',
        'A minimal validation workflow',
        `<p>With a schema in hand, wiring validation takes minutes. In Node with Ajv:</p>
<pre><code>import Ajv from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const ajv = new Ajv()
addFormats(ajv)
const validate = ajv.compile(schema)

if (!validate(payload)) {
  console.log(validate.errors) // instancePath, message, params
}</code></pre>
<p>In Python, <code>jsonschema.validate(payload, schema)</code> does the same. Put it at every boundary you do not control: request bodies, webhook payloads, files users upload, responses from third-party APIs. Validate your own config files in the editor by adding a <code>$schema</code> key pointing at your schema file.</p>
<p>Working with the JSON itself first? The <a href="/tools/json-formatter">JSON formatter</a> validates syntax and shows the structure as a tree, and the <a href="/tools/json-path-finder">JSON path finder</a> gives you the exact path to any value.</p>`,
      ],
    ],
    faqs: [
      [
        'Can I generate a JSON Schema from a JSON file for free?',
        'Yes — paste the JSON into the free generator at code.doaide.com/tools/json-schema-generator and copy the draft 2020-12 schema. It runs entirely in your browser with no sign-up, and your data is never uploaded.',
      ],
      [
        'Which JSON Schema draft should I use in 2026?',
        'Draft 2020-12. It is the current standard, it is what OpenAPI 3.1 uses natively, and every maintained validator (Ajv, python-jsonschema, everit) supports it. Only pick draft-07 when a legacy tool forces it.',
      ],
      [
        'Does a generated schema replace writing one by hand?',
        'It replaces the boring 80%: structure, types, required lists and formats. You still add intent by hand — optional keys, enums, ranges and descriptions — which the guide covers section by section.',
      ],
      [
        'What is the difference between integer and number in JSON Schema?',
        'number accepts any JSON number including decimals; integer accepts only whole values. Generators emit integer when the sample value is whole, which is stricter and usually correct for ids and counts.',
      ],
    ],
    cta: ['/tools/json-schema-generator', 'Generate a JSON Schema from your JSON — free'],
  },
  {
    slug: 'css-flexbox-cheat-sheet',
    title: 'CSS Flexbox Cheat Sheet: Every Property, Visually (2026) | DoAide Code',
    h1: 'The flexbox cheat sheet: every property and what it actually moves',
    description:
      'A practical CSS flexbox reference — flex-direction, justify-content, align-items, wrap, gap and the per-item flex shorthand — with the recipes for centering, navbars, cards and sticky footers, and a free visual playground.',
    updated: '2026-10-23',
    intro: `<p>Flexbox is how layout gets done: one container property set, and a row of divs becomes a navbar, a card row, a perfectly centered modal. Yet most of us still guess between <code>justify-content</code> and <code>align-items</code>, or cargo-cult <code>flex: 1</code> without knowing what the 1 is.</p>
<p>This cheat sheet fixes the mental model in one read, then gives you the five recipes that cover 90% of real layouts. Every example here can be reproduced live in the <a href="/tools/flexbox-playground">free flexbox playground</a> — flip a property, watch the boxes move, copy the CSS.</p>`,
    sections: [
      [
        'mental-model',
        'The mental model: two axes, one rule',
        `<p>A flex container lays items along a <strong>main axis</strong>, chosen by <code>flex-direction</code> (<code>row</code> by default, <code>column</code> to stack). Everything else follows one rule:</p>
<ul>
<li><strong><code>justify-content</code> positions items along the main axis</strong> — start, end, center, or distributed with <code>space-between</code> / <code>space-around</code> / <code>space-evenly</code>.</li>
<li><strong><code>align-items</code> positions them across it</strong> — <code>stretch</code> (default), <code>flex-start</code>, <code>flex-end</code>, <code>center</code>, <code>baseline</code>.</li>
</ul>
<p>Flip <code>flex-direction</code> to <code>column</code> and the two swap what they visually do — same properties, rotated axes. This is the single most common flexbox confusion, and the fastest cure is flipping the direction select in the <a href="/tools/flexbox-playground">playground</a> and watching the items rearrange.</p>
<p>Add <code>gap</code> for spacing between items (it replaced the margin hacks years ago) and <code>flex-wrap: wrap</code> to let items break onto new lines, with <code>align-content</code> controlling how the wrapped lines pack.</p>`,
      ],
      [
        'item-properties',
        'Per-item control: grow, shrink, basis',
        `<p>Each item carries three numbers, usually written with the <code>flex</code> shorthand — <code>flex: grow shrink basis</code>:</p>
<ul>
<li><strong><code>flex-grow</code></strong> — the item's share of leftover space. Items with grow 2 take twice the extra space of items with grow 1.</li>
<li><strong><code>flex-shrink</code></strong> — how willingly it gives space up when the container is too small (0 = never shrink).</li>
<li><strong><code>flex-basis</code></strong> — its starting size before growing and shrinking; <code>auto</code> means "my content's size".</li>
</ul>
<p>The idioms to memorize: <code>flex: 1</code> (= 1 1 0) makes items split space equally regardless of content; <code>flex: auto</code> (= 1 1 auto) splits leftover space but respects content size; <code>flex: none</code> (= 0 0 auto) makes an item rigid. One item can also override the container's alignment with <code>align-self</code>.</p>`,
      ],
      [
        'recipes',
        'The five recipes that cover real layouts',
        `<p><strong>1. Perfect centering</strong> (modals, hero sections, empty states):</p>
<pre><code>.container { display: flex; justify-content: center; align-items: center; }</code></pre>
<p><strong>2. Navbar</strong> — logo left, links right:</p>
<pre><code>.nav { display: flex; justify-content: space-between; align-items: center; gap: 16px; }</code></pre>
<p><strong>3. Equal-width card row that wraps:</strong></p>
<pre><code>.cards { display: flex; flex-wrap: wrap; gap: 16px; }
.card { flex: 1 1 250px; }  /* grow, shrink, min ~250px before wrapping */</code></pre>
<p><strong>4. Sticky footer</strong> — footer at the bottom even on short pages:</p>
<pre><code>body { display: flex; flex-direction: column; min-height: 100vh; }
main { flex: 1; }</code></pre>
<p><strong>5. Sidebar layout</strong> — fixed sidebar, fluid content:</p>
<pre><code>.layout { display: flex; }
.sidebar { flex: none; width: 240px; }
.content { flex: 1; min-width: 0; }  /* min-width: 0 lets long content shrink */</code></pre>
<p>Rebuild any of these in the <a href="/tools/flexbox-playground">playground</a> to see which property does what — it emits only the properties you changed, so the copied CSS stays this short.</p>`,
      ],
      [
        'flexbox-or-grid',
        'Flexbox or Grid?',
        `<p>The working rule: <strong>flexbox for one dimension, grid for two.</strong> A navbar, a button row, a vertical stack — flexbox, because content flows along one line (even if it wraps). A page skeleton, a photo gallery with strict rows <em>and</em> columns, a dashboard — grid, because you are placing things on both axes at once.</p>
<p>They compose: a grid for the page, flexbox inside each cell. If you are fighting flexbox with nested wrappers to line things up in two directions, that is the signal to switch the outer layer to grid.</p>
<p>Polishing components while you are here: the <a href="/tools/box-shadow">box shadow generator</a> and <a href="/tools/css-gradient">CSS gradient generator</a> build the other half of a card's look, visually.</p>`,
      ],
    ],
    faqs: [
      [
        'How do I center a div with flexbox?',
        'On the parent: display: flex; justify-content: center; align-items: center;. The first centers along the main axis, the second across it. It works for any content size — try it live in the flexbox playground.',
      ],
      [
        'What is the difference between justify-content and align-items?',
        'justify-content distributes items along the main axis (the flex-direction); align-items aligns them across it. With flex-direction: row, justify-content is horizontal and align-items vertical; with column they swap.',
      ],
      [
        'What does flex: 1 mean?',
        'It is shorthand for flex-grow: 1, flex-shrink: 1, flex-basis: 0 — the item ignores its content size and takes an equal share of the container, which is how equal columns are made.',
      ],
      [
        'When should I use grid instead of flexbox?',
        'Use grid when you are controlling rows and columns at once (page layouts, galleries, dashboards) and flexbox when content flows along one axis (navbars, button rows, stacks). They nest happily in the same page.',
      ],
    ],
    cta: ['/tools/flexbox-playground', 'Open the free flexbox playground'],
  },
  {
    slug: 'seo-meta-tags-guide',
    title: 'Meta Tags for SEO: The Complete Checklist (2026) | DoAide Code',
    h1: 'Meta tags for SEO: what your pages actually need in 2026',
    description:
      'The meta tags that matter for SEO and social sharing in 2026 — title, description, canonical, Open Graph, Twitter cards, favicons — with character limits, common mistakes, and free generators for each.',
    updated: '2026-10-23',
    intro: `<p>Meta tags are the part of SEO you control completely and get wrong silently. The page renders fine, nothing errors — but the title gets truncated mid-word in search results, shared links show a grey rectangle instead of a preview, and Google picks its own description because yours was missing.</p>
<p>This checklist covers the tags that matter in 2026, the ones that stopped mattering years ago, and the exact limits to stay inside. Generate the whole block for any page with the <a href="/tools/meta-tag-generator">free meta tag generator</a> — it warns about lengths as you type.</p>`,
    sections: [
      [
        'core-tags',
        'The core four: title, description, canonical, viewport',
        `<p><strong>Title</strong> — the strongest on-page signal and your search-result headline. Keep it under ~60 characters so it is not cut off, put the distinctive words first, and make every page's unique: <code>&lt;title&gt;Free Invoice Generator for Freelancers | MySite&lt;/title&gt;</code>.</p>
<p><strong>Meta description</strong> — not a ranking factor, but it is your ad copy on the results page and drives click-through. One or two sentences under ~160 characters saying what the visitor gets. Skip it and Google assembles one from page fragments.</p>
<p><strong>Canonical</strong> — <code>&lt;link rel="canonical" href="…"&gt;</code> names the one true URL when the same content is reachable several ways (tracking parameters, http/https, trailing slashes). Without it, ranking signals split across duplicates.</p>
<p><strong>Viewport</strong> — <code>&lt;meta name="viewport" content="width=device-width, initial-scale=1"&gt;</code>. Not strictly an SEO tag, but mobile-first indexing means a page that renders desktop-width on phones ranks like one.</p>`,
      ],
      [
        'social-tags',
        'Open Graph and Twitter cards: how shares look',
        `<p>When a link is shared on WhatsApp, LinkedIn, Slack, Facebook or X, the preview card is built from these tags — and a link with a real preview gets dramatically more clicks than a bare URL:</p>
<pre><code>&lt;meta property="og:title" content="…"&gt;
&lt;meta property="og:description" content="…"&gt;
&lt;meta property="og:type" content="website"&gt;
&lt;meta property="og:url" content="https://…"&gt;
&lt;meta property="og:image" content="https://…/og.png"&gt;
&lt;meta name="twitter:card" content="summary_large_image"&gt;</code></pre>
<p>The image is the part people miss: make it <strong>1200×630</strong>, serve it over https with an absolute URL, and keep any text on it large. X/Twitter falls back to Open Graph tags for most fields, so the one Twitter-specific tag you always need is <code>twitter:card</code>.</p>
<p>The <a href="/tools/meta-tag-generator">meta tag generator</a> emits the full matched set, and the <a href="/tools/favicon-generator">favicon generator</a> covers the other visual identity piece — the icon browsers and search results show next to your name.</p>`,
      ],
      [
        'dead-tags',
        'Tags you can stop writing',
        `<p>Cargo-culted head sections are full of tags that do nothing in 2026:</p>
<ul>
<li><strong><code>meta keywords</code></strong> — ignored by Google since 2009; at worst it hands your keyword research to competitors.</li>
<li><strong><code>meta robots "index, follow"</code></strong> — that is the default; the tag only matters when you want <code>noindex</code> or <code>nofollow</code>.</li>
<li><strong><code>meta revisit-after</code>, <code>rating</code>, <code>distribution</code></strong> — never standards, never used.</li>
<li><strong><code>meta author</code></strong> — harmless, but search engines do not read it; authorship lives in structured data now.</li>
</ul>
<p>What replaced them: <strong>JSON-LD structured data</strong> (Article, Product, FAQPage, WebApplication) for rich results. It belongs in the same checklist even though it is a script block, not a meta tag.</p>`,
      ],
      [
        'audit-workflow',
        'A five-minute audit workflow',
        `<p>For each key page:</p>
<ol>
<li><strong>View source</strong> and check the core four exist and are unique to the page.</li>
<li><strong>Measure lengths</strong> — or paste the values into the <a href="/tools/meta-tag-generator">generator</a>, which flags over-limit titles and descriptions as you type.</li>
<li><strong>Test a share</strong> — paste the URL into a WhatsApp chat with yourself or a Slack DM and see what card renders; wrong image means og:image is missing, relative, or behind a redirect.</li>
<li><strong>Check performance basics</strong> — social crawlers and Google both time out on slow pages. The <a href="/tools/performance-audit">performance audit</a> reads the same page source and flags render-blocking scripts and unsized images.</li>
<li><strong>Keep sitemap and canonicals consistent</strong> — the canonical URL on the page should be the URL in your sitemap, always the https non-trailing-slash (or whatever your convention) version.</li>
</ol>`,
      ],
    ],
    faqs: [
      [
        'What are the most important meta tags for SEO?',
        'The title tag and meta description (your search-result listing), the canonical link (consolidates duplicate URLs), the viewport tag (mobile-first indexing), and Open Graph + Twitter card tags so shared links render a preview card.',
      ],
      [
        'How long should a title tag and meta description be in 2026?',
        'Keep titles under roughly 60 characters and descriptions under roughly 160 — beyond that, search results truncate them with an ellipsis. The limits are really pixel widths, so character counts are a safe approximation.',
      ],
      [
        'Do meta keywords still matter?',
        'No. Google has ignored the keywords meta tag since 2009 and no major engine uses it for ranking. Spend the effort on the title, description and structured data instead.',
      ],
      [
        'Why does my link not show an image when shared?',
        'The og:image tag is missing, uses a relative URL, points to a slow or redirected address, or the image is too small. Use an absolute https URL to a 1200×630 image and retest the share.',
      ],
    ],
    cta: ['/tools/meta-tag-generator', 'Generate your meta tags free'],
  },
  {
    slug: 'uuid-v4-vs-v7',
    title: 'UUID v4 vs v7: Which to Use for Database Keys (2026) | DoAide Code',
    h1: 'UUID v4 vs v7: which one should you use?',
    description:
      'How UUID v4 and v7 differ, why time-ordered v7 makes better database primary keys, when random v4 is still right, how to store UUIDs efficiently — and a free UUID generator for v1, v4 and v7.',
    updated: '2026-10-23',
    intro: `<p>For a decade the answer to “which UUID?” was simply v4: 122 random bits, no coordination, no collisions in practice. Then RFC 9562 (2024) standardised <strong>UUID v7</strong>, which puts a millisecond timestamp in front of the random bits — and suddenly the default for new database schemas changed.</p>
<p>This guide explains what actually differs between the versions, why it matters for your indexes, and the cases where v4 is still the better choice. Generate any of them while you read with the <a href="/tools/uuid-generator">free UUID generator</a> — v1, v4 and v7, up to 1,000 at once, with a decoder that shows the timestamp hidden inside v1 and v7 ids.</p>`,
    sections: [
      [
        'anatomy',
        'What is inside a UUID',
        `<p>Every UUID is 128 bits written as 32 hex digits in five groups: <code>017f22e2-79b0-<strong>7</strong>cc3-<strong>9</strong>8c4-dc0c0c07398f</code>. Two places are fixed: the first digit of the third group is the <strong>version</strong> (the 7 above), and the first digit of the fourth group encodes the <strong>variant</strong> (8, 9, a or b for standard UUIDs). Everything else depends on the version:</p>
<ul>
<li><strong>v1</strong> — a 60-bit timestamp in 100-nanosecond ticks since 1582, a clock sequence and a 48-bit node id that was traditionally the machine’s MAC address. The timestamp is split into shuffled fields, so v1 ids do <em>not</em> sort by time.</li>
<li><strong>v4</strong> — 122 random bits. Nothing else.</li>
<li><strong>v7</strong> — a 48-bit Unix timestamp in milliseconds first, then 74 random (or counter) bits. Sorting v7 ids as strings or bytes sorts them by creation time.</li>
</ul>
<p>Paste any UUID into the decoder on the <a href="/tools/uuid-generator">UUID generator</a> to see its version, variant and, for v1 and v7, exactly when it was made.</p>`,
      ],
      [
        'why-v7',
        'Why v7 makes better primary keys',
        `<p>Databases store primary keys in a B-tree index. With <strong>random v4 keys</strong>, each insert lands at a random position in that tree: pages split all over the index, recently written rows are scattered across disk, and the working set the cache must hold grows with the whole table. On large, write-heavy tables this shows up as slower inserts, bloated indexes and more I/O.</p>
<p><strong>v7 keys arrive in order</strong>, so new rows append to the right-hand edge of the index exactly like an auto-increment integer would — while keeping everything that made UUIDs attractive:</p>
<ul>
<li>ids can be generated anywhere (client, service, offline device) with no round-trip to the database;</li>
<li>they are unique across tables, shards and merged datasets;</li>
<li>they do not reveal how many rows you have, unlike sequential integers.</li>
</ul>
<p>As a bonus, “newest first” becomes <code>ORDER BY id DESC</code>, and keyset pagination works on the primary key alone.</p>`,
      ],
      [
        'when-v4',
        'When random v4 is still the right choice',
        `<p>v7’s strength — the embedded timestamp — is also its weakness. Anyone who sees a v7 id can read when the record was created, to the millisecond. Prefer <strong>v4</strong> when:</p>
<ul>
<li>the id is <strong>public</strong> and creation time is sensitive — invitation links, password-reset tokens, user ids in URLs where signup dates should stay private;</li>
<li>you need <strong>unpredictability</strong>: v7 has fewer random bits, and ids made in the same millisecond are close together;</li>
<li>the table is small or read-mostly, so index locality does not matter.</li>
</ul>
<p>A common pattern is both: a v7 primary key internally, and a separate random v4 (or a longer random token) for anything exposed outside. And never use any UUID as a <em>secret</em> on its own — for tokens, generate 128+ random bits specifically for that purpose, the same way the <a href="/tools/password-generator">password generator</a> draws from the browser’s secure random source.</p>`,
      ],
      [
        'storage',
        'Storing and generating UUIDs efficiently',
        `<p>The storage format matters as much as the version:</p>
<ul>
<li><strong>Use a native 16-byte type</strong> — <code>uuid</code> in PostgreSQL, <code>BINARY(16)</code> in MySQL (with <code>UUID_TO_BIN()</code>), <code>uniqueidentifier</code> in SQL Server. A <code>CHAR(36)</code> column is more than twice the size, and every index that includes the key pays for it again.</li>
<li><strong>Generate v7 in the database or the app.</strong> PostgreSQL 18 ships a built-in <code>uuidv7()</code> function; Python 3.14 added <code>uuid.uuid7()</code>; in JavaScript, <code>crypto.randomUUID()</code> gives v4 and the <code>uuid</code> npm package provides <code>v7()</code>.</li>
<li><strong>Keep the canonical lowercase hyphenated form</strong> in APIs and logs. Uppercase or braces (<code>{…}</code>) are display conventions from the Windows/.NET world, where UUIDs are called GUIDs.</li>
</ul>
<pre><code>-- PostgreSQL 18
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  created_at timestamptz NOT NULL DEFAULT now()
);</code></pre>
<p>Need test fixtures? The <a href="/tools/uuid-generator">generator</a> exports a whole batch as a quoted, comma-separated list ready to paste into SQL or a JSON seed file — and the <a href="/tools/json-schema-generator">JSON Schema generator</a> tags UUID strings with <code>format: uuid</code> automatically.</p>`,
      ],
    ],
    faqs: [
      [
        'Should I use UUID v4 or v7 for a primary key?',
        'Use v7 for new database primary keys: it is time-ordered, so inserts append to the index instead of scattering across it, and it keeps every other UUID advantage. Use v4 where the id is public and its creation time should stay private.',
      ],
      [
        'Can UUID v7 values collide?',
        'Practically never. Each v7 id carries 74 random or counter bits per millisecond, and well-behaved generators also count upward within a millisecond, so ids from one generator are strictly increasing and unique.',
      ],
      [
        'Is UUID v7 an official standard?',
        'Yes. RFC 9562, published in May 2024, defines versions 6, 7 and 8 and replaces the original RFC 4122. v7 is the version the RFC recommends for new time-based ids.',
      ],
      [
        'How do I generate UUIDs online for free?',
        'Open code.doaide.com/tools/uuid-generator, pick v4, v7 or v1 and how many you need (up to 1,000), and copy or download them. They are generated in your browser with a cryptographically secure random source and never sent anywhere.',
      ],
    ],
    cta: ['/tools/uuid-generator', 'Generate v4 or v7 UUIDs free — up to 1,000 at once'],
  },
  {
    slug: 'css-grid-layout-guide',
    title: 'CSS Grid Layout Guide: Template Areas, fr & minmax (2026) | DoAide Code',
    h1: 'CSS Grid explained: tracks, fr, minmax and template areas',
    description:
      'A practical CSS Grid guide — grid-template-columns, the fr unit, minmax(), auto-fill vs auto-fit, named grid-template-areas, responsive layouts and when to use flexbox instead — with a free visual CSS grid generator.',
    updated: '2026-10-23',
    intro: `<p>Flexbox lays things out in a line. <strong>CSS Grid lays things out in two dimensions at once</strong> — rows and columns together — which is exactly what page layouts, dashboards and card galleries need. Grid has been supported in every major browser for years, yet many developers still reach for nested flex containers and margin hacks because the grid syntax looks intimidating.</p>
<p>It is smaller than it looks. This guide covers the handful of properties that build almost every real layout, then the recipes you will reuse. Build each one visually in the <a href="/tools/css-grid-generator">free CSS grid generator</a> — set tracks and gaps, paint named areas onto a live grid, and copy the CSS and HTML.</p>`,
    sections: [
      [
        'tracks',
        'Tracks: columns, rows and the fr unit',
        `<p>A grid starts with <code>display: grid</code> and a list of track sizes:</p>
<pre><code>.layout {
  display: grid;
  grid-template-columns: 240px 1fr 1fr;
  grid-template-rows: auto 1fr auto;
  gap: 16px;
}</code></pre>
<ul>
<li><strong><code>fr</code></strong> is a share of the leftover space. After the fixed 240px column is placed, the two <code>1fr</code> columns split the rest equally; <code>2fr 1fr</code> would split it two-to-one.</li>
<li><strong><code>auto</code></strong> sizes a track to its content — ideal for header and footer rows.</li>
<li><strong><code>repeat(3, 1fr)</code></strong> is shorthand for three equal columns (the generator writes it for you when tracks match).</li>
<li><strong><code>gap</code></strong> spaces tracks without margins; <code>gap: 24px 16px</code> sets row and column gaps separately.</li>
</ul>`,
      ],
      [
        'minmax-autofill',
        'minmax(), auto-fill and auto-fit: responsive without media queries',
        `<p><code>minmax(min, max)</code> lets a track flex between two limits. Combined with <code>repeat()</code>’s auto keywords it produces the most useful line of CSS Grid:</p>
<pre><code>.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}</code></pre>
<p>The browser fits as many 220px-or-wider columns as the container allows and stretches them to fill the row — four columns on a laptop, two on a tablet, one on a phone, with zero media queries.</p>
<ul>
<li><strong><code>auto-fill</code></strong> keeps empty column slots when there are few items, so cards keep their size.</li>
<li><strong><code>auto-fit</code></strong> collapses empty slots, so a short row of items stretches to fill the width.</li>
</ul>
<p>Another everyday use: <code>grid-template-columns: minmax(0, 1fr)</code> instead of <code>1fr</code> stops long words or code blocks from forcing a column wider than the screen.</p>`,
      ],
      [
        'template-areas',
        'Named template areas: draw the layout in your CSS',
        `<p><code>grid-template-areas</code> lets you sketch the layout as text and place children by name:</p>
<pre><code>.page {
  display: grid;
  grid-template-columns: 220px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header  header"
    "sidebar main"
    "footer  footer";
}
.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.footer  { grid-area: footer; }</code></pre>
<p>Three rules to remember: every row string must have the same number of cells; a <code>.</code> marks an empty cell; and each name must form <strong>one filled rectangle</strong> — an L-shaped area makes the browser ignore the entire template. The <a href="/tools/css-grid-generator">grid generator</a> checks that rule as you paint and tells you which area is broken.</p>
<p>The real payoff is responsive design: a media query only needs to redefine the map, and the HTML never changes.</p>
<pre><code>@media (max-width: 640px) {
  .page {
    grid-template-columns: 1fr;
    grid-template-areas: "header" "main" "sidebar" "footer";
  }
}</code></pre>`,
      ],
      [
        'grid-vs-flexbox',
        'Grid or flexbox?',
        `<p>They are partners, not rivals. A simple rule of thumb:</p>
<ul>
<li><strong>Grid</strong> when you control the layout from the container in two dimensions: page shells, dashboards, image galleries, forms with aligned labels, anything where items must line up in both rows and columns.</li>
<li><strong>Flexbox</strong> when content flows in one direction and items size themselves: navbars, button groups, tag lists, centering a single element. The <a href="/guides/css-flexbox-cheat-sheet">flexbox cheat sheet</a> and the <a href="/tools/flexbox-playground">flexbox playground</a> cover that side.</li>
</ul>
<p>Most real pages use both — a grid for the page shell, flexbox inside the header and cards. For the cards themselves, pair the layout with a consistent set of colors from the <a href="/tools/color-palette">color palette generator</a> and depth from the <a href="/tools/box-shadow">box shadow generator</a>.</p>`,
      ],
    ],
    faqs: [
      [
        'How do I create a CSS grid layout quickly?',
        'Use the free generator at code.doaide.com/tools/css-grid-generator: set the number and size of columns and rows, adjust the gaps, paint named areas onto the live preview, and copy the generated CSS and HTML. It runs in your browser, no sign-up.',
      ],
      [
        'What does 1fr mean in CSS Grid?',
        'fr is a fraction of the free space left in the grid container after fixed and content-sized tracks are placed. 1fr 1fr splits it equally; 2fr 1fr gives the first track twice as much.',
      ],
      [
        'Why is my grid-template-areas not working?',
        'The usual causes: rows with different numbers of cells, an area name that does not form a single rectangle, or a child whose grid-area name does not match. Any of these makes the browser drop the whole template.',
      ],
      [
        'What is the difference between auto-fill and auto-fit?',
        'Both create as many columns as fit. auto-fill keeps empty tracks when there are fewer items than columns, so items keep their size; auto-fit collapses the empty tracks so the existing items stretch to fill the row.',
      ],
    ],
    cta: ['/tools/css-grid-generator', 'Build your CSS grid visually — free generator'],
  },
  {
    slug: 'linux-file-permissions-chmod',
    title: 'Linux File Permissions & chmod Explained: 755, 644, 600 (2026) | DoAide Code',
    h1: 'Linux file permissions and chmod, explained',
    description:
      'How Linux permissions work — read, write and execute for owner, group and others, octal modes like 755, 644 and 600, symbolic chmod, setuid, setgid and the sticky bit — with a free visual chmod calculator.',
    updated: '2026-10-23',
    intro: `<p>“Permission denied” is one of the first errors every developer meets on a Linux server, and <code>chmod 777</code> is the fix that makes it go away — while opening a security hole. Understanding the nine permission bits takes ten minutes and saves you from both.</p>
<p>This guide covers how permissions are represented, what the common octal modes mean, how to read <code>ls -l</code> output, and the special bits that trip people up. Try every example in the <a href="/tools/chmod-calculator">free chmod calculator</a>: tick boxes or type a mode and get both chmod commands with a plain-English explanation.</p>`,
    sections: [
      [
        'three-classes',
        'Owner, group, others — and read, write, execute',
        `<p>Every file and directory has an <strong>owner</strong> (a user), a <strong>group</strong>, and permissions for three classes of people: the owner, members of the group, and <strong>others</strong> (everyone else). Each class gets three bits:</p>
<ul>
<li><strong>r — read</strong> (4): read a file’s contents; list a directory’s entries.</li>
<li><strong>w — write</strong> (2): change a file; create, rename or delete entries in a directory.</li>
<li><strong>x — execute</strong> (1): run a file as a program; <em>enter</em> a directory and reach the files inside it.</li>
</ul>
<p>The directory meanings are the ones that surprise people. Deleting a file needs write permission on the <em>directory</em>, not the file. And a directory with <code>r</code> but no <code>x</code> lets you see names but not open anything in it — which is why directories are almost always 755 or 700, never 644.</p>`,
      ],
      [
        'octal',
        'Octal modes: what 755, 644 and 600 mean',
        `<p>Add up each class’s bits to get one digit from 0 to 7, then write the three digits owner-group-others:</p>
<pre><code>7 = 4+2+1 = rwx      5 = 4+1 = r-x      4 = r--
6 = 4+2   = rw-      0       = ---</code></pre>
<ul>
<li><strong>755</strong> (<code>rwxr-xr-x</code>) — scripts, binaries and directories: everyone can run or enter, only the owner can change.</li>
<li><strong>644</strong> (<code>rw-r--r--</code>) — ordinary files: HTML, images, config that is not secret.</li>
<li><strong>600</strong> (<code>rw-------</code>) — private files: SSH private keys, <code>.env</code> files, credentials.</li>
<li><strong>700</strong> (<code>rwx------</code>) — private directories such as <code>~/.ssh</code>.</li>
<li><strong>775 / 664</strong> — the group-shared versions of 755 / 644, for teams that share a group.</li>
</ul>
<p>OpenSSH refuses a private key that others can read — the classic “UNPROTECTED PRIVATE KEY FILE” error is fixed with <code>chmod 600 ~/.ssh/id_ed25519</code>.</p>`,
      ],
      [
        'ls-l',
        'Reading ls -l output',
        `<p><code>ls -l</code> shows the same bits as ten characters:</p>
<pre><code>-rwxr-xr-x  1 deploy www-data  4096 Oct 23 10:00 deploy.sh
drwxr-x---  2 deploy www-data  4096 Oct 23 10:00 secrets</code></pre>
<p>The first character is the type (<code>-</code> file, <code>d</code> directory, <code>l</code> symlink), then three groups of <code>rwx</code> for owner, group and others. So <code>deploy.sh</code> is 755 and <code>secrets</code> is 750: the group can enter and list it, others cannot. Paste either string into the <a href="/tools/chmod-calculator">chmod calculator</a> to get the octal value. A trailing <code>.</code>, <code>+</code> or <code>@</code> marks SELinux contexts, ACLs or macOS extended attributes.</p>`,
      ],
      [
        'symbolic',
        'Symbolic chmod: changing one bit at a time',
        `<p>Octal sets all nine bits at once. Symbolic mode changes only what you name, which is safer in scripts:</p>
<pre><code>chmod +x script.sh          # add execute for everyone (subject to umask)
chmod u+x,go-w file         # owner gains execute; group and others lose write
chmod g=rx,o= dir           # group exactly r-x, others nothing
chmod -R u=rwX,go=rX site/  # capital X: execute only on directories (and already-executable files)</code></pre>
<p>The capital <code>X</code> is the trick for fixing a whole tree: directories get <code>x</code> so they can be entered, ordinary files do not become executable. The common alternative is two <code>find</code> commands: <code>find site -type d -exec chmod 755 {} +</code> and <code>find site -type f -exec chmod 644 {} +</code>.</p>`,
      ],
      [
        'special-bits',
        'setuid, setgid and the sticky bit',
        `<p>A fourth, leading octal digit holds three special bits:</p>
<ul>
<li><strong>setuid (4)</strong> — the program runs with its <em>owner’s</em> privileges. <code>/usr/bin/passwd</code> is <code>4755</code> owned by root, which is how ordinary users can update the shadow password file. Shows as <code>s</code> in the owner’s execute column.</li>
<li><strong>setgid (2)</strong> — on a program, runs with the file’s group; on a <em>directory</em>, new files inherit the directory’s group instead of the creator’s. <code>2775</code> is the standard mode for a shared project directory.</li>
<li><strong>sticky (1)</strong> — on a directory, only a file’s owner can delete or rename it, even if others can write to the directory. That is why <code>/tmp</code> is <code>1777</code> and shows a <code>t</code> at the end.</li>
</ul>
<p>A capital <code>S</code> or <code>T</code> in <code>ls -l</code> means the special bit is set but the execute bit underneath is not — usually a mistake.</p>`,
      ],
      [
        'never-777',
        'Why chmod 777 is almost always wrong',
        `<p>777 gives every account on the machine — including a compromised web process — permission to modify or replace the file. On a web server that means an uploaded script can overwrite your code. The real problem behind “permission denied” is nearly always <strong>ownership</strong>, not mode:</p>
<pre><code># the web server (www-data) needs to write uploads
sudo chown -R deploy:www-data uploads/
sudo chmod -R 2775 uploads/   # group-writable, new files keep the group</code></pre>
<p>Also check your <strong>umask</strong>: it is subtracted from the default 666 (files) and 777 (directories) when files are created, so a umask of 022 yields 644 and 755. Working with servers, containers or deploy scripts? The <a href="/tools/ip-subnet-calculator">IP subnet calculator</a> and <a href="/tools/cron-builder">cron expression builder</a> cover the next two things you will need.</p>`,
      ],
    ],
    faqs: [
      [
        'What does chmod 755 mean?',
        'The owner can read, write and execute (7); the group and everyone else can read and execute (5 and 5). It is the normal mode for scripts, programs and directories.',
      ],
      [
        'What is the difference between chmod 644 and 755?',
        '644 (rw-r--r--) has no execute permission and suits regular files. 755 (rwxr-xr-x) adds execute, which programs need to run and directories need to be entered.',
      ],
      [
        'What permissions should an SSH key have?',
        'The private key must be 600 and the ~/.ssh directory 700. Public keys and authorized_keys can be 644. OpenSSH refuses private keys that other users can read.',
      ],
      [
        'How do I calculate chmod permissions online?',
        'Use the free chmod calculator at code.doaide.com/tools/chmod-calculator: tick read, write and execute for owner, group and others, or type a mode like 755 or rwxr-xr-x, and copy the octal or symbolic chmod command.',
      ],
    ],
    cta: ['/tools/chmod-calculator', 'Work out any chmod mode — free visual calculator'],
  },
  {
    slug: 'mock-api-for-frontend-development',
    title: 'How to Mock a REST API for Frontend Development & Testing (2026) | DoAide Code',
    h1: 'How to mock a REST API for frontend development',
    description:
      'Why and how to mock REST APIs — hosted mock URLs, MSW, json-server and test stubs — plus simulating errors, latency and path parameters, and a free online API mocker that gives you a live URL in seconds.',
    updated: '2026-10-23',
    intro: `<p>The backend endpoint you need does not exist yet, or it is flaky, or you need it to return a 500 so you can test the error state. Waiting is not an option — so you <strong>mock</strong> it: a stand-in that returns the responses your frontend expects.</p>
<p>This guide compares the main ways to mock an API, from a hosted URL to in-browser interception, and shows how to cover the cases that real APIs make hard to reproduce. To follow along, the <a href="/tools/api-mocker">free API response mocker</a> turns a list of endpoints into a live URL that any app can call — no sign-up, CORS open.</p>`,
    sections: [
      [
        'why-mock',
        'Why mock an API at all',
        `<ul>
<li><strong>Parallel work.</strong> Agree on the response shape, mock it, and the frontend ships while the backend is built.</li>
<li><strong>Edge cases on demand.</strong> Empty lists, 401s, 429 rate limits, 500s and slow responses are hard to trigger on a real server and easy to return from a mock.</li>
<li><strong>Stable demos and tests.</strong> A mock never changes data under you, never goes down during a client demo, and never needs credentials.</li>
<li><strong>Prototypes.</strong> A clickable prototype with realistic data convinces stakeholders far better than lorem ipsum.</li>
</ul>`,
      ],
      [
        'approaches',
        'Four ways to mock: which fits when',
        `<p><strong>1. A hosted mock URL.</strong> Define endpoints in a web tool and get a base URL such as <code>https://code.doaide.com/api/mock/abc123</code>. Nothing to install, works from any device, and teammates, Postman or a mobile app can hit the same URL. Best for prototypes, demos, mobile apps and sharing.</p>
<p><strong>2. In-browser interception (MSW).</strong> <a href="https://mswjs.io/" rel="noopener">Mock Service Worker</a> intercepts <code>fetch</code> in the browser and Node with handlers written in code. Best when mocks should live in the repo and be reused by unit and end-to-end tests.</p>
<p><strong>3. A local fake server (json-server).</strong> Point it at a <code>db.json</code> and get full CRUD that persists to the file. Best when you need writes to stick during a session.</p>
<p><strong>4. Test-level stubs.</strong> <code>vi.fn()</code>/<code>jest.fn()</code> replacing <code>fetch</code>, or Playwright’s <code>page.route()</code>. Best for one test that needs one precise response.</p>
<p>Many teams combine them: a hosted mock while the API is being designed, then MSW handlers generated from the agreed contract.</p>`,
      ],
      [
        'design',
        'Designing mock responses that catch real bugs',
        `<p>A mock that only returns the happy path hides the bugs you most need to find. For each endpoint, add the variants your UI must handle:</p>
<ul>
<li><strong>Status codes</strong> — 201 with the created resource, 204 with no body, 400 and 422 with validation errors, 401/403, 404, 409 conflicts, 429 and 500.</li>
<li><strong>Latency</strong> — a 1–3 second delay exposes missing spinners, double-submits and race conditions between requests.</li>
<li><strong>Shape extremes</strong> — empty arrays, very long strings, <code>null</code> optional fields, Unicode names and large pages.</li>
<li><strong>Path parameters</strong> — <code>/users/:id</code> should echo the id so detail pages show the record you clicked.</li>
</ul>
<pre><code>GET  /users        200  [{"id": 1, "name": "Asha"}, …]
GET  /users/:id    200  {"id": "{{id}}", "name": "Asha"}
POST /users        201  {"id": 3}          (delay 800 ms)
GET  /users/999    404  {"error": "Not found"}</code></pre>
<p>In the <a href="/tools/api-mocker">API mocker</a>, literal paths take priority over <code>:param</code> ones, so <code>/users/999</code> can return a 404 while every other id succeeds. Validate the bodies first with the <a href="/tools/json-formatter">JSON formatter</a>, and generate a schema for them with the <a href="/tools/json-schema-generator">JSON Schema generator</a> so the real API can be checked against the same contract later.</p>`,
      ],
      [
        'wire-up',
        'Pointing your app at the mock',
        `<p>Keep the base URL in configuration so switching from mock to real API is a one-line change:</p>
<pre><code># .env.development
VITE_API_URL=https://code.doaide.com/api/mock/abc123

// api.js
const BASE = import.meta.env.VITE_API_URL
export const getUser = (id) =&gt; fetch(\`\${BASE}/users/\${id}\`).then((r) =&gt; r.json())</code></pre>
<p>Hosted mocks must send CORS headers or the browser blocks the response; DoAide’s mocks answer every origin and the <code>OPTIONS</code> preflight, so this works from <code>localhost</code>, a deployed preview or a mobile WebView. Use the copy-curl button to check an endpoint from the terminal first.</p>`,
      ],
      [
        'pitfalls',
        'Pitfalls: when mocks lie',
        `<ul>
<li><strong>Drift.</strong> The real API changes and the mock does not. Regenerate mocks from an OpenAPI spec or a schema and run contract tests against the real service.</li>
<li><strong>Too-perfect data.</strong> Real responses have nulls, missing fields and odd casing. Copy a real response into the mock as soon as one exists.</li>
<li><strong>Secrets.</strong> Hosted mocks are reachable by anyone with the URL — never put real customer data or keys in them.</li>
<li><strong>Forgetting to switch.</strong> Log the API base URL at startup in development and fail the production build if it points at a mock.</li>
</ul>`,
      ],
    ],
    faqs: [
      [
        'How do I create a mock API online for free?',
        'Open code.doaide.com/tools/api-mocker, add endpoints with a method, path, status code, optional delay and a JSON body, then press Create mock URL. The base URL is live immediately and works from any app, with CORS enabled.',
      ],
      [
        'What is the difference between MSW and a hosted mock API?',
        'MSW intercepts requests inside your app with handlers kept in your codebase, ideal for tests. A hosted mock is a real URL on the internet, so anything — another device, Postman, a teammate or a mobile app — can call it without code changes.',
      ],
      [
        'How do I simulate a slow or failing API?',
        'Return the status you want to test (401, 404, 429, 500) from a mock endpoint and add a delay of a few seconds. This exercises loading spinners, retries, timeouts and error messages without touching the real backend.',
      ],
      [
        'Can a mock API return different data per id?',
        'Yes. Define the path as /users/:id and put {{id}} in the body to echo the requested id. Add a literal path such as /users/999 to return a specific response, like a 404, for one id.',
      ],
    ],
    cta: ['/tools/api-mocker', 'Create a live mock API URL in seconds — free'],
  },
  {
    slug: 'csp-cors-security-headers-guide',
    title: 'CSP, CORS & Security Headers Explained: A Practical Guide (2026) | DoAide Code',
    h1: 'CSP, CORS and security headers, explained',
    description:
      'What Content-Security-Policy, CORS, HSTS and friends actually do, how to roll out a CSP without breaking your site, how to debug “blocked by CORS policy”, and how to store passwords with bcrypt — with free generators and testers.',
    updated: '2026-10-23',
    intro: `<p>Most web security incidents are not exotic zero-days. They are an injected script that a <strong>Content Security Policy</strong> would have blocked, an API that echoes any origin with credentials, or a password table hashed with plain SHA-256. All three are fixed with configuration you can write in an afternoon.</p>
<p>This guide explains the headers that matter, in the order you should add them, with the mistakes that trip teams up. Each section links a free tool that does the fiddly part for you: the <a href="/tools/csp-generator">CSP generator</a>, the <a href="/tools/cors-tester">CORS tester</a>, the <a href="/tools/nginx-config-generator">nginx config generator</a> and the <a href="/tools/bcrypt-generator">bcrypt generator</a>.</p>`,
    sections: [
      [
        'baseline',
        'The baseline every site should send',
        `<p>Four headers cost nothing and close whole classes of attacks:</p>
<pre><code>Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: frame-ancestors 'none'</code></pre>
<ul>
<li><strong>HSTS</strong> tells the browser to use HTTPS for your domain for a year, so a network attacker can’t downgrade the first request. Only send it over HTTPS, and only add <code>preload</code> once every subdomain supports HTTPS.</li>
<li><strong>nosniff</strong> stops the browser guessing a file is a script when the server says it is text.</li>
<li><strong>Referrer-Policy</strong> keeps full URLs — which can contain tokens — from leaking to other sites.</li>
<li><strong>frame-ancestors</strong> stops other sites framing yours for clickjacking. It replaces <code>X-Frame-Options</code>, though sending both is harmless for old browsers.</li>
</ul>
<p>In nginx there is one trap: a <code>location</code> block with its own <code>add_header</code> silently drops every <code>add_header</code> inherited from the server block. The <a href="/tools/nginx-config-generator">nginx config generator</a> repeats the security headers in those locations so they are never lost.</p>`,
      ],
      [
        'csp',
        'Content Security Policy: what it blocks',
        `<p>A CSP is an allow-list of where each kind of resource may come from. If an attacker injects <code>&lt;script src="https://evil.example/x.js"&gt;</code> into your page, the browser refuses to load it because that host is not in <code>script-src</code>.</p>
<pre><code>Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://www.googletagmanager.com;
  style-src 'self' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data:;
  connect-src 'self' https://api.example.com;
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests</code></pre>
<p><code>default-src</code> is the fallback for every fetch directive you don’t list. <code>base-uri</code>, <code>form-action</code> and <code>frame-ancestors</code> do <em>not</em> fall back to it, which is why a policy with only <code>default-src</code> still lets an injected <code>&lt;base&gt;</code> tag redirect your relative script URLs.</p>
<p>The directive that matters most is <code>script-src</code>. Two values undo most of its protection: <code>'unsafe-inline'</code> (any inline <code>&lt;script&gt;</code> or <code>onclick</code> runs — exactly what XSS injects) and broad sources like <code>https:</code> or <code>*</code>. Paste your current policy into the audit tab of the <a href="/tools/csp-generator">CSP generator</a> to see which of these you have.</p>`,
      ],
      [
        'nonces',
        'Nonces and hashes instead of unsafe-inline',
        `<p>You rarely need <code>'unsafe-inline'</code>. Two safer ways allow the inline code you wrote and nothing else:</p>
<ul>
<li><strong>Nonce</strong> — the server generates a random value on every response, puts it in the header (<code>script-src 'nonce-R4nd0m…'</code>) and on each tag (<code>&lt;script nonce="R4nd0m…"&gt;</code>). An attacker can’t guess it. Never reuse a nonce or put it in a cached page.</li>
<li><strong>Hash</strong> — for a fixed inline script, add <code>'sha256-…'</code> of its exact contents. Any change, even whitespace, changes the hash.</li>
</ul>
<p>Add <code>'strict-dynamic'</code> next to a nonce and scripts loaded by your trusted scripts are allowed too, which makes tag managers and bundlers with dynamic imports work without listing every host. The generator’s <em>Strict (nonce)</em> preset builds this policy, and its hash helper computes the <code>sha256</code> source for an inline block.</p>`,
      ],
      [
        'rollout',
        'Rolling out CSP without breaking production',
        `<ol>
<li>Start from a preset close to your stack and list the third parties you actually load (DevTools → Network, filter by domain).</li>
<li>Ship it as <code>Content-Security-Policy-Report-Only</code> with a <code>report-uri</code>. Nothing is blocked; violations are reported.</li>
<li>Browse every page type for a few days and fix or allow each legitimate violation.</li>
<li>Switch the header name to <code>Content-Security-Policy</code>. Keep the report endpoint to catch regressions.</li>
</ol>
<p>A <code>&lt;meta http-equiv="Content-Security-Policy"&gt;</code> tag works for static hosting where you can’t set headers, but browsers ignore <code>frame-ancestors</code>, <code>report-uri</code> and <code>sandbox</code> in it — the generator leaves those out of the meta version for you.</p>`,
      ],
      [
        'cors',
        'CORS: why the browser blocks your API call',
        `<p>CORS is not a security feature you add; it is the controlled <em>relaxation</em> of the same-origin policy. By default a page on <code>https://app.example.com</code> can send a request to <code>https://api.example.com</code> but cannot read the response. The API opts in by answering with <code>Access-Control-Allow-Origin</code>.</p>
<p>Some requests are <strong>preflighted</strong>: before the real request the browser sends <code>OPTIONS</code> asking permission. That happens for methods other than GET, HEAD and POST, for headers such as <code>Authorization</code> or <code>X-Api-Key</code>, and for a <code>Content-Type</code> other than form, multipart or <code>text/plain</code> — so every <code>fetch</code> that posts JSON is preflighted.</p>
<p>The rules people break most often:</p>
<ul>
<li><code>Access-Control-Allow-Origin: *</code> cannot be combined with credentials (cookies). Echo the exact origin, send <code>Access-Control-Allow-Credentials: true</code> and add <code>Vary: Origin</code>.</li>
<li>The header must contain one origin. A comma-separated list is invalid — check the request’s <code>Origin</code> against your allow-list and echo the match.</li>
<li><code>Access-Control-Allow-Headers: *</code> never covers <code>Authorization</code>; name it explicitly.</li>
<li>The preflight must return 2xx. An auth middleware that answers <code>OPTIONS</code> with 401 breaks every preflighted request.</li>
<li>Custom response headers such as <code>X-Total-Count</code> are invisible to JavaScript unless listed in <code>Access-Control-Expose-Headers</code>.</li>
</ul>
<p>Paste the response headers from DevTools into the <a href="/tools/cors-tester">CORS tester</a> and it runs these checks step by step, tells you which one fails, and writes the fixed config for nginx, Express, FastAPI or Apache. It never sends a request, so it works for localhost and private APIs.</p>`,
      ],
      [
        'passwords',
        'Storing passwords: bcrypt, cost and the 72-byte limit',
        `<p>Headers protect the browser; the database needs its own defence. Never store passwords encrypted or with a fast hash like SHA-256 — a GPU tries billions of those per second. Use a deliberately slow, salted password hash: <strong>Argon2id</strong> for new systems, or <strong>bcrypt</strong>, which every language and framework supports.</p>
<pre><code>$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW
 │   │  └ 22-char salt ─────┘└ 31-char hash ──────────────┘
 │   └ cost: 2^12 rounds
 └ version</code></pre>
<ul>
<li>Pick a cost where one hash takes about 250 ms on your server — usually 10 to 12 today — and raise it as hardware gets faster; rehash on next login.</li>
<li>bcrypt only uses the first 72 bytes of the password. Long passphrases, especially with multi-byte characters, can be silently truncated.</li>
<li><code>$2a$</code>, <code>$2b$</code> and <code>$2y$</code> are labels for the same algorithm; libraries verify all three.</li>
</ul>
<p>The <a href="/tools/bcrypt-generator">bcrypt generator</a> hashes in your browser and times each cost factor, so you can see what a step up costs before you change production.</p>`,
      ],
    ],
    faqs: [
      [
        'What is the best Content Security Policy for a website?',
        "A nonce-based policy: script-src 'nonce-…' 'strict-dynamic', object-src 'none', base-uri 'none' and frame-ancestors 'none'. It blocks injected scripts without listing every third-party host. Roll it out in Report-Only mode first.",
      ],
      [
        'How do I fix “No Access-Control-Allow-Origin header is present”?',
        'Change the server, not the frontend: return Access-Control-Allow-Origin with your page’s exact origin (or * for public, cookie-less APIs), and answer the OPTIONS preflight with 2xx plus Allow-Methods and Allow-Headers.',
      ],
      [
        'Is CORS a security feature?',
        'CORS relaxes the browser’s same-origin policy; it does not protect your API from curl, scripts or other servers. Authenticate and authorise every request on the server regardless of CORS.',
      ],
      [
        'Is bcrypt still safe in 2026?',
        'Yes, at a cost of 10–12 or higher. Argon2id is the stronger modern choice for new systems, but a well-configured bcrypt is far better than any fast hash such as SHA-256 or MD5.',
      ],
    ],
    cta: ['/tools/csp-generator', 'Build or audit your Content Security Policy — free'],
  },
  {
    slug: 'yaml-json-csv-xml-config-files',
    title: 'YAML vs JSON vs CSV vs XML: Converting Data & Config Files Safely (2026) | DoAide Code',
    h1: 'YAML, JSON, CSV and XML: converting data and config files safely',
    description:
      'When to use YAML, JSON, CSV or XML, the conversion traps that silently corrupt data (the Norway problem, leading zeros, base-60 ports), and how to validate docker-compose and .env files before they reach production.',
    updated: '2026-10-23',
    intro: `<p>Developers move data between formats constantly: a CSV export becomes JSON for an API, a JSON config becomes YAML for Kubernetes, a SOAP response becomes something readable. Each conversion is one line of code — and each has a trap that changes your data without an error.</p>
<p>This guide covers what each format is good at, the specific gotchas, and how to check the config files that most often break deployments. Every step has a free in-browser tool: <a href="/tools/csv-to-json">CSV to JSON/SQL</a>, <a href="/tools/yaml-to-json">YAML ↔ JSON</a>, the <a href="/tools/xml-formatter">XML formatter</a>, the <a href="/tools/docker-compose-validator">Docker Compose validator</a> and the <a href="/tools/env-diff">.env diff</a>.</p>`,
    sections: [
      [
        'which',
        'Which format for which job',
        `<ul>
<li><strong>JSON</strong> — the default for APIs and machine-to-machine data. Strict, unambiguous, no comments. Validate and pretty-print it with the <a href="/tools/json-formatter">JSON formatter</a>.</li>
<li><strong>YAML</strong> — configuration humans edit: Docker Compose, Kubernetes, GitHub Actions, Ansible. Comments, anchors and less punctuation, at the cost of whitespace-sensitive syntax and type guessing.</li>
<li><strong>CSV</strong> — tables: spreadsheet exports, bulk imports, analytics. Compact and universal, but no types and no nesting.</li>
<li><strong>XML</strong> — documents and older enterprise systems: SOAP, RSS, sitemaps, Office files, Android layouts. Verbose, but has attributes, namespaces and mature schema validation.</li>
</ul>`,
      ],
      [
        'csv',
        'CSV to JSON and SQL: quoting and types',
        `<p>“Split each line on commas” breaks on the first real file. RFC 4180 CSV allows commas, quotes and even newlines inside a field when it is wrapped in double quotes, with a literal quote written as <code>""</code>:</p>
<pre><code>id,name,notes
1,"Lee, Jordan","Said ""hi""
on two lines"</code></pre>
<p>Watch for three more traps:</p>
<ul>
<li><strong>Delimiters.</strong> European Excel exports use semicolons because the comma is the decimal separator; database dumps often use tabs.</li>
<li><strong>Leading zeros.</strong> Postcodes and product codes like <code>007</code> become <code>7</code> if every numeric-looking value is cast to a number. Keep them as strings.</li>
<li><strong>Big integers.</strong> IDs above 2<sup>53</sup> lose precision as JavaScript numbers. Keep them as strings too.</li>
</ul>
<p>The <a href="/tools/csv-to-json">CSV converter</a> detects the delimiter, follows the quoting rules, keeps codes and huge numbers as strings, and can emit <code>CREATE TABLE</code> plus batched <code>INSERT</code> statements with column types inferred from the data — handy for loading a spreadsheet into a database in one paste.</p>`,
      ],
      [
        'yaml',
        'YAML ↔ JSON: the Norway problem and friends',
        `<p>JSON is a subset of YAML 1.2, so JSON → YAML is safe. The other way round, YAML’s implicit typing decides what a plain value means:</p>
<pre><code>country: NO        # YAML 1.1: false   — YAML 1.2: "NO"
version: 1.10      # a float: 1.1
port_map: 22:22    # YAML 1.1: 1342 (base 60)
id: 0123           # YAML 1.1: octal 83</code></pre>
<p>Many tools still parse YAML 1.1 (PyYAML, older Go and Ruby libraries), so the safe habit is to <strong>quote anything that is not obviously a number or boolean</strong>: country codes, versions, port mappings, IDs with leading zeros.</p>
<p>Anchors (<code>&amp;base</code>), aliases (<code>*base</code>) and merge keys (<code>&lt;&lt;: *base</code>) remove repetition in YAML but have no JSON equivalent — a converter must expand them. Paste a file into the <a href="/tools/yaml-to-json">YAML ↔ JSON converter</a> to see exactly what a YAML 1.2 parser makes of it, with the line of any syntax error; multi-document files separated by <code>---</code> become a JSON array.</p>`,
      ],
      [
        'xml',
        'XML: well-formed is not the same as valid',
        `<p>A <strong>well-formed</strong> XML document follows the syntax rules: one root element, every tag closed and correctly nested, attribute values quoted, and <code>&amp;</code> and <code>&lt;</code> escaped in text. A <strong>valid</strong> document is well-formed <em>and</em> matches a schema (XSD or DTD). Most “invalid XML” errors are really well-formedness errors — an unescaped ampersand in a product name is the classic.</p>
<p>Converting XML to JSON needs conventions because XML has things JSON lacks: attributes become keys prefixed with <code>@</code>, repeated child elements become arrays, and text alongside child elements goes under <code>#text</code>. The <a href="/tools/xml-formatter">XML formatter</a> checks well-formedness with the line and column of the first error, pretty-prints or minifies, and converts to JSON using these conventions.</p>`,
      ],
      [
        'compose',
        'Validating docker-compose.yml before you deploy',
        `<p>Compose files fail at the worst time — during a deploy — and often silently: an unknown key such as <code>enviroment</code> is a typo that YAML accepts and older Compose versions ignored. Check these before every merge:</p>
<ul>
<li>Every service has an <code>image</code> or a <code>build</code>.</li>
<li>Port mappings are quoted strings: <code>"8080:80"</code>, or <code>"127.0.0.1:5432:5432"</code> to keep a database off the public interface.</li>
<li>Named volumes and custom networks are declared at the top level.</li>
<li><code>depends_on</code> points at real services, has no cycles, and <code>condition: service_healthy</code> targets a service with a healthcheck.</li>
<li>The top-level <code>version:</code> key is gone — the Compose Specification ignores it.</li>
<li>No <code>privileged: true</code>, <code>network_mode: host</code> or Docker socket mounts unless you really mean it.</li>
</ul>
<p>The <a href="/tools/docker-compose-validator">Docker Compose validator</a> runs all of these with line numbers and did-you-mean suggestions, without Docker installed. Run <code>docker compose config</code> on the server as the final check — it also resolves variables from your <code>.env</code>.</p>`,
      ],
      [
        'env',
        '.env files: catching the missing variable',
        `<p>The most common config outage is a variable that exists in development and not in production. Keep a committed <code>.env.example</code> with every key and no secret values, and compare it with each environment’s real <code>.env</code> before deploying:</p>
<pre><code># .env.example          # .env (production)
DATABASE_URL=           DATABASE_URL=postgres://…
STRIPE_SECRET_KEY=      STRIPE_SECRET_KEY=sk_live_…
SENTRY_DSN=             (missing!)</code></pre>
<p>Dotenv syntax has quirks of its own: <code>export</code> prefixes, quoted multi-line values such as private keys, <code>#</code> starting a comment only after whitespace in unquoted values, and duplicate keys where the later one wins. The <a href="/tools/env-diff">.env diff tool</a> parses both files with these rules, lists missing, extra and changed keys with values masked, and generates a clean <code>.env.example</code> from your real file. It runs entirely in your browser, but treat production secrets with care in any tool.</p>`,
      ],
    ],
    faqs: [
      [
        'How do I convert CSV to JSON?',
        'Paste the CSV into code.doaide.com/tools/csv-to-json. With a header row each line becomes an object keyed by column name; quoted fields, semicolon or tab delimiters and number/boolean typing are handled automatically.',
      ],
      [
        'Why does YAML turn NO into false?',
        'YAML 1.1 treats yes/no/on/off as booleans, so the country code NO becomes false. YAML 1.2 only recognises true and false, but many parsers still follow 1.1 — quote such values to be safe.',
      ],
      [
        'What is the difference between well-formed and valid XML?',
        'Well-formed XML follows the syntax rules (one root, matched tags, quoted attributes, escaped special characters). Valid XML is well-formed and also conforms to a schema such as an XSD or DTD.',
      ],
      [
        'How do I check a docker-compose file for errors?',
        'Paste it into a Compose validator to catch YAML errors, unknown keys, bad ports and undeclared volumes or networks, then run docker compose config on the target machine, which also resolves environment variables.',
      ],
    ],
    cta: ['/tools/csv-to-json', 'Convert CSV, JSON, YAML and XML in your browser — free'],
  },
]
