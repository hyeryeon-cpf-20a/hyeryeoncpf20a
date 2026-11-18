import QRCode from 'qrcode'

/**
 * 통통한 하트 (좌표: x −1.3~1.3, y −1.3~1.3, 아래가 +y).
 * 위쪽 두 원 + 아래로 모이는 몸통 — 가운데에 큰 정사각형(QR)이 들어갈 수 있는 모양.
 */
function inHeart(x: number, y: number) {
  const R = 0.66
  const cy = -0.42
  const cx = 0.6
  if ((x - cx) ** 2 + (y - cy) ** 2 <= R * R) return true
  if ((x + cx) ** 2 + (y - cy) ** 2 <= R * R) return true
  // 몸통: 원의 바깥쪽 끝에서 아래 꼭짓점(0, 1.22)까지 부드럽게 좁아짐
  const tip = 1.27
  if (y < cy || y > tip) return false
  const t = (y - cy) / (tip - cy) // 0(위) → 1(꼭짓점)
  const half = (cx + R) * Math.cos((t * Math.PI) / 2) ** 0.62
  return Math.abs(x) <= half
}

/**
 * 하트 모양 QR 코드.
 * 실제 QR 코드는 가운데에 그대로(인식되도록) 두고, 하트 나머지는 연한 색 점무늬로 채웁니다.
 */
export async function heartQrDataUrl(text: string, opts: { dark: string; soft: string; size?: number }): Promise<string> {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'H' })
  const m = qr.modules.size
  const data = qr.modules.data
  const quiet = 2 // QR 주변 빈 칸
  // QR(+여백)이 하트 안에 들어가는 가장 작은 격자를 찾아 QR 을 최대한 크게
  const fitsAt = (g: number, offY: number) => {
    const off = Math.round((g - m) / 2)
    for (let r = -quiet; r < m + quiet; r++)
      for (let c = -quiet; c < m + quiet; c++) {
        const x = ((off + c + 0.5) / g) * 2.6 - 1.3
        const y = ((offY + r + 0.5) / g) * 2.6 - 1.3
        if (!inHeart(x, y)) return false
      }
    return true
  }
  let G = m + quiet * 2
  let offY = 0
  search: for (; G < m * 4; G++) {
    for (let oy = 0; oy + m <= G; oy++)
      if (fitsAt(G, oy)) {
        offY = oy
        break search
      }
  }
  const offX = Math.round((G - m) / 2)
  const size = opts.size ?? 1200
  const pad = size * 0.06
  const cell = (size - pad * 2) / G
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)

  const dot = (c: number, r: number, color: string, scale = 0.86) => {
    const x = pad + c * cell + (cell * (1 - scale)) / 2
    const y = pad + r * cell + (cell * (1 - scale)) / 2
    const s = cell * scale
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(x, y, s, s, s * 0.32)
    ctx.fill()
  }

  // 1) 하트를 채우는 장식 점 (QR 영역과 여백은 비움)
  let seed = 7
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  for (let r = 0; r < G; r++)
    for (let c = 0; c < G; c++) {
      const x = ((c + 0.5) / G) * 2.6 - 1.3
      const y = ((r + 0.5) / G) * 2.6 - 1.3
      const inQrZone = c >= offX - quiet && c < offX + m + quiet && r >= offY - quiet && r < offY + m + quiet
      if (!inHeart(x, y) || inQrZone) continue
      if (rnd() < 0.62) dot(c, r, opts.soft, 0.8)
    }

  // 2) 실제 QR 코드 (흰 바탕 위에 진한 색)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(pad + (offX - 1) * cell, pad + (offY - 1) * cell, (m + 2) * cell, (m + 2) * cell)
  const isFinder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= m - 7) || (r >= m - 7 && c < 7)
  for (let r = 0; r < m; r++)
    for (let c = 0; c < m; c++) {
      if (isFinder(r, c)) continue
      if (data[r * m + c]) dot(offX + c, offY + r, opts.dark, 0.9)
    }
  // 위치 표시(모서리 큰 네모)는 둥근 사각형으로
  const finder = (fr: number, fc: number) => {
    const x = pad + (offX + fc) * cell
    const y = pad + (offY + fr) * cell
    ctx.fillStyle = opts.dark
    ctx.beginPath()
    ctx.roundRect(x, y, cell * 7, cell * 7, cell * 1.8)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(x + cell, y + cell, cell * 5, cell * 5, cell * 1.3)
    ctx.fill()
    ctx.fillStyle = opts.dark
    ctx.beginPath()
    ctx.roundRect(x + cell * 2, y + cell * 2, cell * 3, cell * 3, cell * 0.9)
    ctx.fill()
  }
  finder(0, 0)
  finder(0, m - 7)
  finder(m - 7, 0)

  return canvas.toDataURL('image/png')
}
