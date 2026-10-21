"""Quick checks on an answer before it is shown as done.

- Completeness: empty or cut-off answers, unbalanced code fences, "I can't see the file"
  replies, and edit requests answered without any code. An incomplete answer is retried once
  with more context on the next executor up (see runner.py).
- Capability claims: DoAide runs on the user's laptop and reads their files, so an answer saying
  it cannot access the user's files, folders or code is wrong however fluent it is.
- Relevance: the answer must mention what the request names (files, functions, backticked
  identifiers) and share some of its words; canned refusals count as off topic. Used to decide
  whether a free local answer is good enough or the task goes to Claude (runner.py).
- Code: fenced Python / JSON / JavaScript blocks must parse (syntax only: snippets often use
  names defined elsewhere). Proposed edits are checked separately by changes.py: the file must
  exist, the SEARCH text must match, and the result must pass syntax and ruff checks.

Results go into the reply's meta as `checks` and show under the answer in the UI.
"""

from __future__ import annotations

import json
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any

from .changes import _run, parse_edits

_FENCE = re.compile(r"^```([\w+-]*)[^\n]*\n(.*?)^```", re.M | re.S)
_NEEDS_FILES = re.compile(
    r"\b(?:i (?:don't|do not|cannot|can't|am unable to) (?:see|access|view|read|find) (?:the|your|this|that) "
    r"(?:file|code|project|repo|source|function|implementation)|"
    r"(?:please|could you) (?:provide|share|paste|send) (?:the|your|me|more)|without (?:seeing|access to) the (?:code|file)|"
    r"i (?:would )?need (?:to see|more (?:context|information|details))|not (?:provided|included) in the context|"
    # Live (qwen2.5-coder:7b, "what files are in frontend/src/components/?"): three of ten files,
    # then "Other files not shown in the provided snippet."
    r"not (?:shown|visible|included) in the (?:provided |given |shared )?(?:snippet|excerpt|context|code|files?)|"
    r"other (?:files?|parts?|code) (?:are |is )?not (?:shown|visible|included)|i can only see|"
    r"(?:limited|partial) view of (?:the|your|this)|only (?:part|some) of the (?:file|code|project|director(?:y|ies)) (?:is|was) (?:shown|provided|visible))",
    re.I,
)
# What a request names: a file, a call, a backticked identifier, a snake_case or camelCase name.
_NAMED = re.compile(r"`([^`\s]{2,60})`|\b([\w-]+\.[a-z]{1,5})\b|\b(\w{2,})\(\)|\b([a-z]+_[a-z0-9_]+|[a-z]+[A-Z]\w*|[A-Z][a-z0-9]+[A-Z]\w*)\b")
_WORD = re.compile(r"[A-Za-z][A-Za-z']{3,}")
_STOPWORDS = frozenset(
    "about above after again also another back been before being below between both cannot could does doing down "
    "during each even ever every from have having here how into just know like make many more most much must need "
    "only other over please same should show some such tell than that their them then there these they thing this "
    "those through under until upon very want were what when where which while will with within without would your "
    "code file files using use used help write give find".split()
)
_REFUSAL = re.compile(r"\b(?:as an ai(?: language model)?|i'?m (?:sorry|afraid),? (?:but )?i (?:can'?t|cannot))\b", re.I)
_NO_ACCESS = re.compile(
    r"\b(?:i|we)\s+(?:can(?:no|['’])?t|cannot|am\s+(?:not\s+able|unable)\s+to|(?:do|does)(?:n['’]t|\s+not)\s+have"
    r"\s+(?:the\s+ability\s+to|(?:direct\s+)?access\s+to))\s+(?:directly\s+)?(?:(?:access|read|see|view|browse|open)\s+)?"
    r"(?:to\s+)?(?:any\s+of\s+)?(?:your|the\s+user['’]?s|local)\s+(?:local\s+)?(?:files?|folders?|director(?:y|ies)|code(?:base)?"
    r"|projects?|computer|machine|file\s*system|disk)\b"
    r"|\b(?:can(?:no|['’])?t|cannot|unable\s+to)\s+(?:access|read|open|see)\s+(?:any\s+)?files\s+(?:on|in|from)\s+your\b",
    re.I,
)
# Live (qwen2.5-coder:7b): "I'm sorry, but I don't have access to the user's system environment or
# project configuration files". A few words may sit between "access to your" and what is named.
_NO_ACCESS_TO = re.compile(
    r"\b(?:i['’]m\s+(?:not\s+able|unable)\s+to|(?:i|we)\s+(?:do(?:n['’]t|\s+not)\s+have|have\s+no|can(?:no|['’])?t|cannot"
    r"|am\s+(?:not\s+able|unable)\s+to))"
    r"\s+(?:direct\s+)?access\s+(?:to\s+)?(?:your|the\s+user['’]?s|this|the|local)\s+(?:[\w-]+\s+){0,4}?"
    r"(?:files?|folders?|director(?:y|ies)|code(?:base)?|projects?|repo(?:sitory)?|environment|system|config(?:uration)?s?"
    r"|computer|machine|laptop|file\s*system|disk)\b",
    re.I,
)
NO_ACCESS_REASON = "the answer says DoAide cannot access your files, but it can"
NEEDS_FILES_REASON = "the model said it could not see the code it needed"
# A list cut short: a few items, then a wave at the rest ("the remaining files are similar",
# "... (7 more)"). Anywhere in the answer: the cut comes after the items, often past 600 characters.
_PARTIAL = re.compile(
    r"\b(?:the\s+)?(?:remaining|rest\s+of\s+the|other)\s+(?:files?|items?|entries|ones|folders?|functions?|methods?|"
    r"classes|tests?|routes?|endpoints?|components?|modules?)\s+(?:are|is|look|follow)\s+(?:(?:very|all|much|pretty)\s+)?"
    r"(?:similar|the\s+same|alike)|"
    r"\bthe\s+rest\s+(?:follows?|are|is|looks?)\s+(?:(?:all|very|much)\s+)?(?:the\s+same|similar)|"
    r"\bi(?:'ll|\s+will)\s+skip\s+the\s+rest\b|\bskipping\s+the\s+rest\b|"
    r"\b(?:omitted|truncated|skipped|left\s+out)\s+for\s+brevity\b|"
    # "and so on" as a list's last item, or straight after backticked items; not "retries, timeouts and so on".
    r"^\s*(?:[-*•]|\d+\.)?\s*(?:\.\.\.|…)?\s*(?:and\s+so\s+on|etc)\b[.…]*\s*$|`[^`\n]+`,?\s+(?:and\s+so\s+on|etc)\b|"
    # A bare "- ..." item; "... (7 more)", "(+7 more)", "...and 7 more", "and 7 more files".
    r"^\s*[-*•]\s*(?:\.\.\.|…)\s*$|"
    r"\((?:\+|and\s+)?\d+\s+more\b[^)]*\)|(?:\.\.\.|…)\s*(?:and\s+|\+)?\d+\s+more\b|"
    r"\band\s+\d+\s+more\s+(?:files?|items?|entries|folders?|functions?|methods?|classes|tests?|routes?|endpoints?)\b",
    re.I | re.M,
)
PARTIAL_REASON = "it listed only some of the items and skipped the rest"
_CLAIMS_CHANGE = re.compile(
    r"^(?:i(?:'ve| have)?\s+)?(?:updated|added|changed|renamed|fixed|modified|removed|implemented|refactored)\b"
    r"|^[\w ]{0,40}\b(?:updated|changed|modified|extended)\s+to\s+(?:accept|support|handle|use|include|return|allow)\b",
    re.I,
)
CUT_OFF_EDIT = "an edit block was cut off"
NO_EDIT = "no code or edit was proposed"
# Incomplete answers a model fixes when told what was wrong (not missing context or a refusal).
FORMAT_SLIPS = {CUT_OFF_EDIT}
_EDIT_KINDS = {"edit", "test", "debug"}
_LANGS = {"python": ".py", "py": ".py", "json": ".json", "javascript": ".js", "js": ".js", "mjs": ".js"}


