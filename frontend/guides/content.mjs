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
    ['/guides', 'Guides'],
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
]
