// The free developer utilities: no AI, no server, everything computed in the page. One URL per
// tool for search engines, like the AI tools in codeTools.js.

export const UTIL_TOOLS = [
  {
    slug: 'diff-checker',
    label: 'Diff checker',
    title: 'Code Diff Checker',
    heading: 'Compare two versions of your code',
    description:
      'Paste two versions of a file and see every added, removed and changed line side by side. Free online diff checker, no sign-up.',
    isNew: true,
  },
  {
    slug: 'code-formatter',
    label: 'Formatter',
    title: 'Code Formatter',
    heading: 'Format messy code',
    description:
      'Beautify JavaScript, JSON, CSS, HTML or Python: consistent indentation, right in your browser. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'regex-tester',
    label: 'Regex tester',
    title: 'Regex Tester',
    heading: 'Test regular expressions',
    description:
      'Type a regex and a test string and see every match and capture group highlighted as you type. Free, no sign-up.',
    isNew: true,
  },
  {
    slug: 'json-formatter',
    label: 'JSON viewer',
    title: 'JSON Formatter & Validator',
    heading: 'Validate and explore JSON',
    description:
      'Paste JSON to validate it, see the exact line of any error, and explore it as a collapsible tree. Free, no sign-up.',
    isNew: true,
  },
]

// The slug in a path like /tools/diff-checker ('' for /tools).
export function slugForPath(pathname) {
  return pathname.replace(/^\/tools\/?/, '').replace(/\/$/, '')
}

// The utility living at this path, or null when the path is an AI tool's (or unknown).
export function utilForPath(pathname) {
  const slug = slugForPath(pathname)
  return UTIL_TOOLS.find((t) => t.slug === slug) ?? null
}
