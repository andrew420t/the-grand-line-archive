export function detectForegroundCardBounds(imageData, options = {}) {
  const { width, height, data } = imageData || {}
  if (!width || !height || !data || data.length < width * height * 4) return null
  const threshold = options.threshold ?? 48
  const cornerSize = Math.max(1, Math.floor(Math.min(width, height) * 0.035))
  const corners = []
  const sampleCorner = (sx, sy) => {
    let r = 0, g = 0, b = 0, count = 0
    for (let y = 0; y < cornerSize; y += 1) for (let x = 0; x < cornerSize; x += 1) {
      const px = sx ? width - 1 - x : x, py = sy ? height - 1 - y : y
      const i = (py * width + px) * 4
      r += data[i]; g += data[i + 1]; b += data[i + 2]; count += 1
    }
    return [r / count, g / count, b / count]
  }
  corners.push(sampleCorner(0, 0), sampleCorner(1, 0), sampleCorner(0, 1), sampleCorner(1, 1))
  const background = corners.reduce((avg, c) => avg.map((v, i) => v + c[i] / corners.length), [0, 0, 0])
  const cornerSpread = Math.max(...corners.map(c => Math.sqrt(c.reduce((sum, v, i) => sum + (v - background[i]) ** 2, 0))))
  if (cornerSpread > 42) return null

  // Work on a coarse mask, then keep only the largest connected foreground
  // component. Isolated shadows, dust and unrelated background objects won't
  // expand the crop bounds as easily as the previous global min/max approach.
  const step = Math.max(1, Math.floor(Math.min(width, height) / 900))
  const gridWidth = Math.ceil(width / step), gridHeight = Math.ceil(height / step)
  const mask = new Uint8Array(gridWidth * gridHeight)
  let foreground = 0
  for (let gy = 0; gy < gridHeight; gy += 1) for (let gx = 0; gx < gridWidth; gx += 1) {
    const x = gx * step, y = gy * step, i = (y * width + x) * 4
    const distance = Math.sqrt((data[i] - background[0]) ** 2 + (data[i + 1] - background[1]) ** 2 + (data[i + 2] - background[2]) ** 2)
    if (distance >= threshold) { mask[gy * gridWidth + gx] = 1; foreground += 1 }
  }
  if (!foreground) return null
  const visited = new Uint8Array(mask.length)
  const queue = new Int32Array(mask.length)
  let best = null
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue
    let head = 0, tail = 0
    queue[tail++] = start; visited[start] = 1
    let minGX = gridWidth, minGY = gridHeight, maxGX = -1, maxGY = -1
    while (head < tail) {
      const index = queue[head++], gx = index % gridWidth, gy = Math.floor(index / gridWidth)
      minGX = Math.min(minGX, gx); minGY = Math.min(minGY, gy)
      maxGX = Math.max(maxGX, gx); maxGY = Math.max(maxGY, gy)
      for (let ny = Math.max(0, gy - 1); ny <= Math.min(gridHeight - 1, gy + 1); ny += 1) {
        for (let nx = Math.max(0, gx - 1); nx <= Math.min(gridWidth - 1, gx + 1); nx += 1) {
          const neighbor = ny * gridWidth + nx
          if (mask[neighbor] && !visited[neighbor]) { visited[neighbor] = 1; queue[tail++] = neighbor }
        }
      }
    }
    if (!best || tail > best.area) best = { area: tail, minGX, minGY, maxGX, maxGY }
  }
  if (!best || best.area < foreground * 0.45) return null
  const minX = best.minGX * step, minY = best.minGY * step
  const maxX = Math.min(width - 1, best.maxGX * step), maxY = Math.min(height - 1, best.maxGY * step)
  const boxWidth = maxX - minX + 1, boxHeight = maxY - minY + 1
  const ratio = boxWidth / boxHeight
  const coverage = best.area / (gridWidth * gridHeight)
  if (ratio < 0.48 || ratio > 0.96 || coverage < 0.08 || coverage > 0.88) return null
  const padX = Math.round(boxWidth * 0.035), padY = Math.round(boxHeight * 0.035)
  return {
    x: Math.max(0, minX - padX), y: Math.max(0, minY - padY),
    width: Math.min(width, maxX + padX + 1) - Math.max(0, minX - padX),
    height: Math.min(height, maxY + padY + 1) - Math.max(0, minY - padY),
    confidence: Math.max(0, Math.min(1, (42 - cornerSpread) / 42 * Math.min(1, coverage / 0.2))),
  }
}

