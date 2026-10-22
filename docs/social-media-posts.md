# Social Media Posts — DoAide Code

Ready-to-post copy for Twitter/X, LinkedIn and Reddit. One platform per section;
don't cross-post the same text verbatim on the same day.

---

## Twitter / X

### Launch thread (7 tweets)

**1/**
I got tired of AI code tools that want your email before they'll look at your code.

So I built DoAide Code: 12 free developer tools, zero sign-up.

Paste code → get a senior-style review, explanation, bug hunt, conversion, or a full test suite.

code.doaide.com/tools 🧵

**2/**
The AI tools (7):
🔍 Code review — correctness, security, perf, with fixes
📖 Explain code — plain English, step by step
🐛 Find bugs — the input that breaks it + the fix
💬 Add comments
🔁 Convert between 17 languages
⚡ Optimize
🧪 Generate unit tests

**3/**
The utilities (5) run 100% in your browser — nothing is uploaded:
↔️ Diff checker
🎨 Code formatter
🔤 Regex tester (live matches as you type)
🌳 JSON formatter & validator
📦 Embeddable code widgets for your blog

**4/**
There's also a free REST API. No key.

curl -s https://code.doaide.com/api/public/code-tool \
  -d '{"action":"review","code":"def avg(n): return sum(n)/len(n)"}'

People wire it into pre-commit hooks so every commit gets reviewed. Docs: code.doaide.com/api-docs

**5/**
Under the hood is a multi-model harness: every task goes to the cheapest model that can handle it.

Free local models (Ollama) answer first. Claude only gets the hard tasks.

Your repo never leaves your laptop — the assistant edits files locally and you review the diff.

**6/**
Honest limits:
• fair-use rate caps (8 AI requests / 10 min)
• 12k-char snippets, not whole repos
• no autocomplete — it reviews code, it doesn't type for you

It's the checking layer, not the typing layer. Use it next to whatever writes your code.

**7/**
Everything is free and nothing asks for an account:

🔧 code.doaide.com/tools
📚 guides: code.doaide.com/guides
🔌 API: code.doaide.com/api-docs

If you try one thing, make it the code review. RTs appreciated 🙏

### Single tweets (evergreen, rotate)

- Your code has bugs you can't see because you wrote it. Paste it here, no sign-up: code.doaide.com/tools/find-bugs
- "Convert this Python to Java" — without the part where the converter writes Java like a Python dev: code.doaide.com/tools/convert-code
- Empty test file? Paste the function, get pytest/JUnit/Jest with edge cases included: code.doaide.com/tools/generate-tests
- Free AI code review in your browser. No account. No extension. No "start your trial". code.doaide.com/tools/code-review
- We put the whole thing behind a free API with no key. Pre-commit hook recipe in the docs: code.doaide.com/api-docs

---

## LinkedIn

### Launch post

**Every developer should get code review. Most don't.**

Solo developers, students, and small teams ship code nobody else ever reads. Code review — the single highest-leverage quality practice we know — is effectively a privilege of big teams.

That's the gap DoAide Code closes. It's a set of 12 free developer tools at code.doaide.com — no sign-up, no extension, no trial:

→ AI code review with severities and fixes, like a careful senior engineer
→ Explain any code in plain English (gold for onboarding and learning)
→ Find bugs: the exact input that breaks a function, and the fix
→ Convert code between 17 languages, idiomatically
→ Generate unit test suites — happy path, edge cases, error handling
→ Plus browser-only utilities: diff, formatter, regex tester, JSON viewer

For engineering teams there's a free REST API (no key) that slots into pre-commit hooks and CI — so the mechanical first pass of review is done before a human ever looks at the PR. Human reviewers get to spend their attention on design, not missing null checks.

And for the privacy question every engineering leader asks: the paste-in tools see only the snippet you choose to paste, the utilities run entirely in the browser, and the full assistant works on local clones — your repo stays on your machine.

Try the review tool on the gnarliest function you shipped this week: code.doaide.com/tools/code-review

What would you add to the toolkit? 👇

#SoftwareEngineering #AI #DeveloperTools #CodeReview #OpenTools

### Short follow-up post (1–2 weeks later)

The most common question about DoAide Code: "What's the catch? Why free, no sign-up?"

No catch — the economics work because of routing. Every task goes to the cheapest model that can handle it: free local models first, premium models only for genuinely hard tasks. Most review/explain/test tasks don't need a frontier model, so most tasks cost (almost) nothing to serve.

That's also the product thesis: the future of AI tooling isn't "one giant model for everything", it's routing the right task to the right model.

code.doaide.com — free AI code review, explain, convert, tests. No account.

---

## Reddit

**Rules: one subreddit per day, genuinely engage with comments, never copy-paste
the same post across subs the same week. Lead with the story or the problem, not the link.**

### r/SideProject — "I built 12 free AI code tools that don't ask for your email"

I kept hitting the same wall: every "free" AI code tool wants an account, an editor extension, or a trial card before it'll look at 20 lines of code.

So I built DoAide Code — 12 developer tools that work the way online tools used to: open URL, paste, done.

- 7 AI tools: code review, explain, find bugs, add comments, convert between languages, optimize, generate unit tests
- 5 utilities that run entirely in the browser: diff checker, formatter, regex tester, JSON viewer, embeddable snippets
- A free REST API with no key — people run it in pre-commit hooks

The economics work because of multi-model routing: free local models handle most tasks, premium models only get the hard ones.

It's free with fair-use rate limits (8 AI requests / 10 min). Would love brutal feedback on the review quality: code.doaide.com/tools

### r/webdev — "Free AI code review with no sign-up — looking for feedback on review quality"

I run a free AI code review tool (code.doaide.com/tools/code-review) and I'm trying to make the reviews genuinely senior-quality, not "consider adding comments" noise.

Current output: findings grouped by severity (correctness → security → performance → readability), each with the failing input where relevant and a concrete fix. There's also a diff checker, regex tester, JSON viewer and test generator next to it, all free/no account.

If you paste in a function you actually shipped, I'd love to know: did it catch anything real? Did it miss something a human reviewer flagged? Trying to tune signal-to-noise and real-world misses are the best data.

### r/learnprogramming — "How I'd use free AI tools to learn faster (not cheat): explain → review → test"

After watching a lot of beginners use AI badly (paste assignment, submit output, learn nothing), here's the loop that actually teaches:

1. **Explain before you copy.** Any code you didn't write — tutorial, Stack Overflow, AI output — run it through an explain tool first. If the explanation has a term you don't know, that's your next lesson.
2. **Review after it works.** "It runs" is the beginning. An AI review tells you what a senior would say — unhandled empty inputs, bad names, duplicated logic. Fix findings by hand, re-run, repeat.
3. **Generate tests to learn edge cases.** Look at what the generated suite checks that you didn't: empty lists, zero, negatives, huge inputs. That's edge-case thinking forming.

I built a free, no-sign-up set of tools for exactly this loop (code.doaide.com/tools — explain, review, find-bugs, test generator), but the loop works with any tools. The 15-minute rule still applies: struggle first, then ask.

### r/india / r/developersIndia — "Built 12 free AI code tools — no login, works on college lab PCs and locked-down office laptops"

Most AI coding tools fail in two very Indian situations: the college lab PC where you can't install anything, and the office laptop where IT blocks extensions and sign-ups.

DoAide Code is just URLs: code.doaide.com/tools. Paste code → AI review / explain / find bugs / convert between languages / generate unit tests. Plus diff, regex, JSON and formatter utilities that run fully in the browser. Free, no account, fair-use limits.

Built it as part of DoAide (same family as the GST/tax/resume tools some of you may have used). Feedback welcome — especially from students: what would make this more useful for placements prep?

---

## Posting cadence (first two weeks)

| Day | Platform | Content |
|---|---|---|
| D1 (Tue) | Product Hunt + X | PH launch + launch thread |
| D1 | LinkedIn | Launch post (link to PH in comments) |
| D2 | r/SideProject | Side project story |
| D4 | X | Single tweet: code review |
| D5 | r/webdev | Review-quality feedback ask |
| D8 | X | Single tweet: test generator |
| D9 | r/learnprogramming | Learning-loop post |
| D11 | LinkedIn | "Why free" follow-up |
| D12 | r/developersIndia | India-angle post |
| D14 | HN | Show HN (see docs/hackernews-post.md) |
