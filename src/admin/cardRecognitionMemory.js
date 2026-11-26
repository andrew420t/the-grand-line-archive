import { supabase } from '../lib/supabase'
import { makePhotoFile, prepareCardImage } from './imageTools'

const SHARED_BUCKET = 'card-recognition-references'
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
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 9;
      canvas.height = 8;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Image comparison is unavailable in this browser.');
      context.drawImage(bitmap, 0, 0, 9, 8);
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
    } finally {
      bitmap.close?.();
    }
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

async function saveSharedExample(file, match, hash) {
  if (!supabase || !match?.id) return { saved: false, reason: 'Supabase is not configured.' }
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user) return { saved: false, reason: 'Sign in as an administrator to contribute shared examples.' }
  const path = `${encodeURIComponent(match.id)}/${hash}.jpg`
  const storage = supabase.storage.from(SHARED_BUCKET)
  // This is the original scan photo, not guaranteed to be card-cropped. The
  // matching feature stores its hash; the uploaded source image must stay private.
  const compressed = await prepareCardImage(file)
  const referenceFile = makePhotoFile(compressed, file.name || 'verified-card.jpg')
  const upload = await storage.upload(path, referenceFile, {
    contentType: 'image/jpeg',
    upsert: false,
    cacheControl: '31536000',
  })
  const alreadyUploaded = upload.error && (upload.error.statusCode === '409' || upload.error.statusCode === 409)
  if (upload.error && !alreadyUploaded) throw new Error(upload.error.message)
  const { error } = await supabase.from('card_recognition_examples').insert({
    printing_id: match.id,
    card_number: match.cardNumber,
    card_name: match.name || '',
    language: match.language || 'English',
    set_code: match.setCode || '',
    rarity: match.rarity || '',
    variant: match.variant || '',
    image_hash: hash,
    storage_path: path,
    confirmed_by: authData.user.id,
  })
  if (error && error.code !== '23505') {
    if (!alreadyUploaded) {
      try {
        const cleanup = await storage.remove([path])
        if (cleanup.error) throw new Error(cleanup.error.message)
      } catch (cleanupError) {
        throw new Error(`${error.message} (Recognition image cleanup failed: ${cleanupError.message || String(cleanupError)})`)
      }
    }
    throw new Error(error.message)
  }
  return { saved: true, duplicate: Boolean(alreadyUploaded || error?.code === '23505') }
}

export async function rememberVerifiedCardImage(file, match) {
  if (!file || !match?.id || !match?.cardNumber) throw new Error('A photograph and confirmed catalogue printing are required.');
  const hash = await imageHash(file);
  let shared = { saved: false }
  try { shared = await saveSharedExample(file, match, hash) } catch (error) { shared = { saved: false, error: error.message } }
  let db
  try { db = await openDatabase() } catch (error) {
    return { saved: Boolean(shared.saved), duplicate: Boolean(shared.duplicate), shared, localError: error.message }
  }
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
      return { saved: true, duplicate: true, shared };
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
    return { saved: true, duplicate: false, shared };
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


export async function findSharedRememberedCardImage(file) {
  if (!supabase || !file) return null
  const hash = await imageHash(file)
  const pageSize = 1000
  let offset = 0
  const data = []
  while (true) {
    const { data: page, error } = await supabase
      .from('card_recognition_examples')
      .select('printing_id,card_number,card_name,language,set_code,rarity,variant,image_hash,storage_path,confirmed_at')
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1)
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') return null
      throw new Error(error.message)
    }
    data.push(...(page || []))
    if (!page || page.length < pageSize) break
    offset += pageSize
  }
  const ranked = data
    .map((record) => ({ record, distance: distance(hash, record.image_hash) }))
    .sort((a, b) => a.distance - b.distance)
  const best = ranked[0]
  if (!best || best.distance > MAX_DISTANCE) return null
  return {
    printingId: best.record.printing_id,
    cardNumber: best.record.card_number,
    name: best.record.card_name,
    language: best.record.language,
    setCode: best.record.set_code,
    rarity: best.record.rarity,
    variant: best.record.variant,
    similarity: Math.round((64 - best.distance) / 64 * 100),
    shared: true,
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


/**
 * Returns a previously confirmed photograph for this exact catalogue printing.
 * It deliberately does not fall back by card number alone: language, set and
 * parallel-printing identity are part of the printing ID.
 */
export async function getRememberedCardImageForPrinting(printingId) {
  if (!printingId) return null;
  const db = await openDatabase();
  try {
    const records = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error('Could not read recognition memory.'));
    });
    const record = records
      .filter((item) => item.printingId === printingId && item.image)
      .sort((a, b) => b.savedAt - a.savedAt)[0];
    return record?.image || null;
  } finally {
    db.close();
  }
}
