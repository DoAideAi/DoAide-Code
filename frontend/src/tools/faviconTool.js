// The favicon generator (/tools/favicon-generator): drop one square-ish image, get every size a
// site needs — PNGs from 16px to 512px, a real favicon.ico, and the <head> snippet. The image is
// resized on a canvas in your browser and never uploaded.

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export const SIZES = [
  [16, 'favicon-16x16.png', 'Browser tab'],
  [32, 'favicon-32x32.png', 'Browser tab (retina)'],
  [48, 'favicon-48x48.png', 'Windows site icon'],
  [180, 'apple-touch-icon.png', 'iOS home screen'],
  [192, 'android-chrome-192x192.png', 'Android home screen'],
  [512, 'android-chrome-512x512.png', 'PWA splash'],
]

export const ICO_SIZES = [16, 32, 48]

// The <head> lines to paste once the files sit at the site root.
export function htmlSnippet() {
  return [
    '<link rel="icon" href="/favicon.ico" sizes="48x48">',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
  ].join('\n')
}

// A base64 data URL's raw bytes.
export function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// A valid .ico file from PNG-encoded entries ({size, bytes}): the ICONDIR header, one ICONDIRENTRY
// per image, then the PNG payloads. PNG-in-ICO is supported by every modern browser and Windows.
export function icoBytes(entries) {
  if (!entries.length) throw new Error('No images to pack.')
  const headerSize = 6 + entries.length * 16
  const total = headerSize + entries.reduce((n, e) => n + e.bytes.length, 0)
  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)
  view.setUint16(0, 0, true) // reserved
  view.setUint16(2, 1, true) // type: icon
  view.setUint16(4, entries.length, true)
  let dirOffset = 6
  let dataOffset = headerSize
  for (const { size, bytes } of entries) {
    out[dirOffset] = size >= 256 ? 0 : size // width (0 means 256)
    out[dirOffset + 1] = size >= 256 ? 0 : size // height
    out[dirOffset + 2] = 0 // palette
    out[dirOffset + 3] = 0 // reserved
    view.setUint16(dirOffset + 4, 1, true) // planes
    view.setUint16(dirOffset + 6, 32, true) // bpp
    view.setUint32(dirOffset + 8, bytes.length, true)
    view.setUint32(dirOffset + 12, dataOffset, true)
    out.set(bytes, dataOffset)
    dirOffset += 16
    dataOffset += bytes.length
  }
  return out
}

// Reads an image file into an <img> ready to draw. Browser-only.
export function loadImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('That file is not an image.'))
    if (file.size > MAX_IMAGE_BYTES) return reject(new Error('Too big: images up to 10 MB work here.'))
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image. PNG, JPEG, WebP and SVG files work.'))
    }
    img.src = url
  })
}

// Draws the image centered and covering a size×size canvas, returning the PNG data URL.
export function renderSize(img, size) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable in this browser.')
  ctx.imageSmoothingQuality = 'high'
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  const scale = Math.max(size / w, size / h)
  const dw = w * scale
  const dh = h * scale
  ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh)
  return canvas.toDataURL('image/png')
}