def capability_claim(answer: str) -> str | None:
    """Why the answer misstates what DoAide can do, or None."""
    head = answer[:1500]
    return NO_ACCESS_REASON if _NO_ACCESS.search(head) or _NO_ACCESS_TO.search(head) else None


def incomplete_reason(answer: str, kind: str, *, reads_files: bool = False) -> str | None:
    """Why the answer looks unfinished, or None when it looks complete.

    `reads_files`: the model searched the project itself (Claude, Codex). "I can't find X" from
    it is a finding (X is not there), not missing context, and another model would find the same."""
    text = answer.strip()
    if not text:
        return "empty answer"
    if text.count("```") % 2:
        return "a code block was left open"
    # More SEARCH markers than REPLACE ones; an extra REPLACE (used as the divider) parses.
    if text.count("<<<<<<< SEARCH") > text.count(">>>>>>> REPLACE"):
        return CUT_OFF_EDIT
    if not reads_files and _NEEDS_FILES.search(text[:600]):
        return NEEDS_FILES_REASON
    if not reads_files and _PARTIAL.search(text):
        return PARTIAL_REASON
    if kind in _EDIT_KINDS and "```" not in text and not parse_edits(text) and len(text) < 400:
        return NO_EDIT
    if _CLAIMS_CHANGE.match(text) and "```" not in text and not parse_edits(text) and len(text) < 400:
        # Live: "Usage RE updated to accept 'what calls X' questions." with no edit at all.
        return "it says it changed code but shows no edit"
    if kind not in {"math", "question"} and len(text) < 25:
        return "answer too short"
    return None


