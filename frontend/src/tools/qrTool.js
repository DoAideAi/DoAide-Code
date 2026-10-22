// The QR code generator (/tools/qr-code): text or a URL in, a crisp SVG out, downloadable as SVG
// or PNG. The qrcode library computes the matrix; we render it ourselves so the page needs no
// canvas until a PNG is actually saved. Everything stays in the browser.

import QRCode from 'qrcode/lib/core/qrcode.js'

export const MAX_QR_CHARS = 2000
export const EC_LEVELS = [
  ['L', 'Low (7% recoverable)'],
  ['M', 'Medium (15%)'],
  ['Q', 'Quartile (25%)'],
  ['H', 'High (30%)'],
]

// The QR matrix as an SVG string: one path for all dark modules, a quiet zone around it, crisp at
// any size. Throws with a readable message when the text cannot fit.
export function qrSvg(text, { ecl = 'M', margin = 4, size = 320 } = {}) {
  if (!text) throw new Error('Type some text or a URL first.')
  if (text.length > MAX_QR_CHARS) throw new Error(`Too long: QR codes here take up to ${MAX_QR_CHARS} characters.`)
  let code
  try {
    code = QRCode.create(text, { errorCorrectionLevel: ecl })
  } catch (e) {
    throw new Error(`Could not encode that text: ${e.message}`)
  }
  const n = code.modules.size
  const data = code.modules.data
  const total = n + margin * 2
  let path = ''
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (data[y * n + x]) path += `M${x + margin} ${y + margin}h1v1h-1z`
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="#ffffff"/><path d="${path}" fill="#000000"/></svg>`
  )
}

export const svgDataUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

// Saves the SVG as a PNG by drawing it on a canvas. Browser-only; rejects where canvas is
// unavailable so the page can say so instead of failing silently.
export function svgToPngUrl(svg, size = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas is unavailable in this browser.')
        ctx.drawImage(img, 0, 0, size, size)
        resolve(canvas.toDataURL('image/png'))
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = () => reject(new Error('Could not rasterize the QR code.'))
    img.src = svgDataUrl(svg)
  })
}
