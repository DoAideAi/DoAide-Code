# Benchmarks: cost, quality, speed

**Goal:** a low-cost, very-high-quality coding assistant that costs less than Claude and Codex
while keeping comparable quality. Every model and strategy here is judged on three metrics:

- **Cost**: dollars per task (Claude CLI's API-equivalent figure; local models are free).
- **Quality**: share of tasks actually solved (the task's tests pass on the files DoAide wrote).
- **Speed**: median wall-clock seconds per task, end to end.

Two sources of numbers, kept separate:

1. **Measured here**, with `python -m doaide_code.benchmark` (below), on this laptop.
2. **Published elsewhere** (research section): reported by vendors or third parties, not
   re-measured, each with its source. Treat them as leads to test, not results.

## Measured on this laptop

Six tasks, 2026-10-21, M2 Max laptop (96 GB). One pass for every contender, then three more
passes for the free ones (the paid rows are the single pass).

| Model | Quality (tests pass) | Cost / task | Speed (median) |
| --- | --- | --- | --- |
| **auto** (DoAide routing; partial repeat, 10 runs) | **90%** | ~$0.01 (1 escalation in 6 on the first pass) | ~8s |
| codex (gpt-6-astra, xhigh) | 100% (6 runs) | not reported by the CLI | 17.5s |
| claude-sonnet alone | 83% (6 runs) | $0.082 | 7.2s |
| qwen2.5-coder:32b alone | 78% (18 runs) | free | ~5s (slow tail to 55s on the parser and the two-file rename) |
| deepseek-coder-v2:16b alone | 72% (18 runs) | free | ~1.2s |
| qwen2.5-coder:7b alone | 67% (18 runs) | free | ~0.9s |

**Update (same day, later):** Claude now runs without the user's MCP servers and skills
(`--strict-mcp-config --disable-slash-commands`) and gets the named files inline. Re-measured,
two passes: claude-sonnet alone **92%, $0.011 / task, 5.6s** (was $0.082). auto: Ollama answered
10 of 12 free; the two escalations were a one-sentence question misread as an instruction (fixed
since).

What it says:

- **Quality**: DoAide's routing beats every local model alone and matches the paid ones on these
  tasks, because answers that fail checks go to Sonnet. Failures that remain are semantic (code
  that parses and applies but is wrong), which no check catches without running the tests.
- **Cost**: auto spends a fraction of Sonnet's cost per task. Sonnet's $0.08 floor is mostly
  Claude Code's own prompt being written to the cache on every run; DoAide now passes
  `--exclude-dynamic-system-prompt-sections`, which cut a measured follow-up from $0.35 to
  $0.05. Codex reports tokens but no price, so its cost is unknown, not zero.
- **Speed**: the 7B and DeepSeek 16B models answer in about a second; the 32B model is ~5x slower
  for a little more quality. Small samples: treat differences under ~10 points as noise.
- Run-to-run variation is large (the same task passes and fails across runs), so compare with
  `--repeat 3` or more.

How it works: each task runs through DoAide's real pipeline (`run_job`: context selection,
prompts, checks, the silent repair round, writing the files) in a throwaway copy of a tiny
project; then the task's tests run against what was written. **auto** is DoAide's routing (a free
local model first, Claude Sonnet when that answer fails a check); every other row is one model
alone. Six tasks: fix a bug, implement a function, fix an off-by-one, write a parser, a
two-file rename, and a one-sentence explanation. Re-run any time:

```
cd backend && .venv/bin/python -m doaide_code.benchmark                   # all available models + auto
cd backend && .venv/bin/python -m doaide_code.benchmark --only ollama-coder auto --repeat 3
```

Live numbers from real use are on the **Models** page in the app (models menu, then
"Compare cost & quality"), with the same three metrics.

## Research: what could lower cost or raise quality and speed

Checked 2026-10-21. Primary sources are linked; third-party figures are marked as such.

### Reference price: Claude

| Model | Input / 1M | Output / 1M | Cache read | Source |
| --- | --- | --- | --- | --- |
| Claude Sonnet 5.5 (the CLI's `sonnet`) | $2 | $10 | $0.10 | [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| Claude Opus 5.5 | $4 | $20 | $0.20 | same |

DoAide's "saved vs Sonnet" figure now uses $2 / $10 (it used Sonnet 4.6's $3 / $15 before, which
overstated savings by about a third).

### Cheaper APIs

| Provider / model | Input / 1M | Output / 1M | Notes | Source |
| --- | --- | --- | --- | --- |
| DeepSeek `deepseek-flash` (V4.1 Flash) | $0.15–0.30 (cache hit $0.003–0.006) | $0.60–1.20 | off-peak is half price; 1M context | [DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing/) |
| DeepSeek `deepseek-v4-pro` | $0.66–1.32 | $1.98–3.96 | same | same |
| Mistral Codestral | $0.30 | $0.90 | third-party figure; one source says $1 / $3 | [CloudZero](https://www.cloudzero.com/blog/mistral-api-pricing), [Artificial Analysis](https://artificialanalysis.ai/models/codestral) |
| Mistral Devstral 2 / Small 2 | $0.40 / $0.10 | $2.00 / $0.30 | third-party; agentic coding | [Curlscape](https://curlscape.com/blog/mistral-api-pricing-2026) |
| Groq gpt-oss-120b / 20b | $0.15 / $0.075 | $0.60 / $0.30 | third-party; ~500 / ~1,000 tok/s reported | [Morph](https://www.morphllm.com/groq-pricing) |

Not verified: Together AI prices (no primary source checked), and coding quality for any of these
against Sonnet on DoAide's own tasks. On list price alone DeepSeek Flash is roughly 7–13× cheaper
than Sonnet on input and 8–17× on output.

### Local models (free, quality and speed are the question)

| Model | Size at Q4 | Ollama tag | Notes | Source |
| --- | --- | --- | --- | --- |
| Qwen3-Coder 30B (MoE, 3.3B active) | 19 GB | `qwen3-coder:30b` | 256K context; same memory as qwen2.5-coder:32b but ~10× fewer active parameters, so it should be much faster | [Ollama](https://ollama.com/library/qwen3-coder) |
| Devstral Small (24B) | ~14 GB | `devstral` | agentic coding; reported SWE-bench Verified 46.8–68% depending on version (self-reported, check the tag) | [Morph roundup](https://www.morphllm.com/best-ollama-models) |
| DeepSeek-Coder-V2 Lite (16B MoE) | 8.9 GB | `deepseek-coder-v2:16b` | installed here; measured above | — |
| qwen2.5-coder 7B / 32B | 4.7 / 19 GB | `qwen2.5-coder` | current defaults; measured above | — |

CodeLlama, StarCoder2 and Yi-Coder are older and were not shortlisted: newer models of the same
sizes are reported stronger, and DoAide only needs one fast and one strong local model.

### Strategies

| Strategy | Helps | Verdict for DoAide |
| --- | --- | --- |
| Try free first, escalate on failed checks | cost | in place (`runner.py`); its escalation rate is the main cost lever |
| Prompt caching | cost | in place for Claude (session resume; cache reads are 0.05× Sonnet 5.5's input price); Ollama keeps models loaded with `keep_alive` |
| MoE local models (Qwen3-Coder 30B) | speed | most promising: test it against qwen2.5-coder:32b with the benchmark |
| Quantization Q4_K_M vs Q8_0 | speed / quality | Q8 roughly doubles memory for a small quality gain; Q4 stays the default; worth measuring only for the 7B model |
| Speculative decoding | speed | supported by llama.cpp (`--model-draft`, [docs](https://www.mintlify.com/ggml-org/llama.cpp/inference/speculative-decoding)); no Ollama setting found, so not usable without replacing Ollama |
| Batched inference | throughput | for many concurrent users; DoAide serves one user per laptop, so no gain |
| Cheaper API tier between Ollama and Sonnet (DeepSeek Flash) | cost | worth a trial as the first escalation step; needs an API key, so it is a product decision |

### Next steps, by expected impact

1. Pull `qwen3-coder:30b` and benchmark it against `qwen2.5-coder:32b` (same memory; likely much
   faster). Pulling is a 19 GB download, so it waits for an OK.
2. Watch the escalation rate on the Models page: every task kept local saves a Sonnet run.
3. Trial DeepSeek Flash as a first paid step before Sonnet (needs an API key and a decision).
