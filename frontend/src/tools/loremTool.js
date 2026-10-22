// The lorem ipsum generator (/tools/lorem-ipsum): paragraphs, sentences or words in three
// voices — classic Latin, tech filler, plain English. Runs in the page.

const STYLES = {
  classic: {
    label: 'Classic Latin',
    words:
      `lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum`.split(' '),
  },
  tech: {
    label: 'Tech filler',
    words:
      `scalable microservice pipeline deploys containerized workloads across the cluster while asynchronous queues buffer requests and the scheduler rebalances shards observability dashboards surface latency percentiles caching layers absorb bursts feature flags gate rollouts and the orchestrator reconciles desired state replicas failover gracefully schema migrations run idempotently tokens rotate automatically endpoints throttle abusive clients telemetry streams aggregate downstream`.split(' '),
  },
  plain: {
    label: 'Plain English',
    words:
      `the quiet morning light settled over the small town as people opened their shops and greeted each other warmly a gentle breeze carried the smell of fresh bread down the street children walked to school laughing about nothing in particular and the day unfolded slowly the way good days often do with small kindnesses adding up until evening came and lamps flickered on one by one`.split(' '),
  },
}

export const LOREM_STYLES = Object.entries(STYLES).map(([key, s]) => [key, s.label])
export const MAX_LOREM_COUNT = 200

// A deterministic-enough word stream: cycles the style's vocabulary from a random offset so two
// clicks differ, without pulling in a random library.
function* wordStream(words, offset) {
  for (let i = 0; ; i++) yield words[(offset + i) % words.length]
}

const cap = (w) => w[0].toUpperCase() + w.slice(1)

function sentence(stream, length) {
  const parts = []
  for (let i = 0; i < length; i++) parts.push(stream.next().value)
  return cap(parts.join(' ')) + '.'
}

// `count` units of lorem text. Units: 'words' | 'sentences' | 'paragraphs'. The classic style
// always starts with the canonical "Lorem ipsum dolor sit amet" opener.
export function generateLorem(style, unit, count, random = Math.random) {
  const { words } = STYLES[style] ?? STYLES.classic
  const n = Math.max(1, Math.min(MAX_LOREM_COUNT, Math.floor(count) || 1))
  const start = style === 'classic' ? 0 : Math.floor(random() * words.length)
  const stream = wordStream(words, start)
  const sentenceLength = () => 8 + Math.floor(random() * 8)

  if (unit === 'words') {
    const parts = []
    for (let i = 0; i < n; i++) parts.push(stream.next().value)
    return cap(parts.join(' '))
  }
  if (unit === 'sentences') {
    const out = []
    for (let i = 0; i < n; i++) out.push(sentence(stream, sentenceLength()))
    return out.join(' ')
  }
  const paragraphs = []
  for (let p = 0; p < n; p++) {
    const sentences = []
    const perParagraph = 4 + Math.floor(random() * 3)
    for (let s = 0; s < perParagraph; s++) sentences.push(sentence(stream, sentenceLength()))
    paragraphs.push(sentences.join(' '))
  }
  return paragraphs.join('\n\n')
}

// The same text as HTML <p> blocks, for pasting into markup.
export function loremHtml(text) {
  return text
    .split('\n\n')
    .map((p) => `<p>${p}</p>`)
    .join('\n')
}
