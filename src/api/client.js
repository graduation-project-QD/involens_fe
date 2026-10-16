import axios from 'axios'

export const SESSION_KEY = 'involens.session'
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
let refreshOperation = null
let sessionRevision = 0

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { Accept: 'application/json' },
  validateStatus: null,
})

/** Reads the authenticated session retained for this browser tab. */
export function readSession() {
  console.debug('[Session] Reading tab session')
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')
    return session?.accessToken &&
      (session.expiresAt > Date.now() || session.refreshToken)
      ? session
      : null
  } catch {
    console.warn('[Session] Invalid stored session')
    return null
  }
}

/** Persists a login or rotated token set and notifies the authenticated application. */
export function storeSession(result) {
  console.info('[Session] Storing authenticated session')
  sessionRevision += 1
  const now = Date.now()
  const next = {
    ...result,
    expiresAt: now + result.expiresIn * 1000,
    refreshExpiresAt: now + result.refreshExpiresIn * 1000,
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('involens:session-changed'))
  return next
}

/** Invalidates pending refresh responses and removes this tab's credentials on logout. */
export function removeSession() {
  console.info('[Session] Removing authenticated session')
  sessionRevision += 1
  sessionStorage.removeItem(SESSION_KEY)
}

/** Supplies a valid access token, sharing refresh requests so rotating tokens are used once. */
export async function getValidSession(
  forceRefresh = false,
  rejectedToken = null,
) {
  console.debug('[Session] Ensuring valid access token', { forceRefresh })
  const session = readSession()
  if (!session) {
    window.dispatchEvent(new Event('involens:unauthorized'))
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
  }
  if (refreshOperation?.revision === sessionRevision)
    return refreshOperation.promise
  const alreadyRotated = rejectedToken && rejectedToken !== session.accessToken
  if ((!forceRefresh || alreadyRotated) && session.expiresAt > Date.now())
    return session
  if (!session.refreshToken || session.refreshExpiresAt <= Date.now()) {
    window.dispatchEvent(new Event('involens:unauthorized'))
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
  }
  const revision = sessionRevision
  const operation = { revision }
  operation.promise = request('/auth/refresh-token', {
    method: 'POST',
    body: { refreshToken: session.refreshToken },
    authenticated: false,
  })
    .then((result) => {
      if (revision !== sessionRevision)
        throw new Error('Phiên đăng nhập đã thay đổi.')
      console.info('[Session] Token refresh completed')
      return storeSession(result)
    })
    .catch((failure) => {
      console.warn('[Session] Token refresh failed', {
        httpStatus: failure.httpStatus,
      })
      if (revision === sessionRevision && failure.httpStatus === 401)
        window.dispatchEvent(new Event('involens:unauthorized'))
      throw failure
    })
    .finally(() => {
      if (refreshOperation === operation) refreshOperation = null
    })
  refreshOperation = operation
  return operation.promise
}

/** Sends an authenticated backend operation, returning JSON data or a file with download headers. */
export async function request(
  path,
  {
    method = 'GET',
    body,
    query,
    signal,
    authenticated = true,
    responseType = 'json',
    retriedAuthentication = false,
  } = {},
) {
  console.info('[API] Starting operation', { method, path })
  const url = new URL(apiBaseUrl.replace(/\/$/, '') + path)
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== '' && value !== undefined && value !== null)
      url.searchParams.set(key, value)
  }
  const headers = {
    Accept: responseType === 'blob' ? '*/*' : 'application/json',
  }
  if (authenticated) {
    const session = await getValidSession()
    headers.Authorization = 'Bearer ' + session.accessToken
  }
  const multipart = body instanceof FormData
  if (body !== undefined && !multipart)
    headers['Content-Type'] = 'application/json'
  try {
    const response = await apiClient.request({
      url: path,
      method,
      headers,
      params: url.searchParams,
      data: body,
      signal,
      responseType,
    })
    if (response.status === 401 && authenticated) {
      if (!retriedAuthentication && path !== '/auth/logout') {
        console.info(
          '[API] Refreshing credentials after unauthorized response',
          { path },
        )
        await getValidSession(
          true,
          headers.Authorization.slice('Bearer '.length),
        )
        return request(path, {
          method,
          body,
          query,
          signal,
          authenticated,
          responseType,
          retriedAuthentication: true,
        })
      }
      if (headers.Authorization === 'Bearer ' + readSession()?.accessToken)
        window.dispatchEvent(new Event('involens:unauthorized'))
    }
    let result = response.data
    if (responseType === 'blob') {
      const contentType = String(
        response.headers['content-type'] || result?.type || '',
      ).toLowerCase()
      if (
        response.status >= 200 &&
        response.status < 300 &&
        !contentType.includes('json')
      ) {
        console.info('[API] File operation completed', {
          method,
          path,
          bytes: result.size,
        })
        return {
          blob: result,
          contentDisposition: response.headers['content-disposition'],
        }
      }
      try {
        result = JSON.parse(await result.text())
      } catch {
        console.warn('[API] File operation returned an unreadable error', {
          method,
          path,
          httpStatus: response.status,
        })
        result = null
      }
    }
    if (
      method === 'GET' &&
      path === '/documents' &&
      ['EXTRACT_FAILED', 'UPLOADED_FAILED'].includes(query?.current_state)
    ) {
      console.log('[API] Error documents filters:', query)
      console.log('[API] Error documents response:', result)
    }
    if (
      method === 'GET' &&
      /^\/documents\/[^/]+$/.test(path) &&
      path !== '/documents/summary'
    ) {
      console.log('[API] Document details response:', result)
    }
    if (
      response.status < 200 ||
      response.status >= 300 ||
      responseType === 'blob' ||
      result?.status !== 0
    ) {
      const error = new Error(
        result?.error?.message ||
          'Yêu cầu thất bại (HTTP ' + response.status + ').',
      )
      error.code = result?.error?.code
      error.httpStatus = response.status
      throw error
    }
    console.info('[API] Operation completed', { method, path })
    return result.data
  } catch (error) {
    if (axios.isCancel(error)) {
      const cancellation = new Error('Request aborted')
      cancellation.name = 'AbortError'
      throw cancellation
    }
    if (error.name !== 'AbortError')
      console.error('[API] Operation failed', {
        method,
        path,
        code: error.code,
      })
    throw axios.isAxiosError(error) && !error.response
      ? new Error(
          'Không thể kết nối máy chủ. Kiểm tra kết nối và cấu hình CORS của BE.',
        )
      : error
  }
}
