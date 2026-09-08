// Generates the PWA icon PNGs from scratch — no image library, no binary assets
// checked into git. The mark is a rain cloud over three drops on the deep-blue
// brand plane: readable at 48px on a cluttered home screen, which is the only
// size that really matters for an installed app.
//
// Run with `npm run icons` after changing anything here.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

const BRAND = [28, 92, 171]      // #1c5cab — theme_color, matches the app header
const CLOUD = [252, 252, 251]    // #fcfcfb — surface white
const DROP = [134, 182, 239]     // #86b6ef — blue 250, reads as water beside white

/** Signed distance from p to the segment ab; the drawing primitives are all
 *  distance fields so every edge comes out antialiased for free. */
function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay
  const wx = px - ax, wy = py - ay
  const len2 = vx * vx + vy * vy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2))
  return Math.hypot(wx - t * vx, wy - t * vy)
}

/** Coverage of a shape at a pixel, from its signed distance: 1 inside, 0 outside,
 *  a ramp across the one-pixel band between. */
function coverage(dist) {
  return Math.max(0, Math.min(1, 0.5 - dist))
}

function mix(dst, src, a) {
  if (a <= 0) return
  for (let i = 0; i < 3; i++) dst[i] = Math.round(dst[i] * (1 - a) + src[i] * a)
}

/**
 * Draws the icon at `size`. `pad` is the fraction of the canvas kept clear of
 * artwork — maskable icons are cropped to a circle by the launcher, so they get
 * a much larger quiet zone and a full-bleed plane instead of a rounded square.
 */
function render(size, { maskable = false } = {}) {
  const px = new Uint8Array(size * size * 3)
  const S = size
  const radius = S * 0.22           // rounded-square corner, ignored when maskable
  const inset = maskable ? 0 : S * 0.06
  // Artwork is laid out in a unit box then scaled, so the two sizes stay identical.
  const art = maskable ? S * 0.58 : S * 0.74
  const ox = (S - art) / 2
  const oy = (S - art) / 2

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const cx = x + 0.5, cy = y + 0.5
      const rgb = [249, 249, 247]   // page plane, shows only in the rounded corners

      // --- background plane ---------------------------------------------
      let planeCov = 1
      if (!maskable) {
        // Rounded square: distance to the inner rect inflated by the radius.
        const rx = Math.max(Math.abs(cx - S / 2) - (S / 2 - inset - radius), 0)
        const ry = Math.max(Math.abs(cy - S / 2) - (S / 2 - inset - radius), 0)
        planeCov = coverage(Math.hypot(rx, ry) - radius)
      }
      mix(rgb, BRAND, planeCov)

      // --- cloud: three overlapping discs on a flat base -----------------
      const u = (cx - ox) / art, v = (cy - oy) / art   // unit coords 0..1
      const discs = [
        [0.34, 0.42, 0.185],
        [0.55, 0.35, 0.235],
        [0.72, 0.45, 0.165],
      ]
      let cloud = 0
      for (const [dx, dy, dr] of discs) {
        cloud = Math.max(cloud, coverage((Math.hypot(u - dx, v - dy) - dr) * art))
      }
      // Flat underside so the cloud reads as a cloud and not as three bubbles.
      const slabX = Math.max(Math.abs(u - 0.53) - 0.21, 0)
      const slabY = Math.max(Math.abs(v - 0.50) - 0.075, 0)
      cloud = Math.max(cloud, coverage((Math.hypot(slabX, slabY) - 0.06) * art))
      mix(rgb, CLOUD, cloud * planeCov)

      // --- three falling drops -------------------------------------------
      let drops = 0
      for (const [sx, sy, ex, ey] of [
        [0.36, 0.66, 0.31, 0.82],
        [0.54, 0.70, 0.49, 0.88],
        [0.72, 0.66, 0.67, 0.82],
      ]) {
        const d = segDist(u, v, sx, sy, ex, ey) - 0.043
        drops = Math.max(drops, coverage(d * art))
      }
      mix(rgb, DROP, drops * planeCov)

      const i = (y * S + x) * 3
      px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2]
    }
  }
  return px
}

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = c ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(rgb, size) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8       // bit depth
  ihdr[9] = 2       // colour type: truecolour
  // 10..12 stay 0: deflate, adaptive filtering, no interlace

  // One filter byte (0 = None) per scanline.
  const stride = size * 3
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    Buffer.from(rgb.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(OUT, { recursive: true })
const targets = [
  ['icons/icon-192.png', 192, {}],
  ['icons/icon-512.png', 512, {}],
  ['icons/maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, { maskable: true }],  // iOS applies its own mask
]
for (const [name, size, opts] of targets) {
  const file = resolve(OUT, '..', name)
  writeFileSync(file, encodePng(render(size, opts), size))
  console.log(`wrote ${name} (${size}x${size})`)
}
