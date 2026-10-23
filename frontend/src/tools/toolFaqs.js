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
    ['How do I find a key or value in a large JSON file?', 'Type in the search box: every key and value containing the text is highlighted, and the tree opens down to each match.'],
    ['How do I get the path to a JSON field?', 'Click any key in the tree to see its JSONPath ($.users[0].name) and JavaScript accessor (data.users[0].name), each with a copy button.'],
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
  'svg-optimizer': [
    ['How does the SVG optimizer shrink files?', 'It parses the SVG, removes comments, metadata, titles, editor namespaces and the XML prolog, rounds coordinates to your chosen precision, compacts path data and collapses whitespace — typically 30–70% smaller.'],
    ['Will optimizing change how my SVG looks?', 'Visually no, at the default 2-decimal precision — that is sub-pixel accuracy at any sane render size. For very large artboards, raise the precision.'],
    ['Should I remove the <title> element?', 'For decorative inline icons, yes. Keep it when the SVG stands alone as meaningful content, since screen readers announce it.'],
    ['Is my SVG uploaded?', LOCAL],
  ],
  'favicon-generator': [
    ['What favicon sizes does a website need?', '16, 32 and 48px PNGs (bundled in favicon.ico), a 180px apple-touch-icon for iOS, and 192px + 512px icons for Android and PWA manifests — exactly the set this tool produces.'],
    ['Is the favicon.ico it makes real?', 'Yes — a proper ICO container holding the 16, 32 and 48px images, which all modern browsers and Windows accept.'],
    ['What image should I start from?', 'A square image, 512×512 or larger, with a simple bold shape — detail disappears at 16px. Non-square images are center-cropped to fill.'],
    ['Is my image uploaded?', 'No — it is resized with a canvas in your browser and never leaves your machine.'],
  ],
  'performance-audit': [
    ['How do I check my Core Web Vitals?', 'Paste your page HTML here for the markup-level problems (render-blocking scripts, unsized images, missing lazy loading), then check PageSpeed Insights for field LCP, CLS and INP data from real users.'],
    ['What is the biggest cause of layout shift?', 'Images without width and height attributes: the browser reserves no space, so content jumps when they load. This audit counts them for you.'],
    ['Why should scripts use defer?', 'A plain <script src> in <head> halts HTML parsing while it downloads and executes. defer downloads in parallel and runs after parsing, keeping first paint fast without changing execution order.'],
    ['Is my HTML uploaded?', LOCAL],
  ],
  'css-grid-generator': [
    ['How do I create a CSS grid layout?', 'Set display: grid on the container, define columns with grid-template-columns and rows with grid-template-rows, add a gap, then place children by line numbers or named areas. This generator writes all of it from the visual controls.'],
    ['What does grid-template-areas do?', 'It names regions of the grid with an ASCII-art map — "header header" / "sidebar main" — and children join a region with grid-area: name. Each name must form one filled rectangle or the browser ignores the whole template.'],
    ['What is the difference between fr and auto?', 'fr shares out the free space proportionally (2fr gets twice 1fr); auto sizes the track to its content. A classic page uses auto for header and footer rows and 1fr for the content row.'],
    ['Is anything uploaded?', LOCAL],
  ],
  'color-palette': [
    ['How do I make a color palette that looks good?', 'Start from one brand color and apply a color-wheel rule: complementary (opposite hue) for punchy contrast, analogous (neighbours) for calm, triadic for balanced variety. The generator applies each rule in HSL so saturation stays consistent.'],
    ['What is a complementary color?', 'The hue directly opposite on the color wheel — 180° away. Blue’s complement is orange; using one as the main color and the other as an accent gives maximum contrast.'],
    ['What contrast ratio do I need for accessible text?', 'WCAG AA asks for 4.5:1 for normal text and 3:1 for large text; AAA asks for 7:1. Each swatch shows the ratio of its label so you can see which colors work behind text.'],
    ['Can I export the palette to Tailwind?', 'Yes — switch the export to Tailwind for a colors block to paste into tailwind.config.js, or pick CSS variables, SCSS or JSON.'],
  ],
  'markdown-table': [
    ['How do I make a table in markdown?', 'Write a header row with cells separated by pipes, a divider row of dashes, then one line per row: | Name | Role | / | --- | --- | / | Ada | Engineer |. This generator builds and pads it for you.'],
    ['How do I align columns in a markdown table?', 'Put colons in the divider row: :--- aligns left, :---: centers and ---: aligns right. Click the alignment button above each column here to cycle through them.'],
    ['Can I convert Excel or CSV to a markdown table?', 'Yes — copy cells from Excel or Google Sheets (they paste as tab-separated text) or paste CSV into Import, and the table fills in ready to copy as markdown.'],
    ['How do I put a pipe character inside a cell?', 'Escape it as \\|. The generator escapes pipes and turns line breaks into <br> automatically so your table never breaks.'],
  ],
  'text-diff': [
    ['How do I compare two texts for differences?', 'Paste the original on the left and the changed version on the right. Changed lines are highlighted red and green, and the exact words that differ inside them are marked, so you can spot a single edited word in a long paragraph.'],
    ['How is this different from the code diff checker?', 'This one is tuned for prose: lines wrap instead of scrolling, changed words are highlighted inside each line, and you can ignore case, whitespace and blank lines. The code diff checker keeps a monospace side-by-side view for source files.'],
    ['Can I ignore whitespace and capitalization?', 'Yes — tick Ignore case, Ignore whitespace or Ignore blank lines and lines that differ only in those ways count as unchanged.'],
    ['Is my text uploaded?', LOCAL],
  ],
  'html-entities': [
    ['What is an HTML entity?', 'A text code the browser turns into a character: &lt; for <, &amp; for &, &copy; for ©. They let you show characters that would otherwise be read as markup, or that are hard to type.'],
    ['Which characters must be escaped in HTML?', 'Always & and <; > for symmetry; and " or \' inside attribute values. Choosing “Only & < > \" \'” encodes exactly those and leaves the rest of your text readable.'],
    ['Named or numeric entities — which should I use?', 'Both work in every browser. Named ones (&euro;) are easier to read; numeric ones (&#8364;) cover every Unicode character, including emoji, and are safe in XML too.'],
    ['Does escaping HTML prevent XSS?', 'Encoding < > & " \' before inserting untrusted text into HTML is the core defence for element content and quoted attributes. Other contexts — URLs, JavaScript, CSS — need their own escaping.'],
  ],
  'ascii-art': [
    ['How do I make ASCII art text?', 'Type your text, pick a font and copy the result. The fonts are FIGlet fonts — the classic format behind the figlet and toilet command-line tools — rendered right in your browser.'],
    ['Which ASCII font is best for a README or CLI banner?', 'ANSI Shadow and Slant are popular for project banners; Standard and Small stay narrow enough for an 80-column terminal. Use “Compare all fonts” to see your text in every style at once.'],
    ['How do I put ASCII art in a code comment?', 'Pick a comment style — // for JavaScript, # for Python and shell, /* */ for CSS, <!-- --> for HTML — and every line is wrapped so the banner can sit at the top of a source file.'],
    ['Why does my ASCII art look broken in some places?', 'ASCII art needs a monospace font. Paste it inside a code block (``` in markdown) or a <pre> tag so every character keeps the same width.'],
  ],
  'uuid-generator': [
    ['What is the difference between UUID v4 and v7?', 'v4 is 122 random bits — the default choice for unpredictable ids. v7 starts with a millisecond timestamp, so ids sort in creation order, which keeps database indexes compact. Prefer v7 for primary keys.'],
    ['Can two UUIDs ever collide?', 'In practice, no. With v4 you would need to generate about a billion UUIDs every second for 85 years to reach a 50% chance of a single duplicate.'],
    ['Is a UUID the same as a GUID?', 'Yes — GUID is Microsoft’s name for the same 128-bit format. Tick Uppercase and {Braces} for the style Windows and .NET usually show.'],
    ['Are these UUIDs secure to use?', 'They come from crypto.getRandomValues, the browser’s cryptographically secure generator, and are made in your browser — nothing is sent or logged. v1 here uses a random node id instead of your MAC address.'],
  ],
  'password-generator': [
    ['How long should a password be?', 'At least 16 characters for accounts you care about; 20+ with all character sets gives over 120 bits of entropy, far beyond any brute-force attack. A password manager means you never have to type it.'],
    ['Is this password generator safe?', 'Passwords are generated in your browser with crypto.getRandomValues, a cryptographically secure source, using rejection sampling so every character is equally likely. Nothing is sent, stored or logged.'],
    ['What is password entropy?', 'The number of guesses an attacker needs, expressed in bits: length × log2(characters to choose from). Every extra bit doubles the work; 80+ bits is considered very strong.'],
    ['Why exclude look-alike characters?', 'I, l, 1, O and 0 are easy to misread when a password is typed from paper or read aloud. Excluding them costs very little entropy — add a character or two of length to make up for it.'],
  ],
  'box-shadow': [
    ['How do I make a realistic CSS shadow?', 'Layer two shadows: a tight, darker one for where the element meets the surface and a wide, soft, low-opacity one for ambient depth. The “Subtle card” and “Elevated” presets show the pattern.'],
    ['What do the four box-shadow numbers mean?', 'In order: horizontal offset, vertical offset, blur radius and spread. Spread grows the shadow in every direction before the blur softens it.'],
    ['Can I make an inner shadow?', 'Yes — tick Inset on any layer and the shadow renders inside the element, useful for pressed buttons and wells.'],
    ['Is anything uploaded?', LOCAL],
  ],
  'flexbox-playground': [
    ['How do I center a div with flexbox?', 'Set justify-content: center and align-items: center on the container — try it here and copy the two-line CSS.'],
    ['What is the difference between justify-content and align-items?', 'justify-content places items along the main axis (the flex-direction); align-items places them across it. Flip flex-direction to column and watch the two swap jobs.'],
    ['What does flex: 1 actually do?', 'It is shorthand for flex-grow: 1, flex-shrink: 1, flex-basis: 0 — the item takes an equal share of the free space. Raise one item’s grow here to see shares change.'],
    ['Is anything uploaded?', LOCAL],
  ],
  'emoji-picker': [
    ['How do I copy an emoji as an HTML entity?', 'Click the emoji, then click the HTML entity in the detail card — multi-codepoint emojis get every entity in sequence.'],
    ['Which emojis do developers use in commits?', 'The Status & git group collects the gitmoji-style set: ✨ for features, 🐛 for fixes, ♻️ for refactors, 🚀 for deploys, 📝 for docs.'],
    ['Why do some emojis have two codepoints?', 'Characters like ⚠️ are a base symbol plus the U+FE0F variation selector that forces emoji rendering; sequences with skin tones or ZWJ have even more.'],
    ['Is anything uploaded?', LOCAL],
  ],
  'meta-tag-generator': [
    ['What meta tags does a page need for SEO?', 'A unique title (under ~60 characters), a description (under ~160), a canonical URL, and Open Graph + Twitter card tags so shares look right — exactly the set this tool generates.'],
    ['What size should the og:image be?', '1200×630 pixels is the safe standard: large-image cards on X/Twitter, Facebook, LinkedIn, WhatsApp and Slack all render it well.'],
    ['Do meta keywords still matter?', 'No — Google has ignored the keywords meta tag since 2009, which is why this tool does not generate one.'],
    ['Is anything uploaded?', LOCAL],
  ],
  'api-mocker': [
    ['How do I create a mock API?', 'Add endpoints with a method, path, status and response body, press Create mock URL and call the base URL from any app — fetch, axios, curl or Postman. It is live immediately.'],
    ['Can a mock endpoint use path parameters?', 'Yes. A path like /users/:id matches /users/42, and {{id}} anywhere in the body is replaced with 42. Literal paths win over :param ones, so /users/me can have its own response.'],
    ['Can I simulate slow responses and errors?', 'Set a delay of up to 5 seconds on any endpoint to test loading states, and return any status from 100 to 599 — 401, 404, 429 or 500 — to test error handling.'],
    ['Does the mock API work from localhost?', 'Yes. Every response carries Access-Control-Allow-Origin: *, and preflight OPTIONS requests are answered, so browser apps on any origin can call it.'],
    ['Can I edit a mock after sharing it?', 'Saved mocks never change, so links you shared keep working. Open the edit link, change endpoints and save again to get a new URL.'],
    ['Is the mock API free?', FREE],
  ],
  'chmod-calculator': [
    ['What does chmod 755 mean?', 'Owner can read, write and execute (7 = 4+2+1); group and others can read and execute (5 = 4+1). It is the usual mode for scripts, programs and directories.'],
    ['What is the difference between 644 and 755?', '644 (rw-r--r--) has no execute bit, which suits ordinary files like HTML, config and images. 755 adds execute for everyone, needed for scripts and to enter directories.'],
    ['Which permissions should SSH keys have?', 'Private keys must be 600 (rw-------) and the ~/.ssh directory 700; OpenSSH refuses keys that other users can read. Public keys can be 644.'],
    ['What are setuid, setgid and the sticky bit?', 'The fourth, leading octal digit. Setuid (4) runs a program as its owner; setgid (2) runs it as its group, or makes new files in a directory inherit the group; sticky (1) on a directory like /tmp lets only a file’s owner delete it.'],
    ['Should I ever use chmod 777?', 'Almost never. 777 lets every user on the machine change or replace the file. Fix ownership with chown instead, or use 775/664 with a shared group.'],
    ['Is anything uploaded?', LOCAL],
  ],
  'ip-subnet-calculator': [
    ['How do I calculate a subnet from CIDR notation?', 'The prefix (/24) says how many leading bits are the network. Masking the address with those bits gives the network address; setting the remaining host bits to 1 gives the broadcast. Everything between is usable for hosts.'],
    ['How many hosts are in a /24, /26 or /30?', 'A /n subnet has 2^(32−n) addresses, minus 2 for the network and broadcast: /24 → 254 hosts, /26 → 62, /28 → 14, /30 → 2. A /31 point-to-point link uses both addresses (RFC 3021) and a /32 is a single host.'],
    ['What is a wildcard mask?', 'The netmask inverted — 0.0.0.255 for a /24. Cisco ACLs and OSPF use it to say which bits may vary.'],
    ['Which IP ranges are private?', '10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16 (RFC 1918). The calculator also labels loopback, link-local, carrier-grade NAT (100.64.0.0/10), documentation and multicast ranges.'],
    ['Does it support IPv6?', 'Not yet — this calculator handles IPv4, which is what most subnetting, VPC and firewall rules still use.'],
    ['Is anything uploaded?', LOCAL],
  ],
  'markdown-toc': [
    ['How do I add a table of contents to a GitHub README?', 'Paste the README here, copy the generated list and put it near the top — or press Insert into document. Each entry links to #anchor slugs that GitHub creates automatically for every heading.'],
    ['How does GitHub create heading anchors?', 'It lowercases the heading, removes punctuation except hyphens and underscores, and turns spaces into hyphens. Repeated headings get -1, -2 suffixes. This tool follows the same rules, so the links work.'],
    ['Can I update the TOC after editing the document?', 'Yes. Inserted TOCs sit between <!-- toc --> and <!-- tocstop --> comments; insert again and the old block is replaced instead of duplicated.'],
    ['Are headings inside code blocks ignored?', 'Yes — lines in fenced ``` or ~~~ blocks and YAML front matter are skipped, so shell comments starting with # never show up.'],
    ['Is anything uploaded?', LOCAL],
  ],
  'placeholder-image': [
    ['How do I make a placeholder image?', 'Pick a preset or type the width and height, choose colors and optional text, then download it as PNG, JPEG, WebP or SVG. The default label shows the dimensions, like 1200 × 630.'],
    ['Can I use placeholder images without hosting them?', 'Yes — copy the data URI or the ready-made <img> tag. The image is an inline SVG, so it works offline, in emails and in prototypes without a server.'],
    ['What size should an Open Graph image be?', '1200 × 630 pixels (1.91:1). It is the first preset here; Twitter large cards use 1200 × 675 and Instagram posts 1080 × 1080.'],
    ['Why is the text color automatic?', 'Leave Text color alone and it switches between near-black and near-white based on the background’s luminance, so the label always stays readable. Type a hex value to override it.'],
    ['Is anything uploaded?', LOCAL],
  ],
  'css-animation': [
    ['How do I create a CSS keyframe animation?', 'Define stops in @keyframes (0% to 100%) with the styles at each point, then apply it with the animation property: name, duration, timing function, delay, iteration count, direction and fill mode. This tool writes both from the timeline you edit.'],
    ['Which properties animate smoothly?', 'transform (translate, scale, rotate, skew) and opacity: browsers animate them on the GPU without re-layout, so they stay at 60 fps. Avoid animating width, height, top or margin.'],
    ['What is a cubic-bezier timing function?', 'A curve from (0,0) to (1,1) shaped by two control points that maps time to progress. ease-out starts fast and slows down; y values beyond 0–1, as in ease-out-back, overshoot for a springy feel.'],
    ['What does animation-fill-mode both do?', 'The element takes the first keyframe’s styles during the delay and keeps the last keyframe’s styles after the animation ends — usually what you want for entrance animations.'],
    ['Does the CSS respect reduced motion?', 'Yes — the output includes a prefers-reduced-motion media query that turns the animation off for people who ask their OS for less motion.'],
    ['Is anything uploaded?', LOCAL],
  ],
  'css-to-tailwind': [
    ['How do I convert CSS to Tailwind classes?', 'Paste a stylesheet or a few declarations. Each selector gets its utility classes: padding: 16px becomes p-4, display: flex becomes flex, :hover rules get hover: and min-width media queries get sm:, md:, lg: prefixes.'],
    ['What happens to values that are not in Tailwind’s scale?', 'They become arbitrary values like w-[13px] or bg-[#1e293b], which Tailwind v3 compiles exactly. They are highlighted so you can round them to the nearest scale step or add them to your theme.'],
    ['Does it handle properties Tailwind has no utility for?', 'Yes — they become arbitrary properties such as [mask-type:alpha], so nothing is dropped.'],
    ['Which Tailwind version does it target?', 'Tailwind CSS v3 with the default theme: 4px spacing scale, text-sm/base/lg sizes, rounded-md/lg/xl radii and the sm 640px to 2xl 1536px breakpoints.'],
    ['Is anything uploaded?', LOCAL],
  ],
  'sql-to-mongodb': [
    ['How do I convert a SQL query to MongoDB?', 'Paste it here. WHERE becomes the filter document ($gt, $in, $regex…), the column list becomes a projection, ORDER BY becomes .sort(), and LIMIT/OFFSET become .limit() and .skip().'],
    ['How does GROUP BY translate to MongoDB?', 'Into an aggregation pipeline: WHERE becomes $match, GROUP BY becomes $group with $sum, $avg, $min or $max accumulators, HAVING becomes a second $match, then $project, $sort and $limit.'],
    ['How is LIKE converted?', 'To a regular expression: % becomes .* and _ becomes a single character, anchored with ^ and $ where the pattern has no wildcard. ILIKE adds the i flag for case-insensitive matching.'],
    ['Does it convert JOINs?', 'No — MongoDB has no direct JOIN. The tool flags joins and subqueries instead of guessing; use $lookup in an aggregation or embed related data in the document.'],
    ['Is my query uploaded?', LOCAL],
  ],
  'og-preview': [
    ['How do I check how my link will look when shared?', 'Open the page, view its source (Ctrl+U), copy it and paste it here. The previews update instantly for Google, Facebook, X, LinkedIn, WhatsApp, Slack and Discord, and the checks list anything missing.'],
    ['Which Open Graph tags are required?', 'og:title, og:description, og:image and og:url, plus og:type. Add twitter:card = summary_large_image to get a big image card on X.'],
    ['Why does my old image still show after I changed it?', 'Platforms cache previews. Re-scrape with Facebook’s Sharing Debugger or LinkedIn’s Post Inspector, or add a query string to the image URL so it is fetched again.'],
    ['What size should the og:image be?', '1200×630 pixels (1.91:1), under 5 MB, as an absolute https URL. Smaller than 600px wide falls back to a small thumbnail on most platforms.'],
    ['Is anything uploaded?', 'No — the HTML is parsed in your browser. Only the image itself is loaded from its own URL so the previews can show it.'],
  ],
}
