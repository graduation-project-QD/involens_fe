import { request } from './client'
/** Retrieves document counters and daily upload statistics within the user's scope. */
export function getSummary(signal) {
  console.debug('[Documents] Summary requested')
  return request('/documents/summary', { signal })
}
/** Retrieves one server page matching the selected document filters. */
export function getDocuments(query, signal) {
  console.debug('[Documents] List requested')
  return request('/documents', { query, signal })
}
/** Loads enough of one document state to build the requested combined page. */
async function getStatePrefix(query, currentState, signal) {
  const requiredCount = query.page * query.page_size
  const pageSize = Math.min(100, requiredCount)
  const items = []
  let total = 0
  console.debug('[Documents] Loading document state', {
    currentState,
    requiredCount,
  })
  for (let page = 1; ; page += 1) {
    const result = await getDocuments(
      { ...query, current_state: currentState, page, page_size: pageSize },
      signal,
    )
    items.push(...result.items)
    total = result.total
    if (items.length >= Math.min(requiredCount, total) || !result.items.length)
      break
  }
  console.debug('[Documents] Document state loaded', { currentState, total })
  return { items, total }
}

/** Orders documents using the backend's descending upload time and document ID order. */
function compareDocuments(first, second) {
  const dateDifference =
    new Date(second.uploaded_at) - new Date(first.uploaded_at)
  if (dateDifference) return dateDifference
  return first.id === second.id ? 0 : first.id < second.id ? 1 : -1
}

/** Combines selected document states into one page while preserving server filters and totals. */
export async function getDocumentsByStates(query, states, signal) {
  console.info('[Documents] Loading selected document states', {
    query,
    states,
  })
  if (!states.length) return getDocuments(query, signal)
  if (states.length === 1)
    return getDocuments({ ...query, current_state: states[0] }, signal)
  const results = await Promise.all(
    states.map((state) => getStatePrefix(query, state, signal)),
  )
  const items = results.flatMap((result) => result.items)
  items.sort(compareDocuments)
  const total = results.reduce((count, result) => count + result.total, 0)
  const offset = (query.page - 1) * query.page_size
  console.info('[Documents] Combined document page loaded', {
    total,
    page: query.page,
  })
  return {
    items: items.slice(offset, offset + query.page_size),
    total,
    page: query.page,
    page_size: query.page_size,
  }
}
/** Retrieves metadata for a document visible to the current user. */
export function getDocument(id, signal) {
  console.debug('[Documents] Details requested')
  return request('/documents/' + encodeURIComponent(id), { signal })
}
/** Checks whether the document is in an approved state for resubmission to AI. */
export function canRetryExtraction(state) {
  const allowed = ['EXTRACT_FAILED', 'PENDING_FAILURE', 'UPLOADED'].includes(
    state,
  )
  console.debug('[Documents] Checking extraction retry eligibility', {
    state,
    allowed,
  })
  return allowed
}

/** Resubmits a stored document to AI and returns its updated metadata from the backend. */
export function retryExtraction(id) {
  console.info('[Documents] Requesting extraction retry', { documentId: id })
  return request('/documents/' + encodeURIComponent(id) + '/retry-extraction', {
    method: 'POST',
  })
}

/** Deletes a document authorized by the backend using the current user's access token. */
export function deleteDocument(id) {
  console.info('[Documents] Deleting document', { documentId: id })
  return deleteDocuments([id])
}
/** Deletes the selected documents together, with authorization and atomic validation handled by the backend. */
export function deleteDocuments(documentIds) {
  console.info('[Documents] Deleting selected documents', {
    count: documentIds.length,
  })
  return request('/documents', { method: 'DELETE', body: { documentIds } })
}
/** Retrieves persisted AI results, including pending and failed processing states. */
export function getExtraction(id, signal) {
  console.debug('[Documents] Extraction requested')
  return request(
    '/documents/' + encodeURIComponent(id) + '/extraction-result',
    { signal },
  )
}
/** Saves invoice fields and completes the associated review transaction. */
export function saveExtraction(id, body) {
  console.debug('[Documents] Review save requested')
  return request(
    '/documents/' + encodeURIComponent(id) + '/extraction-result',
    { method: 'PATCH', body },
  )
}
/** Uploads a batch of files and returns each file's independent business result. */
export function uploadDocuments(files) {
  console.info('[Documents] Upload batch requested', { count: files.length })
  const body = new FormData()
  for (const file of files) body.append('files', file)
  return request('/documents/upload', { method: 'POST', body })
}
