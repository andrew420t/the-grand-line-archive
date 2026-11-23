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
  const cropX = Math.round(image.width * zone.x)
  const cropY = Math.round(image.height * zone.y)
  const cropWidth = Math.max(1, Math.round(image.width * zone.width))
  const cropHeight = Math.max(1, Math.round(image.height * zone.height))
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

  // Greyscale + contrast enhancement to preserve small number print.
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  for (let i = 0; i < pixels.data.length; i += 4) {
    const gray = Math.round(pixels.data[i] * 0.299 + pixels.data[i + 1] * 0.587 + pixels.data[i + 2] * 0.114)
    const enhanced = Math.max(0, Math.min(255, (gray - 112) * 1.8 + 128))
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

export async function prepareCardNumberRegions(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Choose a supported card photograph.')
  const sourceUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('The card photograph could not be opened.'))
      element.src = sourceUrl
    })

    const regions = await Promise.all(CROP_ZONES.map(async (zone, index) => ({
      label: zone.label,
      file: await createEnhancedCrop(image, zone, `card-number-region-${index + 1}.jpg`),
    })))

    // For sideways/upside-down photos, rotate the image and OCR only its footer band.
    // This avoids quadrupling the expensive focused-crop OCR work.
    const orientationRegions = await Promise.all(CARD_NUMBER_SCAN_ROTATIONS.map(async (rotation) => {
      const oriented = createRotatedImageCanvas(image, rotation)
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
