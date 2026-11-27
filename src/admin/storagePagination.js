/** Fetch every page from a paginated async data-list operation. */
export async function fetchAllPages(listPage, pageSize = 100) {
  if (typeof listPage !== 'function') throw new TypeError('A page loader is required.')
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new RangeError('Page size must be a positive integer.')

  const files = []
  const seen = new Set()
  for (let offset = 0; ; offset += pageSize) {
    const result = await listPage({ limit: pageSize, offset })
    if (result?.error) throw result.error
    const page = Array.isArray(result?.data) ? result.data : []
    for (const file of page) {
      // Storage pagination can overlap when objects are added/removed while
      // offsets are being read. One folder listing has a stable object ID;
      // name is the fallback for providers/fixtures without an ID.
      const identity = file?.id != null
        ? `id:${String(file.id)}`
        : file?.name
          ? `name:${String(file.name)}`
          : null
      if (identity && seen.has(identity)) continue
      if (identity) seen.add(identity)
      files.push(file)
    }
    if (page.length < pageSize) return files
  }
}
