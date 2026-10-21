"""Task classifier: score how hard a request is and route it to the cheapest capable model.

Tiers (see router.py and executors/__init__.py):
  0  simple   math, basic questions, short explanations         -> Ollama, small fast model (free)
  1  medium   explain code, small edits, debugging, tests        -> Ollama, best local coder model (free)
  2  complex  multi-file changes, large refactors, new features  -> Claude Sonnet (Codex as alternative)
  3  hardest  architecture, security, concurrency (score >= 12)   -> Claude Opus

The score is a sum of weighted signals, so one strong signal ("architecture") or several weak
ones ("refactor" + three files + a long request) both push a task up. Every signal that fired is
kept as a reason, so the UI can say why a model was chosen.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

# (weight, kind, pattern). Kinds: question, explain, edit, debug, test, review, design.
_SIGNALS: list[tuple[float, str, re.Pattern[str]]] = [
    (9, "design", re.compile(r"\b(architect\w*|system design|design (?:a|the|our) (?:system|service|architecture)|"
                             r"threat model|security (?:review|audit)|vulnerab\w*|race conditions?|deadlocks?|"
                             r"concurrency bug|distributed|scalab\w*|rewrite (?:the|our) (?:entire|whole))\b", re.I)),
    (6, "design", re.compile(r"\b(trade-?offs?|which (?:approach|architecture|database|framework) should|"
                             r"migrat\w+ (?:the|our|from|to)|performance (?:review|audit|deep dive))\b", re.I)),
    (5, "edit", re.compile(r"\b(refactor\w*|restructur\w*|new feature|add (?:a |an )?(?:new )?(?:endpoint|feature|page|"
                           r"service|module)|build (?:a|an|the)|implement (?:a|an|the) (?:feature|system|service))\b", re.I)),
    # Scope: work that spans many files.
    (4, "edit", re.compile(r"\b(multi-?file|across (?:the|all|every|multiple)|(?:whole|entire) (?:codebase|project|repo)|"
                           r"every (?:file|module)|all (?:the )?files|end-to-end)\b", re.I)),
    # Not "why is/does": "why is X a constant?" asks for a reason; a failure says fail, error, wrong...
    (3, "debug", re.compile(r"\b(debug\w*|traceback|stack ?trace|exception|crash\w*|fails?|failing|failed|"
                            r"broken|doesn'?t work|not working|wrong|bug|error|investigate)\b", re.I)),
    # Verbs, not function names: "explain add()" is not an edit.
    (3, "edit", re.compile(r"\b(fix|implement|add|change|modify|update|rename|replace|remove|delete|edit|convert|"
                           r"optimi[sz]e|make (?:the|it|this))\b(?!\s*\()", re.I)),
    (3, "test", re.compile(r"\b(write (?:a |some )?tests?|unit tests?|test cases?|add tests?|coverage)\b", re.I)),
    (3, "review", re.compile(r"\b(review|recent changes|what changed|my changes|the diff|last commit|uncommitted)\b", re.I)),
    (3, "explain", re.compile(r"\b(explain|walk me through|how does .+ work|summari[sz]e)\b", re.I)),
]
# Pure questions with no project work in them (also after "In app/x.py, ...").
_QUESTION = re.compile(r"^\s*(?:in [^,?]+,\s*)?(what|how|why|when|is|are|can|does|do|which|who|define|difference between)\b", re.I)
_WHY = re.compile(r"^\s*(?:in [^,?]+,\s*)?why\b", re.I)
# "calculate"/"compute" only with a number in the request: "what does charge() compute" is code.
_MATH = re.compile(r"^[\s\d+\-*/%^().,=?x×÷]+$|\b(?:calculate|compute)\b(?=.*\d)|\b(convert \d|how much is|what is \d)", re.I)
_FILE_REF = re.compile(r"[\w./-]+\.(?:py|js|jsx|ts|tsx|go|rs|java|kt|swift|rb|php|c|h|cpp|cs|vue|svelte|sql|sh)\b")
_TRACEBACK = re.compile(r"Traceback \(most recent call last\)|^\s+at .+\(.+:\d+:\d+\)|File \".+\", line \d+|"
                        r"\w+Error: |error\[E\d+\]|panic:", re.M)
_DIFF_REQUEST = re.compile(r"\b(recent changes?|what (?:did i|i) change|what changed|my changes|the diff|git diff|"
                           r"uncommitted|staged|last commit|review (?:my|the|these) changes|before i commit)\b", re.I)

# Signs a request is about this project rather than general knowledge: a file path, a code
# identifier (snake_case, camelCase, dotted, call or backticks), or words pointing at the codebase.
_PROJECT = re.compile(
    r"[\w-]+\.[a-z]{1,5}\b|`[^`]+`|\b[a-z]+_[a-z0-9_]+\b|\b[a-z]+[A-Z]\w*\b|\b[A-Z][a-z0-9]+[A-Z]\w*\b|\b\w+\(\)|"
    r"\b(?:this|our|my|the) (?:project|repo|codebase|code|app|server|backend|frontend|module|function|file|tests?)\b|"
    r"\b(?:where (?:is|are|do)|in (?:here|this)|we (?:use|have))\b"
)

TIER_THRESHOLDS = (3, 7, 12)  # score >= 3: medium, >= 7: complex, >= 12: hardest


@dataclass(frozen=True)
class TaskProfile:
    score: float
    tier: int
    kind: str
    reasons: tuple[str, ...] = field(default_factory=tuple)
    # Context the request needs beyond the ranked files.
    wants_diff: bool = False
    has_error: bool = False
    # False for general-knowledge questions: they get no project files (faster and cheaper).
    about_project: bool = True


def classify_task(prompt: str) -> TaskProfile:
    text = prompt.strip()
    score = 0.0
    reasons: list[str] = []
    kinds: dict[str, float] = {}
    spans: list[tuple[int, int]] = []
    for weight, kind, pattern in _SIGNALS:
        # A phrase counts once: "security review" is not also a plain "review".
        match = next((m for m in pattern.finditer(text) if not any(a < m.end() and m.start() < b for a, b in spans)), None)
        if match:
            spans.append(match.span())
            score += weight
            kinds[kind] = kinds.get(kind, 0) + weight
            reasons.append(f"{match.group(0).lower()} (+{weight:g})")

    files = set(_FILE_REF.findall(text))
    if len(files) >= 3:
        score += 2 * (len(files) - 2)
        reasons.append(f"{len(files)} files named (+{2 * (len(files) - 2):g})")
    has_error = bool(_TRACEBACK.search(text))
    if has_error and "debug" not in kinds:
        # Error output is a debugging task; it is not extra difficulty on top of one.
        score += 3
        kinds["debug"] = 3
        reasons.append("error output (+3)")
    words = len(text.split())
    if words > 250:
        bonus = min(4.0, words / 250)
        score += bonus
        reasons.append(f"long request, {words} words (+{bonus:.1f})")

    if not kinds:
        kind = "math" if _MATH.search(text) else "question"
    else:
        kind = max(kinds, key=kinds.__getitem__)
    if kind == "question" and not _QUESTION.search(text) and words > 12:
        # An unclassified instruction ("make the header sticky") is still project work.
        score += 3
        kind = "edit"
        reasons.append("instruction (+3)")

    about_project = kind not in {"question", "math"} or bool(_PROJECT.search(text))
    if kind == "question" and about_project and _WHY.search(text):
        # "Why is X like this?" needs the reason behind the code: the 7b model guessed plausible,
        # wrong ones live; the 32b read them from the comments.
        score += 3
        reasons.append("why, about the code (+3)")

    tier = sum(score >= t for t in TIER_THRESHOLDS)
    if tier == 3 and kinds.get("design", 0) < 9:
        # Opus is for the hardest work: architecture, security, concurrency. A big refactor,
        # however phrased, is Sonnet's.
        tier = 2
    return TaskProfile(
        score=round(score, 1),
        tier=tier,
        kind=kind,
        reasons=tuple(reasons),
        wants_diff=bool(_DIFF_REQUEST.search(text)),
        has_error=has_error,
        about_project=about_project,
    )
