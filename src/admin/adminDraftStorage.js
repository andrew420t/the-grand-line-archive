const DATABASE_NAME = 'grand-line-admin-drafts'
const DATABASE_VERSION = 2
const PHOTO_STORE = 'photoDrafts'
const LIBRARY_FILE_STORE = 'libraryFileDrafts'
const DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000

const workspaceKey = (userId) => `gla:admin-workspace:${userId}`
const quickAddKey = (userId) => `gla:quick-add-draft:${userId}`

function readJson(key) {
  try {
    if (typeof localStorage === 'undefined') return null
    const parsed = JSON.parse(localStorage.getItem(key) || 'null')
    if (!parsed || !parsed.savedAt || Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(key)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function readAdminWorkspaceDraft(userId) {
  if (!userId) return null
  const draft = readJson(workspaceKey(userId))
  return draft ? {
    activeSection: typeof draft.activeSection === 'string' ? draft.activeSection : 'overview',
    scanFields: draft.scanFields && typeof draft.scanFields === 'object' ? draft.scanFields : null,
    rawText: typeof draft.rawText === 'string' ? draft.rawText : '',
  } : null
}

export function saveAdminWorkspaceDraft(userId, { activeSection, scanFields, rawText }) {
  if (!userId || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(workspaceKey(userId), JSON.stringify({
      savedAt: Date.now(),
      activeSection,
      scanFields,
      rawText,
    }))
  } catch {
    // Draft recovery is best-effort; never interrupt card entry if storage is full.
  }
}

export function readQuickAddDraft(userId) {
  if (!userId) return null
  const draft = readJson(quickAddKey(userId))
  if (!draft?.form || typeof draft.form !== 'object') return null
  return {
    form: draft.form,
    partialProductId: typeof draft.partialProductId === 'string' ? draft.partialProductId : '',
    savedAt: draft.savedAt,
  }
}

export function saveQuickAddDraft(userId, { form, partialProductId = '' }) {
  if (!userId || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(quickAddKey(userId), JSON.stringify({
      savedAt: Date.now(),
      form,
      partialProductId,
    }))
  } catch {
    // Draft recovery is best-effort; never interrupt card entry if storage is full.
  }
}

export function clearQuickAddDraft(userId) {
  if (!userId || typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(quickAddKey(userId))
  } catch {
    // Ignore unavailable browser storage.
  }
}

function openPhotoDatabase() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('This browser does not support local photo draft storage.'))
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(PHOTO_STORE)) {
        database.createObjectStore(PHOTO_STORE, { keyPath: 'userId' })
      }
      if (!database.objectStoreNames.contains(LIBRARY_FILE_STORE)) {
        database.createObjectStore(LIBRARY_FILE_STORE, { keyPath: 'userId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Could not open local photo draft storage.'))
    request.onblocked = () => reject(new Error('Local photo draft storage is blocked by another browser tab.'))
  })
}

export async function loadAdminPhotoDraft(userId) {
  if (!userId) return []
  const database = await openPhotoDatabase()
  try {
    const record = await new Promise((resolve, reject) => {
      const transaction = database.transaction(PHOTO_STORE, 'readonly')
      const request = transaction.objectStore(PHOTO_STORE).get(userId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error || new Error('Could not read saved photographs.'))
      transaction.onabort = () => reject(transaction.error || new Error('Could not read saved photographs.'))
    })
    if (!record) return []
    if (!record.savedAt || Date.now() - record.savedAt > DRAFT_TTL_MS) {
      await deleteAdminPhotoDraft(userId)
      return []
    }
    return (record.photos || []).map((photo) => {
      const file = new File([photo.blob], photo.name, {
        type: photo.type || photo.blob?.type || 'image/jpeg',
        lastModified: photo.lastModified || Date.now(),
      })
      return {
        id: photo.id,
        file,
        previewUrl: URL.createObjectURL(file),
        name: photo.name,
        role: photo.role || 'detail',
        rotation: Number(photo.rotation) || 0,
        cropToCard: Boolean(photo.cropToCard),
      }
    })
  } finally {
    database.close()
  }
}

