import { getValidSession, request } from './client'
/** Replaces the selected account's password through the manager session without logging credentials. */
export function resetAccountPassword(accountId, body) {
  console.info('[Accounts] Password reset requested', { accountId })
  return request('/auth/accounts/' + encodeURIComponent(accountId) + '/reset-password', {
    method: 'POST',
    body,
  })
}

/** Deletes the selected account through the authenticated manager's session. */
export function deleteAccount(accountId) {
  console.info('[Accounts] Account deletion requested', { accountId })
  return request('/auth/accounts/' + encodeURIComponent(accountId), { method: 'DELETE' })
}
/** Changes the authenticated user's password without logging credential values. */
export function changePassword(body) {
  console.info('[Auth] Password change requested')
  return request('/auth/me/change-password', { method: 'POST', body })
}
/** Retrieves account details for the authenticated manager. */
export function getAccount(accountId, signal) {
  console.debug('[Accounts] Account details requested', { accountId })
  return request('/auth/accounts/' + encodeURIComponent(accountId), { signal })
}
/** Updates only the selected account's role and status through the manager session. */
export function updateAccount(accountId, body) {
  console.info('[Accounts] Account permissions update requested', { accountId })
  return request('/auth/accounts/' + encodeURIComponent(accountId), {
    method: 'PATCH',
    body,
  })
}
/** Retrieves a paginated account list using the authenticated manager's session. */
export function getAccounts(query, signal) {
  console.debug('[Accounts] Account list requested', query)
  return request('/auth/accounts', { query, signal })
}
/** Authenticates the supplied credentials without an existing session. */
export function login(credentials) {
  console.debug('[Auth] Login requested')
  return request('/auth/login', {
    method: 'POST',
    body: credentials,
    authenticated: false,
  })
}
/** Creates a staff account under the authenticated manager. */
export function createAccount(body) {
  console.debug('[Auth] Account creation requested')
  return request('/auth/create-accounts', { method: 'POST', body })
}
/** Retrieves the current identity and permissions from the backend. */
export function getMe() {
  console.debug('[Auth] Identity requested')
  return request('/auth/me')
}
/** Revokes the current refresh token using valid credentials before local logout. */
export async function logout() {
  console.debug('[Auth] Logout requested')
  const session = await getValidSession()
  return request('/auth/logout', {
    method: 'POST',
    body: { refreshToken: session.refreshToken },
  })
}