def early_problem(partial: str) -> str | None:
    """A problem visible while a local answer is still streaming that no retry of the same model
    would fix (a refusal, or a request for files it was not shown): stop it and escalate now."""
    head = partial[:600]
    if _REFUSAL.search(head[:300]):
        return "the model declined to answer"
    if _NEEDS_FILES.search(head):
        return NEEDS_FILES_REASON
    return capability_claim(head)


# Sections models append that the user did not ask for ("## Explanation of Changes", "**Notes:**")
# and the "Sure, here is..." opener. Replies are a short summary; the code is in the files.
_EXTRA_HEADING = re.compile(
    r"^(?:#{1,6}\s*|\*\*)(?:explanation(?: of (?:the )?changes)?|changes made|summary of changes|how it works|"
    r"notes?|usage|example usage|key points|in summary|conclusion|file:\s*\S+)\b.*$",
    re.I | re.M,
)
_OPENER = re.compile(r"^\s*(?:(?:sure|certainly|of course|absolutely)[,!.]?\s+)?(?:here(?:'s| is)|below is)\s+", re.I)
_HEADING = re.compile(r"^(?:#{1,6}\s|\*\*[^*\n]+\*\*:?\s*$)")


# Preamble and sign-offs non-technical users read as noise ("Great question! Based on the provided
# code, ..." / "Let me know if you have any other questions!").
_LEAD_IN = re.compile(
    r"^\s*(?:(?:great|good) question|sure( thing)?|certainly|of course|absolutely|okay|ok|alright)[!.,]\s*|"
    r"^\s*(?:to answer your question|based on the (?:provided |given |shown )?(?:code|files?|context|project)|"
    r"looking at the (?:provided |given )?(?:code|files?|project)|after (?:reviewing|looking at) the (?:code|files?)),\s*",
    re.I,
)
_SIGN_OFF = re.compile(
    r"(?:^|(?<=[.!?:)`]))\s*(?:let me know if|i hope (?:this|that) helps|hope (?:this|that) helps|feel free to|happy to help|"
    r"if you (?:have|need) (?:any )?(?:other|more|further|additional) )[^\n]*$",
    re.I,
)


def _without_filler(text: str) -> str:
    """The reply without a lead-in ("Sure! Here is...", "Based on the code, ...") or a closing offer
    of more help; unchanged when nothing else would remain."""
    out = text
    for _ in range(3):
        m = _LEAD_IN.match(out) or _OPENER.match(out)
        if not m or not out[m.end() :].strip():
            break
        out = out[m.end()].upper() + out[m.end() + 1 :]
    if "```" not in out[-200:]:
        out = _SIGN_OFF.sub("", out).rstrip()
    return out if out.strip() else text


def trim_reply(text: str) -> str:
    """The reply without filler: the lead-in and sign-off, and explanation-style sections (their
    heading up to the next heading or code fence). A "## File: path" heading line alone is dropped."""
    text = _without_filler(text)
    out: list[str] = []
    skipping = False
    for line in text.splitlines():
        if m := _EXTRA_HEADING.match(line.strip()):
            # "## File: app.py" only labels the code under it; the others start filler.
            skipping = not m.group(0).lower().lstrip("#* ").startswith("file")
            continue
        if skipping and (line.startswith("```") or _HEADING.match(line) or ">>>>>>> REPLACE" in line or "<<<<<<< SEARCH" in line):
            skipping = False
        if not skipping:
            out.append(line)
    trimmed = re.sub(r"\n{3,}", "\n\n", "\n".join(out).strip())
    return _without_plans(trimmed) or text.strip()


