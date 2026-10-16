import { request } from './client'
/** Retrieves the backend review queue in its priority order. */
export function getReviewTasks(query, signal) {
  console.debug('[Review] Queue requested')
  return request('/review-tasks', { query, signal })
}