export async function saveAdminPhotoDraft(userId, photos) {
  if (!userId) return
  const database = await openPhotoDatabase()
  try {
    const storedPhotos = (photos || []).filter((photo) => photo?.file instanceof Blob).map((photo) => ({
      id: photo.id,
      name: photo.name || photo.file.name || 'card-photo',
      type: photo.file.type || 'image/jpeg',
      lastModified: photo.file.lastModified || Date.now(),
      role: photo.role || 'detail',
      rotation: Number(photo.rotation) || 0,
      cropToCard: Boolean(photo.cropToCard),
      blob: photo.file,
    }))
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(PHOTO_STORE, 'readwrite')
      transaction.objectStore(PHOTO_STORE).put({
        userId,
        savedAt: Date.now(),
        photos: storedPhotos,
      })
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error || new Error('Could not save photographs on this device.'))
      transaction.onabort = () => reject(transaction.error || new Error('Could not save photographs on this device.'))
    })
  } finally {
    database.close()
  }
}

export async function deleteAdminPhotoDraft(userId) {
  if (!userId) return
  const database = await openPhotoDatabase()
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(PHOTO_STORE, 'readwrite')
      transaction.objectStore(PHOTO_STORE).delete(userId)
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error || new Error('Could not clear saved photographs.'))
      transaction.onabort = () => reject(transaction.error || new Error('Could not clear saved photographs.'))
    })
  } finally {
    database.close()
  }
}

export async function loadAdminLibraryFileDraft(userId) {
  if (!userId) return []
  const database = await openPhotoDatabase()
  try {
    const record = await new Promise((resolve, reject) => {
      const transaction = database.transaction(LIBRARY_FILE_STORE, 'readonly')
      const request = transaction.objectStore(LIBRARY_FILE_STORE).get(userId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error || new Error('Could not read the saved image upload queue.'))
      transaction.onabort = () => reject(transaction.error || new Error('Could not read the saved image upload queue.'))
    })
    if (!record) return []
    if (!record.savedAt || Date.now() - record.savedAt > DRAFT_TTL_MS) {
      await deleteAdminLibraryFileDraft(userId)
      return []
    }
    return (record.files || []).map((item) => new File([item.blob], item.name, {
      type: item.type || item.blob?.type || 'image/jpeg',
      lastModified: item.lastModified || Date.now(),
    }))
  } finally {
    database.close()
  }
}

export async function saveAdminLibraryFileDraft(userId, files) {
  if (!userId) return
  const database = await openPhotoDatabase()
  try {
    const storedFiles = (files || []).filter((file) => file instanceof Blob).map((file) => ({
      name: file.name || 'card-image',
      type: file.type || 'image/jpeg',
      lastModified: file.lastModified || Date.now(),
      blob: file,
    }))
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(LIBRARY_FILE_STORE, 'readwrite')
      transaction.objectStore(LIBRARY_FILE_STORE).put({
        userId,
        savedAt: Date.now(),
        files: storedFiles,
      })
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error || new Error('Could not save the image upload queue on this device.'))
      transaction.onabort = () => reject(transaction.error || new Error('Could not save the image upload queue on this device.'))
    })
  } finally {
    database.close()
  }
}

export async function deleteAdminLibraryFileDraft(userId) {
  if (!userId) return
  const database = await openPhotoDatabase()
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(LIBRARY_FILE_STORE, 'readwrite')
      transaction.objectStore(LIBRARY_FILE_STORE).delete(userId)
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error || new Error('Could not clear the saved image upload queue.'))
      transaction.onabort = () => reject(transaction.error || new Error('Could not clear the saved image upload queue.'))
    })
  } finally {
    database.close()
  }
}
