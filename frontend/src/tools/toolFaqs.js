// Frequently asked questions for every tool page, keyed by slug: rendered on the page and
// emitted as FAQPage JSON-LD by applyMeta, so the questions can appear in search results.
// Keep answers short, factual and true of the tool as shipped.

const FREE = 'Yes — free, with no sign-up and no usage caps. The AI coding assistant behind the site is what pays the bills.'
const LOCAL = 'No. It runs entirely in your browser; nothing you type or drop here is uploaded or stored.'

export const TOOL_FAQS = {
  'explain-code': [
    ['Is the AI code explainer really free?', 'Yes. Paste code and get an explanation with no sign-up; snippets are capped at 12,000 characters.'],
    ['What languages can it explain?', 'Any mainstream language — JavaScript, TypeScript, Python, Java, Go, Rust, C/C++, C#, PHP, Ruby, Kotlin, Swift, SQL and shell — with auto-detection if you do not pick one.'],
    ['Is my code stored?', 'Your snippet is sent to the model to produce the answer and is not used to build a public dataset. Avoid pasting secrets or credentials into any online tool.'],
  ],
  'code-review': [
    ['What does the free AI code review check?', 'Correctness, security, performance and readability, with concrete fixes — like a senior engineer’s pass over a pull request.'],
    ['Do I need an account?', 'No. Paste code, press Review, read the result. No sign-up.'],
    ['Can it review a whole repository?', 'This page reviews one snippet at a time (up to 12,000 characters). For whole-codebase help, DoAide Code itself works across your project.'],
  ],
  'find-bugs': [
    ['How does the AI find bugs?', 'It reads the code the way a reviewer would: checking logic, edge cases, error handling and misuse of APIs, then names the input that would break it and the fix.'],
    ['Will it catch every bug?', 'No tool does. It is a fast first pass that catches common logic and edge-case mistakes; keep your tests.'],
    ['Is it free?', FREE],
  ],
  'add-comments': [
    ['What style of comments does it add?', 'Idiomatic ones for the language — docstrings in Python, JSDoc in JavaScript — explaining what the code does and why, not line-by-line noise.'],
    ['Does it change my code?', 'No. The logic is returned unchanged; only comments are added.'],
    ['Is it free?', FREE],
  ],
  'convert-code': [
    ['Which languages can it convert between?', 'Seventeen mainstream languages, any direction — Python to JavaScript, Java to Kotlin, C++ to Rust, and so on.'],
    ['Will converted code run as-is?', 'Usually, for self-contained snippets. Library calls that have no direct equivalent are mapped to the closest idiom and flagged, so review before shipping.'],
    ['Is it free?', FREE],
  ],
  'optimize-code': [
    ['What kind of optimizations does it make?', 'Algorithmic wins first (better data structures, fewer passes), then language-level tweaks — each change explained so you can judge it.'],
    ['Will the optimized code behave identically?', 'That is the goal, and changes are explained so you can verify. Keep your tests as the final word.'],
    ['Is it free?', FREE],
  ],
  'generate-docs': [
    ['What documentation formats are supported?', 'JSDoc, Python docstrings, Javadoc, godoc and the other idiomatic conventions, chosen to match the language you paste.'],
    ['Does it document parameters and return values?', 'Yes — parameters, return values, raised errors and a usage example where it helps.'],
    ['Is it free?', FREE],
  ],
  'generate-tests': [
    ['Which test frameworks does it use?', 'The idiomatic one for your language — pytest for Python, Jest or Vitest for JavaScript, JUnit for Java, go test for Go, and so on.'],
    ['What cases do the generated tests cover?', 'Happy path, edge cases and error handling; the tests are runnable as returned.'],
    ['Is it free?', FREE],
  ],
  'diff-checker': [
    ['How do I compare two pieces of code online?', 'Paste the old version on the left and the new one on the right: every added, removed and changed line is highlighted side by side.'],
    ['Does my code leave my browser?', LOCAL],
    ['Can it diff any file type?', 'Any text — code, config, JSON, prose. Binary files are not supported.'],
  ],
  'code-formatter': [
    ['Which languages can it format?', 'JavaScript, JSON, CSS, HTML and Python, with consistent indentation applied in your browser.'],
    ['Is my code uploaded to a server?', LOCAL],
    ['Is it free?', 'Yes — free, no sign-up, no limits beyond a size cap that keeps the page fast.'],
  ],
  'regex-tester': [
    ['How does the regex tester work?', 'Type a pattern and a test string: every match and capture group is highlighted live as you type, with flags support.'],
    ['Which regex flavor is it?', 'JavaScript (ECMAScript) regular expressions — the flavor browsers, Node.js and most web tooling use.'],
    ['Is my test data uploaded?', LOCAL],
  ],
  'embed-code': [
    ['How do I embed a code snippet on my site?', 'Paste the code and copy the generated iframe tag into your blog, docs or README site; readers see the highlighted snippet.'],
    ['Does the embed cost anything?', 'No — embedding is free and requires no account.'],
  ],
  'share-code': [
    ['How do I share code with a link?', 'Paste up to 20,000 characters and get a short link with syntax highlighting, ready for WhatsApp, Slack or anywhere.'],
    ['How long do shared snippets live?', 'Links stay valid indefinitely under normal use; do not share secrets or credentials.'],
    ['Do I need an account?', 'No. Sharing is anonymous and free.'],
  ],
  'code-playground': [
    ['How does code run in the browser?', 'JavaScript runs natively in a sandboxed frame; Python runs on WebAssembly (Pyodide). Nothing is uploaded.'],
    ['Can I use external packages?', 'JavaScript is plain ES; Python ships with the Pyodide standard library. Package installs are not supported yet.'],
    ['Is it free?', 'Yes — free and sign-up free.'],
  ],
  'sql-formatter': [
    ['What does the SQL formatter do?', 'One clause per line, keywords uppercased — and it flags unbalanced parentheses, unterminated strings and risky statements like DELETE without WHERE.'],
    ['Which SQL dialects work?', 'The formatting is dialect-agnostic and works for PostgreSQL, MySQL, SQLite, SQL Server and most others.'],
    ['Is my query uploaded?', LOCAL],
  ],
  'code-templates': [
    ['What templates are included?', 'React components and hooks, Express and FastAPI endpoints, Python classes and CLIs, SQL CRUD and Go servers — the patterns you write over and over.'],
    ['Can I use the templates commercially?', 'Yes. They are boilerplate; copy them into any project, commercial or not.'],
  ],
  'code-complexity': [
    ['What metrics does the analyzer report?', 'Cyclomatic complexity per function, lines of code, comment ratio and nesting depth, with the functions most worth refactoring flagged first.'],
    ['What is a good cyclomatic complexity?', 'Under 10 per function is the common rule of thumb; above that, testing every path gets hard and refactoring usually pays.'],
    ['Is my code uploaded?', LOCAL],
  ],
  'markdown-editor': [
    ['Can I preview Markdown as I type?', 'Yes — the rendered preview updates live beside the editor, including syntax-highlighted code blocks.'],
    ['Can I export my document?', 'Copy the rendered HTML or download the .md file.'],
    ['Is my writing uploaded?', LOCAL],
  ],
  'jwt-decoder': [
    ['Is it safe to paste a JWT here?', 'The token is decoded entirely in your browser and never uploaded or stored. Still, prefer expired or test tokens when you can.'],
    ['Does it verify the signature?', 'No — it decodes the header and payload and explains the claims. Signature verification needs the secret or public key and belongs on your server.'],
    ['Why is my token marked expired?', 'The exp claim is in the past. The decoder compares it with your device clock and shows both times.'],
  ],
  'cron-builder': [
    ['How do I read a cron expression?', 'Type or build one and the page explains it in plain words, with the next five run times in your timezone.'],
    ['Are @daily and steps supported?', 'Yes — lists, ranges, steps (*/15) and the @hourly/@daily/@weekly/@monthly shortcuts all work.'],
    ['Is anything uploaded?', LOCAL],
  ],
  base64: [
    ['How do I Base64 encode text online?', 'Type in the left pane and the Base64 appears live in the right one — UTF-8 safe, with a URL-safe variant too.'],
    ['Why does my Base64 fail to decode?', 'Usually stray whitespace or missing padding; the decoder here is forgiving about padding and explains anything else.'],
    ['Is my data uploaded?', LOCAL],
  ],
  'css-gradient': [
    ['How do I make a CSS gradient?', 'Pick colors and positions, watch the live preview, and copy the generated CSS — linear, radial or conic, up to six stops.'],
    ['Does the CSS work in every browser?', 'Yes — the generated linear-gradient, radial-gradient and conic-gradient syntax is supported by every modern browser.'],
  ],
  'unit-converter': [
    ['What units can developers convert here?', 'px to rem/em at any root font size, bytes in decimal and binary, unix timestamps to dates, and colors between hex, rgb and hsl.'],
    ['Why do KB and KiB differ?', 'KB is decimal (1000 bytes) and KiB is binary (1024). The converter shows both so the ambiguity never bites.'],
  ],
  'code-screenshot': [
    ['How do I turn code into an image?', 'Paste a snippet, pick a theme, and download a polished PNG with editor chrome and a gradient backdrop.'],
    ['Is the image watermarked?', 'No watermark — the PNG is yours, rendered in your browser.'],
    ['Is my code uploaded?', LOCAL],
  ],
  'hash-generator': [
    ['Which hash algorithms are supported?', 'SHA-1, SHA-256, SHA-384 and SHA-512, computed live with the WebCrypto API in your browser.'],
    ['Why is MD5 not offered?', 'MD5 is cryptographically broken and WebCrypto does not implement it; SHA-256 is the usual replacement.'],
    ['Is my text uploaded?', LOCAL],
  ],
  'url-encoder': [
    ['When do I need to URL-encode text?', 'Whenever text goes into a URL — query values, path segments, form data — so characters like &, = and spaces do not change the URL’s meaning.'],
    ['What is the difference between the two modes?', 'Component mode encodes every reserved character (right for query values); whole-URL mode keeps :/?#&= so an entire address stays navigable.'],
    ['Is anything uploaded?', LOCAL],
  ],
  'json-formatter': [
    ['How do I validate JSON online?', 'Paste it: you get a valid/invalid verdict, the exact line and column of the first error, and a collapsible tree to explore.'],
    ['Is my JSON uploaded?', LOCAL],
    ['How large a document can it handle?', 'Up to 500,000 characters while staying responsive.'],
  ],
  'timestamp-converter': [
    ['How do I convert a unix timestamp to a date?', 'Paste the number: 10-digit values are read as seconds, 13-digit as milliseconds, and you get ISO 8601, RFC 2822 and any timezone instantly.'],
    ['Does it handle timezones?', 'Yes — pick any IANA timezone (Asia/Kolkata, America/New_York, …) and see the same instant rendered there.'],
    ['Is anything uploaded?', LOCAL],
  ],
  'lorem-ipsum': [
    ['What styles of placeholder text can it generate?', 'Classic Latin lorem ipsum, tech-flavored filler and plain English — by the word, sentence or paragraph.'],
    ['Can I get the text as HTML?', 'Yes — Copy HTML wraps each paragraph in a <p> tag, ready for markup.'],
    ['Is it free?', 'Yes — free, instant and sign-up free.'],
  ],
  'string-utilities': [
    ['What case conversions are supported?', 'camelCase, PascalCase, snake_case, SCREAMING_SNAKE, kebab-case, Title Case, Sentence case, UPPER and lower — all live as you type.'],
    ['How do I make a URL slug from a title?', 'Type the title: the Slug row lowercases it, folds accents away and joins the words with hyphens.'],
    ['Is my text uploaded?', LOCAL],
  ],
  'json-path-finder': [
    ['How do I find the JSONPath of a value?', 'Paste the JSON and click any value in the tree: its JSONPath expression and JavaScript accessor appear with copy buttons.'],
    ['What about keys with spaces or quotes?', 'They are quoted automatically — $[\'first name\'] in JSONPath, data[\'first name\'] in JavaScript.'],
    ['Is my JSON uploaded?', LOCAL],
  ],
  'html-preview': [
    ['Is this like CodePen?', 'The essential part, yes: HTML, CSS and JS panes with a live preview — minus accounts, saving and embeds. Everything runs locally in a sandboxed frame.'],
    ['Why is the preview sandboxed?', 'The frame gets scripts but no access to this site or your data, so pasted code cannot read cookies or storage.'],
    ['Where do JavaScript errors show?', 'In a red strip at the bottom of the preview, with the line number.'],
  ],
  'markdown-to-html': [
    ['How do I convert Markdown to HTML?', 'Paste Markdown on the left and copy the generated HTML on the right, with a rendered preview to check it first.'],
    ['Which Markdown features are supported?', 'Headings, lists, quotes, fenced code with language classes, tables, links, images and inline bold/italic/strike/code.'],
    ['Is the generated HTML safe?', 'Raw HTML in the input is escaped and javascript: URLs are dropped, so the output cannot smuggle scripts.'],
  ],
  'image-to-base64': [
    ['How do I convert an image to Base64?', 'Drop or pick the image: you get the data URL, raw Base64, an <img> tag, a CSS background and a Markdown snippet to copy.'],
    ['Is my image uploaded?', 'No — the file is read with the browser’s FileReader and never leaves your machine.'],
    ['When should I use Base64 images?', 'For small images (icons, tiny logos) inlined to save a request. Base64 adds about 33% to the size, so big images belong in files.'],
  ],
  'qr-code': [
    ['How do I make a QR code for a URL?', 'Type or paste the URL and download the generated code as a crisp SVG or a high-resolution PNG. It is generated in your browser.'],
    ['What does the error correction setting do?', 'Higher levels keep the code scannable when partly covered or damaged — up to 30% at level H — at the cost of a denser pattern.'],
    ['Do the QR codes expire?', 'No. The code encodes your text directly (no redirect service), so it works as long as the destination exists.'],
  ],  'json-schema-generator': [
    ['How do I generate a JSON Schema from JSON?', 'Paste a sample of your JSON: the schema appears instantly with inferred types, required keys and detected string formats, ready to copy.'],
    ['Which JSON Schema draft does it produce?', 'Draft 2020-12, the current standard — the $schema line is included so validators know what they are reading.'],
    ['How are arrays with different objects handled?', 'Item schemas are merged: properties are unioned, and only keys present in every element stay required. Genuinely mixed types become an anyOf.'],
    ['Is my JSON uploaded?', LOCAL],
  ],
  'http-status-codes': [
    ['What is the difference between 401 and 403?', '401 means not authenticated — log in or fix the token and retry. 403 means authenticated but not allowed — retrying with the same credentials will not help.'],
    ['When should an API return 422 instead of 400?', '400 says the request itself is malformed (broken JSON, missing fields); 422 says it parsed fine but fails business validation. Many APIs use 400 for both, and that is acceptable too.'],
    ['What is the difference between 301 and 308?', 'Both are permanent redirects, but a 301 lets clients change POST to GET at the new URL; a 308 requires the same method and body to be repeated.'],
    ['Is this list searchable offline?', 'The whole reference loads with the page, so search and filtering work instantly with no further requests.'],
  ],
  'meta-tag-generator': [
    ['What meta tags does a page need for SEO?', 'A unique title (under ~60 characters), a description (under ~160), a canonical URL, and Open Graph + Twitter card tags so shares look right — exactly the set this tool generates.'],
    ['What size should the og:image be?', '1200×630 pixels is the safe standard: large-image cards on X/Twitter, Facebook, LinkedIn, WhatsApp and Slack all render it well.'],
    ['Do meta keywords still matter?', 'No — Google has ignored the keywords meta tag since 2009, which is why this tool does not generate one.'],
    ['Is anything uploaded?', LOCAL],
  ],
}