# A model narrating its next step ("Now I'll modify failing_tests to...", "I'll add a dedicated test
# right after the existing one."): live Sonnet replies opened with it, then said the change again.
_PLAN = re.compile(r"(?:^|[.!:]\s+)(?:(?:now|first|next|so|then),?\s+)?(?:i'll|i will|i'm going to|let me|let's)\s", re.I)


def _without_plans(text: str) -> str:
    """The reply without short paragraphs narrating what the model is about to do, when another
    paragraph (the summary of what changed) remains; code blocks are left alone."""
    paragraphs = re.split(r"\n\s*\n", text)
    if len(paragraphs) < 2 or "```" in text:
        return text
    kept = [p for p in paragraphs if not (len(p) < 500 and _PLAN.search(p))]
    return "\n\n".join(kept) if kept else text


def off_topic_reason(prompt: str, answer: str) -> str | None:
    """Why the answer does not seem to address the request, or None when it does."""
    text = answer.lower()
    if _REFUSAL.search(answer[:300]):
        return "the model declined to answer"
    words = {w.lower() for w in _WORD.findall(prompt)} - _STOPWORDS
    # Prefix match, so "sorting" in the request meets "sorted" in the answer.
    shared = sum(w[:5] in text for w in words)
    named = {next(g for g in m.groups() if g) for m in _NAMED.finditer(prompt)}
    stems = {n.rsplit("/", 1)[-1].lower() for n in named}
    if stems and shared < 2 and not any(s in text or s.rsplit(".", 1)[0] in text for s in stems):
        return f"the answer never mentions {sorted(named)[0]}"
    if len(words) >= 3 and not shared:
        return "the answer shares no words with the request"
    return None


async def check_code_blocks(answer: str) -> list[dict[str, Any]]:
    """Syntax checks on fenced code in the answer (edit blocks excluded)."""
    results: list[dict[str, Any]] = []
    blocks = [(lang.lower(), body) for lang, body in _FENCE.findall(answer) if lang.lower() in _LANGS]
    for n, (lang, body) in enumerate(blocks, 1):
        if "<<<<<<< SEARCH" in body or body.lstrip().startswith((">>>", "$ ")):
            continue
        problem = await _syntax(_LANGS[lang], body)
        label = f"{lang} block {n}" if len(blocks) > 1 else f"{lang} block"
        results.append({"name": label, "ok": problem is None, "detail": problem or "parses"})
    return results


async def _syntax(suffix: str, code: str) -> str | None:
    if suffix == ".py":
        try:
            compile(code, "snippet.py", "exec")
        except SyntaxError as exc:
            return f"line {exc.lineno}: {exc.msg}"
        return None
    if suffix == ".json":
        try:
            json.loads(code)
        except json.JSONDecodeError as exc:
            return f"line {exc.lineno}: {exc.msg}"
        return None
    if (node := shutil.which("node")) is None:
        return None
    with tempfile.NamedTemporaryFile("w", suffix=".mjs", delete=False) as fh:
        fh.write(code)
    try:
        code_, out = await _run([node, "--check", fh.name])
    finally:
        Path(fh.name).unlink(missing_ok=True)
    if not code_:
        return None
    return next((line.strip() for line in out.splitlines() if "Error" in line), "syntax error")


def edit_checks(summary: dict[str, Any] | None) -> list[dict[str, Any]]:
    """One check line for a proposed changeset: targets found, and the files' own checks."""
    if not summary:
        return []
    files = summary.get("files") or []
    problems = list(summary.get("problems") or []) + [p for f in files for p in f.get("problems") or []]
    count = f"{len(files)} file{'s' if len(files) != 1 else ''}"
    if problems:
        return [{"name": "edits", "ok": False, "detail": f"{count}; {len(problems)} problem(s): {problems[0]}"}]
    return [{"name": "edits", "ok": True, "detail": f"{count}; every target found, syntax and lint clean"}]
