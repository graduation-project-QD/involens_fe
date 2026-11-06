import { request } from './client'

/** Loads one page of notification groups for the signed-in uploader. */
export function getNotifications(page = 1, signal) {
  console.debug('[Notifications] Loading groups', { page })
  return request('/notifications', { query: { page, page_size: 8 }, signal })
}

/** Retrieves the authoritative unread group count for the bell. */
export function getNotificationSummary() {
  console.debug('[Notifications] Loading unread summary')
  return request('/notifications/summary')
}

/** Marks one group, or all current groups when no ID is supplied, as read. */
export function markNotificationsRead(id) {
  console.info('[Notifications] Marking groups read', { id, all: !id })
  return request(
    id
      ? `/notifications/${encodeURIComponent(id)}/read`
      : '/notifications/read-all',
    { method: 'PATCH' },
  )
}
