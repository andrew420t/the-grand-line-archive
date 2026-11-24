export function validateManualCardCrop(crop, imageWidth, imageHeight) {
  if (!crop || !Number.isFinite(imageWidth) || !Number.isFinite(imageHeight) || imageWidth <= 0 || imageHeight <= 0) return null
  const values = [crop.x, crop.y, crop.width, crop.height].map(Number)
  if (!values.every(Number.isFinite)) return null
  const [x, y, width, height] = values
  if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 || y + height > 1) return null
  // Reject tiny selections: they are unlikely to contain the whole card and
  // can amplify background/noise into misleading OCR.
  if (width < 0.12 || height < 0.12) return null
  const pixelWidth = Math.round(width * imageWidth)
  const pixelHeight = Math.round(height * imageHeight)
  // A normalized crop can still be only a few pixels when the source is tiny.
  // Enforce a modest absolute floor before enlarging it for OCR.
  if (pixelWidth < 64 || pixelHeight < 64) return null
  const pixelX = Math.min(imageWidth - 1, Math.round(x * imageWidth))
  const pixelY = Math.min(imageHeight - 1, Math.round(y * imageHeight))
  return {
    x: pixelX,
    y: pixelY,
    // Rounding the origin and size independently can exceed the image by one
    // pixel at an exact edge. Clamp the origin and size to source bounds.
    width: Math.max(1, Math.min(pixelWidth, imageWidth - pixelX)),
    height: Math.max(1, Math.min(pixelHeight, imageHeight - pixelY)),
  }
}

export function requireConfirmedManualCardCrop(crop, imageWidth, imageHeight, confirmed) {
  // A null crop means manual cropping is disabled: scan the complete photo.
  // An explicit crop object is always treated as a user-selected region and
  // still requires confirmation before any OCR work can use it.
  if (crop == null) {
    if (!Number.isFinite(imageWidth) || !Number.isFinite(imageHeight) || imageWidth < 1 || imageHeight < 1) {
      throw new Error('The card photograph has invalid dimensions.')
    }
    return { x: 0, y: 0, width: Math.floor(imageWidth), height: Math.floor(imageHeight) }
  }
  if (!confirmed) throw new Error('Confirm that the crop contains the entire card before scanning.')
  const bounds = validateManualCardCrop(crop, imageWidth, imageHeight)
  if (!bounds) throw new Error('The manual card crop is invalid or too small for OCR.')
  return bounds
}

export async function prepareManualCardCropFile(file, crop, confirmed = false) {
  if (!file?.type?.startsWith('image/')) throw new Error('Choose a supported card photograph.')
  const sourceUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('The card photograph could not be opened.'))
      element.src = sourceUrl
    })
    const canvas = createManualCropCanvas(image, crop, confirmed)
    const output = await new Promise((resolve, reject) => canvas.toBlob(
      (blob) => blob
        ? resolve(new File([blob], 'manual-card-crop.jpg', { type: 'image/jpeg' }))
        : reject(new Error('Could not prepare the full-card crop for OCR.')),
      'image/jpeg',
      0.96,
    ))
    return output
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}

function createManualCropCanvas(image, crop, confirmed = false) {
  const bounds = requireConfirmedManualCardCrop(crop, image.width, image.height, confirmed)
  const canvas = document.createElement('canvas')
  canvas.width = bounds.width
  canvas.height = bounds.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas image processing is unavailable.')
  context.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height)
  return canvas
}

export function calculateAdaptiveContrastBounds(histogram, totalPixels) {
  if (!histogram?.length || !totalPixels) return null
  const percentileCount = Math.max(1, Math.round(totalPixels * 0.04))
  let low = 0
  let high = histogram.length - 1
  let accumulated = 0
  for (let value = 0; value < histogram.length; value += 1) {
    accumulated += histogram[value] || 0
    if (accumulated >= percentileCount) { low = value; break }
  }
  accumulated = 0
  for (let value = histogram.length - 1; value >= 0; value -= 1) {
    accumulated += histogram[value] || 0
    if (accumulated >= percentileCount) { high = value; break }
  }
  return high - low >= 48 ? { low, high } : null
}

export function enhanceGrayValue(gray, bounds) {
  if (bounds && bounds.high > bounds.low) {
    return Math.max(8, Math.min(247, Math.round((gray - bounds.low) * 239 / (bounds.high - bounds.low) + 8)))
  }
  return Math.max(0, Math.min(255, Math.round((gray - 112) * 1.8 + 128)))
}


