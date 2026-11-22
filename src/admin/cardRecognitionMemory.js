const DB_NAME = 'grand-line-archive-recognition';
const STORE_NAME = 'verified-card-images';
const DB_VERSION = 1;
const MAX_EXAMPLES_PER_PRINTING = 5;
const MAX_DISTANCE = 10;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('This browser does not support local recognition memory.'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('printingId', 'printingId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open recognition memory.'));
  });
}

function imageHash(file) {
  return createImageBitmap(file).then((bitmap) => {
    const canvas = document.createElement('canvas');
    canvas.width = 9;
    canvas.height = 8;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Image comparison is unavailable in this browser.');
    context.drawImage(bitmap, 0, 0, 9, 8);
    bitmap.close?.();
    const pixels = context.getImageData(0, 0, 9, 8).data;
    const gray = [];
    for (let i = 0; i < pixels.length; i += 4) {
      gray.push(Math.round((pixels[i] * 299 + pixels[i + 1] * 587 + pixels[i + 2] * 114) / 1000));
    }
    let hash = 0n;
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        hash = (hash << 1n) | (gray[y * 9 + x] > gray[y * 9 + x + 1] ? 1n : 0n);
      }
    }
    return hash.toString(16).padStart(16, '0');
  });
}

function distance(a, b) {
  let value = BigInt('0x' + a) ^ BigInt('0x' + b);
  let count = 0;
  while (value) {
    value &= value - 1n;
    count += 1;
  }
  return count;
}

function runTransaction(db, mode, action) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let result;
    try { result = action(store); } catch (error) { reject(error); return; }
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error || new Error('Recognition memory transaction failed.'));
    transaction.onabort = () => reject(transaction.error || new Error('Recognition memory transaction was cancelled.'));
  });
}

export async function rememberVerifiedCardImage(file, match) {
  if (!file || !match?.id || !match?.cardNumber) throw new Error('A photograph and confirmed catalogue printing are required.');
  const hash = await imageHash(file);
  const db = await openDatabase();
  try {
    const records = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    const samePrinting = records
      .filter((item) => item.printingId === match.id)
      .sort((a, b) => b.savedAt - a.savedAt);
    const existing = samePrinting.find((item) => item.hash === hash);
    if (existing) {
      existing.savedAt = Date.now();
      existing.image = file.slice(0, file.size, file.type || 'image/jpeg');
      await runTransaction(db, 'readwrite', (store) => store.put(existing));
      return { saved: true, duplicate: true };
    }
    const record = {
      id: match.id + ':' + hash,
      printingId: match.id,
      cardNumber: match.cardNumber,
      name: match.name || '',
      language: match.language || '',
      setCode: match.setCode || '',
      rarity: match.rarity || '',
      variant: match.variant || '',
      image: file.slice(0, file.size, file.type || 'image/jpeg'),
      hash,
      savedAt: Date.now(),
    };
    await runTransaction(db, 'readwrite', (store) => {
      store.put(record);
      samePrinting.slice(MAX_EXAMPLES_PER_PRINTING - 1).forEach((old) => store.delete(old.id));
    });
    return { saved: true, duplicate: false };
  } finally {
    db.close();
  }
}

export async function findRememberedCardImage(file) {
  if (!file) return null;
  const hash = await imageHash(file);
  const db = await openDatabase();
  try {
    const records = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    const ranked = records
      .map((record) => ({ record, distance: distance(hash, record.hash) }))
      .sort((a, b) => a.distance - b.distance || b.record.savedAt - a.record.savedAt);
    const best = ranked[0];
    if (!best || best.distance > MAX_DISTANCE) return null;
    return { ...best.record, similarity: Math.round((64 - best.distance) / 64 * 100) };
  } finally {
    db.close();
  }
}

export async function getRecognitionMemoryStats() {
  const db = await openDatabase();
  try {
    const records = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    return {
      savedExamples: records.length,
      distinctPrintings: new Set(records.map((item) => item.printingId)).size,
    };
  } finally {
    db.close();
  }
}
