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

  let cropWidth = rotatedWidth
  let cropHeight = rotatedHeight
  if (cropToCard) {
    if (rotatedWidth / rotatedHeight > CARD_ASPECT_RATIO) {
      cropWidth = rotatedHeight * CARD_ASPECT_RATIO
    } else {
      cropHeight = rotatedWidth / CARD_ASPECT_RATIO
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
    (rotatedWidth - cropWidth) / 2,
    (rotatedHeight - cropHeight) / 2,
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
