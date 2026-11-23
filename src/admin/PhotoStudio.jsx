import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, RotateCw, Upload, X } from 'lucide-react'

const photoRoles = [
  ['front', 'Card front'],
  ['back', 'Card back'],
  ['detail', 'Detail / other'],
]

const newPhotoId = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`

export default function PhotoStudio({ photos, onPhotosChange }) {
  const [cameraActive, setCameraActive] = useState(false)
  const [facingMode, setFacingMode] = useState('environment')
  const [selectedRole, setSelectedRole] = useState('front')
  const [cameraError, setCameraError] = useState('')
  const [notice, setNotice] = useState('')
  const [isCapturing, setIsCapturing] = useState(false)
  const videoRef = useRef(null)
  const inputRef = useRef(null)
  const captureLock = useRef(false)

  useEffect(() => {
    if (!cameraActive) return undefined

    let active = true
    let stream
    const videoElement = videoRef.current
    const startCamera = async () => {
      setCameraError('')
      setNotice('')
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not available in this browser or page context.')
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        })
        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        if (videoElement) {
          videoElement.srcObject = stream
          await videoElement.play()
        }
      } catch (error) {
        stream?.getTracks().forEach((track) => track.stop())
        if (videoElement) videoElement.srcObject = null
        if (!active) return
        const message =
          error.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access in your browser settings and try again.'
            : error.name === 'NotFoundError'
              ? 'No camera was found. Upload a photograph instead.'
              : `Could not start the camera: ${error.message}`
        setCameraError(message)
      }
    }

    startCamera()
    return () => {
      active = false
      stream?.getTracks().forEach((track) => track.stop())
      if (videoElement) videoElement.srcObject = null
    }
  }, [cameraActive, facingMode])

  const addFiles = (fileList) => {
    const imageFiles = [...fileList].filter((file) => file.type.startsWith('image/'))
    const rejectedCount = fileList.length - imageFiles.length
    const remaining = Math.max(0, 12 - photos.length)
    const accepted = imageFiles.slice(0, remaining)
    if (!accepted.length) {
      setNotice(rejectedCount ? 'Choose image files to add photographs.' : 'The photo limit is 12 per batch.')
      return
    }

    onPhotosChange((current) => [
      ...current,
      ...accepted.map((file, index) => {
        const role =
          index === 0 && !current.some((photo) => photo.role === selectedRole)
            ? selectedRole
            : 'detail'
        return {
          id: newPhotoId(),
          file,
          previewUrl: URL.createObjectURL(file),
          name: file.name,
          role,
          rotation: 0,
          cropToCard: false,
        }
      }),
    ])
    setNotice(`${accepted.length} photograph${accepted.length === 1 ? '' : 's'} ready for review.`)
    if (rejectedCount) setCameraError(`${rejectedCount} non-image file${rejectedCount === 1 ? ' was' : 's were'} skipped.`)
  }

  const capturePhoto = async () => {
    const video = videoRef.current
    if (captureLock.current) return
    if (!video?.videoWidth || !video.videoHeight) {
      setCameraError('The camera preview is not ready yet.')
      return
    }
    captureLock.current = true
    setIsCapturing(true)
    setCameraError('')
    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Image capture is unavailable in this browser.')
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (captured) => captured
            ? resolve(captured)
            : reject(new Error('The camera image could not be captured.')),
          'image/jpeg',
          0.94,
        )
      })
      const file = new File([blob], `card-${selectedRole}-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      })
      addFiles([file])
    } catch (error) {
      setCameraError(error.message)
    } finally {
      captureLock.current = false
      setIsCapturing(false)
    }
  }

  const removePhoto = (photo) => {
    URL.revokeObjectURL(photo.previewUrl)
    onPhotosChange((current) => current.filter((entry) => entry.id !== photo.id))
  }

  const updatePhoto = (photoId, updates) => {
    onPhotosChange((current) =>
      current.map((photo) => (photo.id === photoId ? { ...photo, ...updates } : photo)),
    )
  }

  const toggleCamera = () => {
    setCameraError('')
    setNotice('')
    setCameraActive((active) => !active)
  }

  return (
    <section className="photo-studio" aria-label="Card photography">
      <div className="photo-studio__toolbar">
        <label className="form-field photo-role-picker">
          <span>Photograph side</span>
          <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
            {photoRoles.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <div className="photo-studio__actions">
          <button className="button button--outline" type="button" onClick={toggleCamera}>
            <Camera size={15} /> {cameraActive ? 'Close camera' : 'Open camera'}
          </button>
          <button className="button button--outline" type="button" onClick={() => inputRef.current?.click()}>
            <Upload size={15} /> Upload photographs
          </button>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files)
              event.target.value = ''
            }}
          />
        </div>
      </div>

      {cameraActive && (
        <div className="camera-panel">
          <div className="camera-preview">
            <video ref={videoRef} autoPlay muted playsInline />
            <span className="camera-frame" aria-hidden="true" />
          </div>
          <div className="camera-controls">
            <span>Live camera preview · {facingMode === 'environment' ? 'rear camera' : 'front camera'}</span>
            <div>
              <button
                className="button button--outline"
                type="button"
                onClick={() => setFacingMode((current) => current === 'environment' ? 'user' : 'environment')}
              >
                Switch camera
              </button>
              <button className="button button--gold" type="button" disabled={isCapturing} onClick={capturePhoto}>
                <Camera size={15} /> {isCapturing ? 'Capturing…' : 'Capture photograph'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cameraError && <p className="form-error photo-message" role="alert">{cameraError}</p>}
      {notice && <p className="form-notice photo-message" role="status">{notice}</p>}

      <div className="photo-studio__heading">
        <div>
          <p className="eyebrow">PHOTO REVIEW</p>
          <h3>{photos.length ? `${photos.length} photograph${photos.length === 1 ? '' : 's'} ready` : 'No photographs yet'}</h3>
        </div>
        {photos.length > 0 && <span>Review each image before saving</span>}
      </div>

      {photos.length ? (
        <div className="photo-grid">
          {photos.map((photo) => (
            <article className="photo-card" key={photo.id}>
              <div className={`photo-card__preview ${photo.cropToCard ? 'photo-card__preview--crop' : ''}`}>
                <img
                  src={photo.previewUrl}
                  alt={`${photoRoles.find(([value]) => value === photo.role)?.[1] || 'Card'} preview`}
                  style={{ transform: `rotate(${photo.rotation}deg)` }}
                />
                <button className="photo-remove" type="button" aria-label={`Remove ${photo.name}`} onClick={() => removePhoto(photo)}><X size={15} /></button>
              </div>
              <div className="photo-card__body">
                <span className="photo-card__name" title={photo.name}>{photo.name}</span>
                <label className="sr-only" htmlFor={`photo-role-${photo.id}`}>Photo side</label>
                <select
                  id={`photo-role-${photo.id}`}
                  value={photo.role}
                  onChange={(event) => updatePhoto(photo.id, { role: event.target.value })}
                >
                  {photoRoles.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
                <div className="photo-card__tools">
                  <button type="button" onClick={() => updatePhoto(photo.id, { rotation: (photo.rotation + 270) % 360 })} aria-label={`Rotate ${photo.name} left`}><RotateCw size={14} className="rotate-left" /> Left</button>
                  <button type="button" onClick={() => updatePhoto(photo.id, { rotation: (photo.rotation + 90) % 360 })} aria-label={`Rotate ${photo.name} right`}><RotateCw size={14} /> Right</button>
                  <button
                    className={photo.cropToCard ? 'is-selected' : ''}
                    type="button"
                    onClick={() => updatePhoto(photo.id, { cropToCard: !photo.cropToCard })}
                  >
                    {photo.cropToCard ? 'Card crop' : 'Crop to card'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <button className="photo-dropzone" type="button" onClick={() => inputRef.current?.click()}>
          <ImagePlus size={23} />
          <strong>Add a card photograph</strong>
          <span>Capture with your camera or choose one or more images from your device.</span>
        </button>
      )}
    </section>
  )
}
