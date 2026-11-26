/** Fetch every page from a paginated async data-list operation. */
export async function fetchAllPages(listPage, pageSize = 100) {
  if (typeof listPage !== 'function') throw new TypeError('A page loader is required.')
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new RangeError('Page size must be a positive integer.')

  const files = []
  for (let offset = 0; ; offset += pageSize) {
    const result = await listPage({ limit: pageSize, offset })
    if (result?.error) throw result.error
    const page = Array.isArray(result?.data) ? result.data : []
    files.push(...page)
    if (page.length < pageSize) return files
  }
}
