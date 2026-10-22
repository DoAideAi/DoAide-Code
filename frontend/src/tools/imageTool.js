// The image → Base64 converter (/tools/image-to-base64): read a local image into a data URL and
// offer it as raw Base64, an <img> tag, a CSS background or Markdown. The file never leaves the
// browser.

// Past a few MB the data URL stops being practical (it is ~4/3 the file size and belongs inline).
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024

const TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif', 'image/bmp', 'image/x-icon']

// null when the file is usable, otherwise why not.
export function imageError(file) {
  if (!file) return 'No file given.'
  if (!TYPES.includes(file.type)) return `Not a supported image type (${file.type || 'unknown'}). PNG, JPEG, GIF, WebP, SVG, AVIF, BMP and ICO work.`
  if (file.size > MAX_IMAGE_BYTES) return `Too large: ${formatBytes(file.size)}. Up to ${formatBytes(MAX_IMAGE_BYTES)} converts here; bigger images belong in files, not Base64.`
  return null
}

// The file as a data URL.
export function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsDataURL(file)
  })
}

export const rawBase64 = (dataUrl) => dataUrl.slice(dataUrl.indexOf(',') + 1)

// The ready-to-paste snippets for one data URL.
export function snippets(dataUrl, name = 'image') {
  return [
    ['Data URL', dataUrl],
    ['Raw Base64', rawBase64(dataUrl)],
    ['HTML <img>', `<img src="${dataUrl}" alt="${name}" />`],
    ['CSS background', `background-image: url('${dataUrl}');`],
    ['Markdown', `![${name}](${dataUrl})`],
  ]
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}
