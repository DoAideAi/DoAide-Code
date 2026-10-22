# Hacker News Launch Post — DoAide Code

Submit as **Show HN** with the URL, then immediately post the text below as the
first comment. Best time: weekday morning US Eastern (≈ 7–9 AM ET). Hang around
for 4–6 hours to answer everything.

---

## Title

Show HN: Free AI code review, explain, convert and tests – no sign-up

(≤ 80 chars. Alternates:
- Show HN: DoAide Code – 12 free code tools, no account, plus a keyless API
- Show HN: A multi-model harness that routes coding tasks to the cheapest model)

## URL

https://code.doaide.com/tools

## First comment (maker's note)

Hi HN — I built DoAide Code after noticing that the AI coding tasks I do most
often (review this function, explain this code, write tests for this) are all
30-second tasks, and every tool wanted an account, an extension, or a
subscription before doing them.

What it is:

- Seven paste-in AI tools: code review (findings by severity, with fixes),
  explain, find bugs, add comments, convert between ~17 languages, optimize,
  and generate unit tests. No account; fair-use rate limits (8 requests per
  10 minutes per IP).

- Five utilities that run entirely client-side — diff checker, formatter,
  regex tester, JSON viewer, embeddable snippets. Nothing is uploaded.

- A free REST API with no key: one POST endpoint, same actions, Markdown out.
  The docs include a pre-commit hook recipe people seem to like:
  https://code.doaide.com/api-docs

The part I find technically interesting is the full assistant behind it: a
multi-model harness. A router scores each message and picks the cheapest
executor that can handle it — tier 0/1 tasks go to local Ollama models
(qwen2.5-coder 7B/32B), tier 2 goes to Claude Sonnet or Codex CLI, and only
the hardest tasks reach Opus. If an executor fails before producing anything,
the harness escalates and falls back. In practice most day-to-day tasks never
leave the laptop, which is both the cost story and the privacy story: the
agent edits your working directory locally and you review the diff with
ordinary git.

Honest limitations:

- The paste-in tools see only what you paste — great for privacy, but it
  means no whole-repo context in the free tools (that's what the local
  assistant is for).
- No autocomplete. It checks and transforms code; it doesn't type for you.
- The AI tools call a server-side model, so unlike the utilities they do
  send the pasted snippet over the wire.
- Rate limits are real; it's built for interactive use, not batch.

Stack: FastAPI + SQLite on a single Hetzner box, React/Vite/Tailwind front
end, static-rendered SEO pages, Caddy. The free tools are served by the same
small server as everything else.

Would love feedback on review quality (paste something you actually shipped),
and happy to answer anything about the router/fallback design.

## Prep notes

- Expect (and welcome) these questions:
  - "What happens to pasted code?" → processed to produce the answer, counted
    in aggregate, not used for training; don't paste secrets.
  - "Why would I use this over ChatGPT?" → no account, tuned prompt per task,
    consistent structured output, utilities beside it, one URL per tool.
  - "Business model?" → free tools are the top of funnel for the assistant;
    routing keeps serving costs near zero.
  - "Local models' quality?" → that's the point of tiering: local models only
    get tasks they handle well; the router escalates the rest.
- Don't ask for upvotes anywhere. Don't post the HN link on social asking for
  votes (HN penalizes it). Sharing "I'm on HN answering questions" is fine.
