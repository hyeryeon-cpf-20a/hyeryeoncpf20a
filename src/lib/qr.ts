import QRCode from 'qrcode'

/** 하트 안에 들어가 있는지 (x, y: -1.3~1.3 범위, 위가 -y) */
function inHeart(x: number, y: number) {
  // 고전적인 하트 곡선 (x² + y² − 1)³ − x²·y³ ≤ 0 (y 는 위쪽이 +)
  const yy = -y
  const a = x * x + yy * yy - 1
  return a * a * a - x * x * yy * yy * yy <= 0
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
  // 하트 격자 크기: QR(+여백)이 하트 안에 다 들어갈 때까지 키움
  let G = m + quiet * 2 + 6
  const qrTopRatio = 0.3 // QR 을 하트의 위쪽 넓은 부분에 배치
  const fits = (g: number) => {
    const off = Math.round((g - m) / 2)
    const offY = Math.round(g * qrTopRatio)
    for (let r = -quiet; r < m + quiet; r++)
      for (let c = -quiet; c < m + quiet; c++) {
        const x = ((off + c + 0.5) / g) * 2.6 - 1.3
        const y = ((offY + r + 0.5) / g) * 2.6 - 1.45
        if (!inHeart(x, y)) return false
      }
    return true
  }
  while (!fits(G) && G < m * 4) G++
  const offX = Math.round((G - m) / 2)
  const offY = Math.round(G * qrTopRatio)

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
      const y = ((r + 0.5) / G) * 2.6 - 1.45
      const inQrZone = c >= offX - quiet && c < offX + m + quiet && r >= offY - quiet && r < offY + m + quiet
      if (!inHeart(x, y) || inQrZone) continue
      if (rnd() < 0.52) dot(c, r, opts.soft, 0.78)
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
