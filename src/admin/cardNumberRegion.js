export async function prepareCardNumberRegion(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Choose a supported card photograph.')
  const sourceUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('The card photograph could not be opened.'))
      element.src = sourceUrl
    })
    // Generous lower-right crop: includes the set/card number and nearby rarity mark.
    const cropX = Math.round(image.width * 0.54)
    const cropY = Math.round(image.height * 0.76)
    const cropWidth = image.width - cropX
    const cropHeight = image.height - cropY
    const scale = Math.max(3, Math.min(5, 1800 / Math.max(cropWidth, cropHeight)))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(cropWidth * scale))
    canvas.height = Math.max(1, Math.round(cropHeight * scale))
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Canvas image processing is unavailable.')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < pixels.data.length; i += 4) {
      const gray = Math.round(pixels.data[i] * 0.299 + pixels.data[i + 1] * 0.587 + pixels.data[i + 2] * 0.114)
      const enhanced = Math.max(0, Math.min(255, (gray - 112) * 1.8 + 128))
      pixels.data[i] = enhanced
      pixels.data[i + 1] = enhanced
      pixels.data[i + 2] = enhanced
    }
    context.putImageData(pixels, 0, 0)
    return await new Promise((resolve, reject) => canvas.toBlob(
      (blob) => blob ? resolve(new File([blob], 'card-number-region.jpg', { type: 'image/jpeg' })) : reject(new Error('Could not prepare the card-number crop.')),
      'image/jpeg',
      0.96,
    ))
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}