export function calculateCardAspectCrop(imageWidth, imageHeight, bounds, aspectRatio = 0.715) {
  if (!imageWidth || !imageHeight || !bounds || bounds.width <= 0 || bounds.height <= 0) return null
  let cropWidth = bounds.width * 1.06, cropHeight = bounds.height * 1.06
  if (cropWidth / cropHeight > aspectRatio) cropHeight = cropWidth / aspectRatio
  else cropWidth = cropHeight * aspectRatio
  if (cropWidth > imageWidth || cropHeight > imageHeight) return null
  const centerX = bounds.x + bounds.width / 2, centerY = bounds.y + bounds.height / 2
  return {
    x: Math.max(0, Math.min(imageWidth - cropWidth, centerX - cropWidth / 2)),
    y: Math.max(0, Math.min(imageHeight - cropHeight, centerY - cropHeight / 2)),
    width: cropWidth, height: cropHeight,
  }
}

const MAX_IMAGE_EDGE = 1800
const CARD_ASPECT_RATIO = 0.715

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('The selected image could not be opened.'))
    }
    image.src = url
  })

const canvasToBlob = (canvas, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('The browser could not process this image.'))
      },
      'image/jpeg',
      quality,
    )
  })

export async function prepareCardImage(file, rotation = 0, cropToCard = false) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Choose a supported image file.')
  }

  const image = await loadImage(file)
  const normalizedRotation = ((rotation % 360) + 360) % 360
  const quarterTurn = normalizedRotation === 90 || normalizedRotation === 270
  const rotatedWidth = quarterTurn ? image.height : image.width
  const rotatedHeight = quarterTurn ? image.width : image.height
  const rotatedCanvas = document.createElement('canvas')
  rotatedCanvas.width = rotatedWidth
  rotatedCanvas.height = rotatedHeight
  const rotatedContext = rotatedCanvas.getContext('2d')
  if (!rotatedContext) throw new Error('Canvas image processing is unavailable.')

  rotatedContext.translate(rotatedWidth / 2, rotatedHeight / 2)
  rotatedContext.rotate((normalizedRotation * Math.PI) / 180)
  rotatedContext.drawImage(image, -image.width / 2, -image.height / 2)

  let cropX = 0, cropY = 0, cropWidth = rotatedWidth, cropHeight = rotatedHeight
  if (cropToCard) {
    const detected = detectForegroundCardBounds(rotatedContext.getImageData(0, 0, rotatedWidth, rotatedHeight))
    const detectedCrop = detected?.confidence >= 0.35
      ? calculateCardAspectCrop(rotatedWidth, rotatedHeight, detected)
      : null
    if (detectedCrop) {
      cropX = detectedCrop.x; cropY = detectedCrop.y
      cropWidth = detectedCrop.width; cropHeight = detectedCrop.height
    } else if (rotatedWidth / rotatedHeight > CARD_ASPECT_RATIO) {
      cropWidth = rotatedHeight * CARD_ASPECT_RATIO
      cropX = (rotatedWidth - cropWidth) / 2
    } else {
      cropHeight = rotatedWidth / CARD_ASPECT_RATIO
      cropY = (rotatedHeight - cropHeight) / 2
    }
  }

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(cropWidth, cropHeight))
  const output = document.createElement('canvas')
  output.width = Math.max(1, Math.round(cropWidth * scale))
  output.height = Math.max(1, Math.round(cropHeight * scale))
  const context = output.getContext('2d')
  if (!context) throw new Error('Canvas image processing is unavailable.')

  context.drawImage(
    rotatedCanvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    output.width,
    output.height,
  )

  return canvasToBlob(output, 0.9)
}

export function makePhotoFile(blob, originalName = 'card-photo.jpg') {
  const baseName = originalName.replace(/\.[^.]+$/, '') || 'card-photo'
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
}
