// The HTTP status code reference (/tools/http-status-codes): every registered status code with
// its name, what it means, and when to use it. Pure data + a search filter; nothing leaves the
// browser.

export const CATEGORIES = [
  ['1', 'Informational'],
  ['2', 'Success'],
  ['3', 'Redirection'],
  ['4', 'Client error'],
  ['5', 'Server error'],
]

// [code, name, what it means, when to use it]
export const STATUS_CODES = [
  [100, 'Continue', 'The server has the headers and the client should send the body.', 'Large uploads where the client sends Expect: 100-continue before transmitting the payload.'],
  [101, 'Switching Protocols', 'The server agrees to switch protocols as the client asked.', 'Upgrading an HTTP connection to WebSocket via the Upgrade header.'],
  [102, 'Processing', 'The server accepted the request but has not finished it yet.', 'Long-running WebDAV requests, to stop the client timing out. Deprecated elsewhere.'],
  [103, 'Early Hints', 'Preliminary headers before the final response.', 'Sending Link: rel=preload hints so the browser fetches assets while the server renders.'],
  [200, 'OK', 'The request succeeded and the response carries the result.', 'The default success: GET returns the resource, POST returns the outcome.'],
  [201, 'Created', 'The request created a new resource.', 'POST or PUT that created something; put its URL in the Location header.'],
  [202, 'Accepted', 'The request was accepted but not yet acted on.', 'Queued background work: return a job URL the client can poll.'],
  [203, 'Non-Authoritative Information', 'The response was modified by a proxy on the way.', 'Rare; a transforming proxy altering the origin response.'],
  [204, 'No Content', 'Success with nothing in the body.', 'DELETE that succeeded, or a PUT/PATCH where the client needs nothing back.'],
  [205, 'Reset Content', 'Success; the client should reset the view that sent the request.', 'Telling a form UI to clear itself after submission. Rarely used.'],
  [206, 'Partial Content', 'The response carries only the requested byte range.', 'Video seeking, resumable downloads — any Range request.'],
  [207, 'Multi-Status', 'The body carries multiple status values for multiple resources.', 'WebDAV batch operations where each item can succeed or fail separately.'],
  [208, 'Already Reported', 'The members of a binding were already listed earlier in this response.', 'WebDAV PROPFIND responses avoiding repeats in nested bindings.'],
  [226, 'IM Used', 'The response is a delta relative to a previous version.', 'Delta encoding (RFC 3229); almost never seen in the wild.'],
  [300, 'Multiple Choices', 'Several representations exist; the client should pick one.', 'Content negotiation lists; rare in APIs.'],
  [301, 'Moved Permanently', 'The resource lives at a new URL, forever.', 'Permanent redirects — old domains, renamed pages. Browsers and search engines update their references.'],
  [302, 'Found', 'The resource is temporarily at a different URL.', 'Classic temporary redirect; clients may change POST to GET. Prefer 303 or 307 when the method matters.'],
  [303, 'See Other', 'The result is at another URL; fetch it with GET.', 'Post/Redirect/Get after a form submission so refresh does not resubmit.'],
  [304, 'Not Modified', 'The cached copy is still valid.', 'Responses to conditional GETs with If-None-Match or If-Modified-Since.'],
  [307, 'Temporary Redirect', 'Temporarily elsewhere; repeat the same method there.', 'Temporary redirects where a POST must stay a POST.'],
  [308, 'Permanent Redirect', 'Permanently elsewhere; repeat the same method there.', 'Permanent redirects where the method and body must be preserved.'],
  [400, 'Bad Request', 'The server cannot process the request as sent.', 'Malformed JSON, missing parameters, validation failures — say what was wrong in the body.'],
  [401, 'Unauthorized', 'Authentication is required or the credentials failed.', 'Missing or invalid token/session. Send WWW-Authenticate. (It really means unauthenticated.)'],
  [402, 'Payment Required', 'Reserved; used in practice for billing problems.', 'Paywalled APIs signalling an exhausted quota or expired subscription.'],
  [403, 'Forbidden', 'The server understood but refuses to authorize it.', 'Authenticated but not allowed: wrong role, ownership or scope. Re-authenticating will not help.'],
  [404, 'Not Found', 'No resource lives at this URL.', 'Unknown paths and IDs; also used to hide resources that do exist from unauthorized eyes.'],
  [405, 'Method Not Allowed', 'The URL exists but not for this HTTP method.', 'POST to a read-only endpoint; list what works in the Allow header.'],
  [406, 'Not Acceptable', 'No representation matches the Accept headers.', 'Client demands application/xml but you only serve JSON.'],
  [407, 'Proxy Authentication Required', 'A proxy in the path needs credentials first.', 'Corporate proxies gating outbound traffic.'],
  [408, 'Request Timeout', 'The client took too long to send the request.', 'Idle connections the server wants to close; clients may safely retry.'],
  [409, 'Conflict', 'The request conflicts with the current state.', 'Duplicate usernames, stale version numbers on optimistic locking, concurrent edits.'],
  [410, 'Gone', 'The resource existed and was deliberately removed.', 'Deleted content you want crawlers to forget faster than a 404.'],
  [411, 'Length Required', 'The request must declare Content-Length.', 'Servers refusing chunked uploads.'],
  [412, 'Precondition Failed', 'An If-* precondition was not met.', 'Conditional updates: If-Match with an old ETag loses the race.'],
  [413, 'Content Too Large', 'The request body exceeds the server limit.', 'Upload size caps; say the limit in the body.'],
  [414, 'URI Too Long', 'The URL itself exceeds the server limit.', 'Huge query strings — usually a sign the request belongs in a POST body.'],
  [415, 'Unsupported Media Type', 'The body format is not supported here.', 'XML posted to a JSON-only endpoint, or a missing Content-Type.'],
  [416, 'Range Not Satisfiable', 'The requested byte range is outside the resource.', 'Resumed downloads asking past the end of the file.'],
  [417, 'Expectation Failed', 'The Expect header cannot be met.', 'Servers that do not support 100-continue.'],
  [418, "I'm a teapot", 'The server refuses to brew coffee in a teapot.', 'An April Fools RFC (2324). Seen on easter-egg endpoints; never in serious APIs.'],
  [421, 'Misdirected Request', 'This server is not able to produce a response for this URL.', 'HTTP/2 connection reuse hitting the wrong virtual host.'],
  [422, 'Unprocessable Content', 'The syntax is fine but the content is semantically wrong.', 'Well-formed JSON that fails business validation; the classic REST validation status.'],
  [423, 'Locked', 'The resource is locked.', 'WebDAV resources locked by another client.'],
  [424, 'Failed Dependency', 'A request this one depended on failed.', 'WebDAV batch steps aborted by an earlier failure.'],
  [425, 'Too Early', 'The server will not risk processing a possibly replayed request.', 'TLS 1.3 early data that is not idempotent.'],
  [426, 'Upgrade Required', 'The client must switch protocols to proceed.', 'Forcing an upgrade, e.g. to a newer TLS or HTTP version, named in the Upgrade header.'],
  [428, 'Precondition Required', 'The request must be conditional.', 'APIs that require If-Match so concurrent writers cannot clobber each other.'],
  [429, 'Too Many Requests', 'The client is over the rate limit.', 'Rate limiting; send Retry-After so well-behaved clients back off.'],
  [431, 'Request Header Fields Too Large', 'Headers exceed the server limit.', 'Oversized cookies are the usual culprit.'],
  [451, 'Unavailable For Legal Reasons', 'Access is denied for legal reasons.', 'Court orders, DMCA takedowns, geo-blocked content.'],
  [500, 'Internal Server Error', 'Something broke on the server.', 'The generic unhandled exception. Log the details; never leak the stack trace to the client.'],
  [501, 'Not Implemented', 'The server does not support this functionality.', 'HTTP methods or features you have not built; distinct from 405 on a known URL.'],
  [502, 'Bad Gateway', 'An upstream server returned an invalid response.', 'Reverse proxies (nginx, Caddy) whose backend crashed or spoke garbage.'],
  [503, 'Service Unavailable', 'The server is temporarily unable to serve.', 'Maintenance windows and overload; send Retry-After.'],
  [504, 'Gateway Timeout', 'An upstream server took too long.', 'Reverse proxies whose backend never answered within the timeout.'],
  [505, 'HTTP Version Not Supported', 'The protocol version is not supported.', 'Ancient or malformed protocol versions; rare.'],
  [506, 'Variant Also Negotiates', 'A negotiation misconfiguration on the server.', 'Broken transparent content negotiation setups.'],
  [507, 'Insufficient Storage', 'The server cannot store what the request needs.', 'WebDAV servers out of quota.'],
  [508, 'Loop Detected', 'The server hit an infinite loop processing the request.', 'WebDAV bindings referencing each other.'],
  [510, 'Not Extended', 'The request needs further extensions the server lacks.', 'The obsolete HTTP extension framework; effectively unused.'],
  [511, 'Network Authentication Required', 'The network, not the server, wants a login first.', 'Captive portals on hotel and airport Wi-Fi.'],
]

export const categoryOf = (code) => String(code)[0]

// The codes matching a search (number prefix, name or description words) and category filter.
export function filterCodes(query, category = '') {
  const q = query.trim().toLowerCase()
  return STATUS_CODES.filter(([code, name, meaning, usage]) => {
    if (category && categoryOf(code) !== category) return false
    if (!q) return true
    if (String(code).startsWith(q)) return true
    return `${name} ${meaning} ${usage}`.toLowerCase().includes(q)
  })
}
