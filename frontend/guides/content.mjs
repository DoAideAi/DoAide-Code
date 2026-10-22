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
]
