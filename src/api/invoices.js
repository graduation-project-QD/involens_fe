import { request } from './client'

/** Retrieves one server page of extracted invoices using the approved search and status filters. */
export function getInvoices(query, signal) {
  console.debug('[Invoices] List requested', {
    page: query.page,
    state: query.current_state,
  })
  return request('/invoices', { query, signal })
}

/** Loads enough invoices in one state to build the requested page across multiple states. */
async function getStatePrefix(query, currentState, signal) {
  const requiredCount = query.page * query.page_size
  const pageSize = Math.min(100, requiredCount)
  const items = []
  let total = 0
  console.debug('[Invoices] Loading invoice state', {
    currentState,
    requiredCount,
  })
  for (let page = 1; ; page += 1) {
    const result = await getInvoices(
      { ...query, current_state: currentState, page, page_size: pageSize },
      signal,
    )
    items.push(...result.items)
    total = result.total
    if (items.length >= Math.min(requiredCount, total) || !result.items.length)
      break
  }
  console.debug('[Invoices] Invoice state loaded', { currentState, total })
  return { items, total }
}

/** Preserves the backend's descending upload time and document ID ordering when merging states. */
function compareInvoices(first, second) {
  const dateDifference =
    new Date(second.uploaded_at) - new Date(first.uploaded_at)
  if (dateDifference) return dateDifference
  console.debug('[Invoices] Ordering invoices with matching upload time', {
    firstDocumentId: first.document_id,
    secondDocumentId: second.document_id,
  })
  return first.document_id === second.document_id
    ? 0
    : first.document_id < second.document_id
      ? 1
      : -1
}

/** Returns all invoices or a combined page for selected states without filtering only loaded rows. */
export async function getInvoicesByStates(query, states, signal) {
  console.info('[Invoices] Loading selected invoice states', { query, states })
  if (!states.length) return getInvoices(query, signal)
  if (states.length === 1)
    return getInvoices({ ...query, current_state: states[0] }, signal)
  const results = await Promise.all(
    states.map((state) => getStatePrefix(query, state, signal)),
  )
  const items = results.flatMap((result) => result.items)
  items.sort(compareInvoices)
  const total = results.reduce((count, result) => count + result.total, 0)
  const offset = (query.page - 1) * query.page_size
  console.info('[Invoices] Combined invoice page loaded', {
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