// Mild unsharp masking restores edges softened by phone-camera focus and crop
// enlargement. A noise threshold prevents flat foil/grain from being amplified.
export function sharpenGrayPixels(grayPixels, width, height, amount = 0.55, threshold = 8) {
  if (!grayPixels || !Number.isInteger(width) || !Number.isInteger(height) || width < 3 || height < 3 || grayPixels.length !== width * height) return grayPixels
  const source = grayPixels instanceof Uint8Array ? grayPixels : Uint8Array.from(grayPixels)
  const output = new Uint8Array(source)
  for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
    const index = y * width + x
    const blurred = (
      source[index] * 4 +
      source[index - width] * 2 + source[index + width] * 2 +
      source[index - 1] * 2 + source[index + 1] * 2 +
      source[index - width - 1] + source[index - width + 1] +
      source[index + width - 1] + source[index + width + 1]
    ) / 16
    const detail = source[index] - blurred
    if (Math.abs(detail) >= threshold) output[index] = Math.max(0, Math.min(255, Math.round(source[index] + detail * amount)))
  }
  return output
}

const CROP_ZONES = [
  { label: 'Bottom-left number area', x: 0, y: 0.72, width: 0.72, height: 0.28 },
  { label: 'Bottom-right number area', x: 0.28, y: 0.72, width: 0.72, height: 0.28 },
  { label: 'Full bottom edge', x: 0, y: 0.66, width: 1, height: 0.34 },
  { label: 'Lower-centre detail', x: 0.12, y: 0.62, width: 0.76, height: 0.38 },
]

export const CARD_NUMBER_SCAN_ROTATIONS = [90, 180, 270]

function createRotatedImageCanvas(image, rotation) {
  const radians = rotation * Math.PI / 180
  const swapDimensions = rotation === 90 || rotation === 270
  const canvas = document.createElement('canvas')
  canvas.width = swapDimensions ? image.height : image.width
  canvas.height = swapDimensions ? image.width : image.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas image processing is unavailable.')
  context.translate(canvas.width / 2, canvas.height / 2)
  context.rotate(radians)
  context.drawImage(image, -image.width / 2, -image.height / 2)
  return canvas
}

async function createEnhancedCrop(image, zone, filename) {
  const cropX = Math.min(image.width - 1, Math.max(0, Math.round(image.width * zone.x)))
  const cropY = Math.min(image.height - 1, Math.max(0, Math.round(image.height * zone.y)))
  const cropWidth = Math.max(1, Math.min(Math.round(image.width * zone.width), image.width - cropX))
  const cropHeight = Math.max(1, Math.min(Math.round(image.height * zone.height), image.height - cropY))
  // Enlarge the number area to make small printed text easier for OCR.
  const scale = Math.max(1, Math.min(6, 2200 / Math.max(cropWidth, cropHeight)))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(cropWidth * scale))
  canvas.height = Math.max(1, Math.round(cropHeight * scale))
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas image processing is unavailable.')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height)

  // Adaptive grayscale contrast tolerates darker, brighter, and foil photos.
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  const histogram = new Uint32Array(256)
  const grays = new Uint8Array(pixels.data.length / 4)
  for (let i = 0, pixel = 0; i < pixels.data.length; i += 4, pixel += 1) {
    const gray = Math.round(pixels.data[i] * 0.299 + pixels.data[i + 1] * 0.587 + pixels.data[i + 2] * 0.114)
    grays[pixel] = gray
    histogram[gray] += 1
  }
  const bounds = calculateAdaptiveContrastBounds(histogram, grays.length)
  const enhancedGrays = Uint8Array.from(grays, (gray) => enhanceGrayValue(gray, bounds))
  const sharpenedGrays = sharpenGrayPixels(enhancedGrays, canvas.width, canvas.height)
  for (let i = 0, pixel = 0; i < pixels.data.length; i += 4, pixel += 1) {
    const enhanced = sharpenedGrays[pixel]
    pixels.data[i] = enhanced
    pixels.data[i + 1] = enhanced
    pixels.data[i + 2] = enhanced
  }
  context.putImageData(pixels, 0, 0)
  const output = await new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob
      ? resolve(new File([blob], filename, { type: 'image/jpeg' }))
      : reject(new Error('Could not prepare the enlarged card-number crop.')),
    'image/jpeg',
    0.96,
  ))
  return output
}

export async function prepareCardNumberRegions(file, manualCrop = null, confirmed = false) {
  if (!file?.type?.startsWith('image/')) throw new Error('Choose a supported card photograph.')
  const sourceUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('The card photograph could not be opened.'))
      element.src = sourceUrl
    })

    const scanImage = createManualCropCanvas(image, manualCrop, confirmed)
    const regions = await Promise.all(CROP_ZONES.map(async (zone, index) => ({
      label: zone.label,
      file: await createEnhancedCrop(scanImage, zone, `card-number-region-${index + 1}.jpg`),
    })))

    // For sideways/upside-down photos, rotate the image and OCR only its footer band.
    // This avoids quadrupling the expensive focused-crop OCR work.
    const orientationRegions = await Promise.all(CARD_NUMBER_SCAN_ROTATIONS.map(async (rotation) => {
      const oriented = createRotatedImageCanvas(scanImage, rotation)
      return {
        label: `Footer after ${rotation}° rotation`,
        file: await createEnhancedCrop(oriented, { x: 0, y: 0.65, width: 1, height: 0.35 }, `card-number-rotation-${rotation}.jpg`),
      }
    }))
    return [...regions, ...orientationRegions]
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}
