import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Client } from '@stomp/stompjs'
import { WifiOff } from 'lucide-react'
import { getValidSession, readSession } from '../api/client'
import { getNotificationSummary } from '../api/notifications'

const DocumentStatusContext = createContext(null)
const NotificationContext = createContext(null)
const documentStates = new Set([
  'UPLOADED',
  'UPLOADED_FAILED',
  'PROCESSING',
  'EXTRACT_SUCCESS',
  'REVIEW_REQUIRED',
  'EXTRACT_FAILED',
  'PENDING_FAILURE',
])

/** Shares an authenticated socket for the uploader bell and approved document screens. */
export function DocumentStatusProvider({ children, liveDocuments = true }) {
  console.debug('[DocumentStatus] Rendering connection boundary')
  const listeners = useRef(new Set())
  const documentUpdatesEnabled = useRef(liveDocuments)
  documentUpdatesEnabled.current = liveDocuments
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationRevision, setNotificationRevision] = useState(0)
  const summaryRevision = useRef(0)
  /** Synchronizes the badge while protecting newer websocket counts from stale responses. */
  const refreshSummary = useCallback(async () => {
    console.info('[Notifications] Synchronizing unread count')
    const revision = ++summaryRevision.current
    try {
      const summary = await getNotificationSummary()
      if (
        !Number.isSafeInteger(summary?.unreadCount) ||
        summary.unreadCount < 0
      )
        throw new Error('Invalid unread count')
      if (revision === summaryRevision.current)
        setUnreadCount(summary.unreadCount)
    } catch {
      console.warn('[Notifications] Could not synchronize unread count')
    }
  }, [])
  const [disconnected, setDisconnected] = useState(false)
  /** Registers a screen's refresh handler without creating another socket connection. */
  const subscribe = useCallback((listener) => {
    console.debug('[DocumentStatus] Registering screen listener')
    listeners.current.add(listener)
    return () => {
      console.debug('[DocumentStatus] Removing screen listener')
      listeners.current.delete(listener)
    }
  }, [])

  /** Authenticates each connection, resubscribes after outages and batches refresh signals. */
  useEffect(() => {
    console.info('[DocumentStatus] Starting live document updates')
    let disposed = false
    let client = null
    let reconnectTimer
    let batchTimer
    let retryDelay = 1000
    let rejectedToken = null
    let reloadAll = false
    const documentIds = new Set()

    /** Delivers one batch so pages fetch current REST data rather than trusting event order. */
    function flushChanges() {
      console.debug('[DocumentStatus] Dispatching refresh batch', {
        reloadAll,
        count: documentIds.size,
      })
      batchTimer = undefined
      const change = { all: reloadAll, documentIds: new Set(documentIds) }
      reloadAll = false
      documentIds.clear()
      for (const listener of listeners.current) listener(change)
    }

    /** Coalesces reconnect and document notifications within the approved 300 ms window. */
    function queueChange(documentId) {
      console.debug('[DocumentStatus] Queuing refresh', { documentId })
      if (documentId) documentIds.add(documentId)
      else reloadAll = true
      if (batchTimer === undefined)
        batchTimer = window.setTimeout(flushChanges, 300)
    }

    /** Discards invalid messages without exposing payloads or credentials in logs. */
    function receiveMessage(message) {
      if (disposed || !documentUpdatesEnabled.current) return
      try {
        const payload = JSON.parse(message.body)
        if (
          !payload ||
          typeof payload.documentId !== 'string' ||
          !payload.documentId.trim() ||
          !documentStates.has(payload.currentState) ||
          !(
            payload.errorCode === null || typeof payload.errorCode === 'string'
          ) ||
          !(
            payload.errorMessage === null ||
            typeof payload.errorMessage === 'string'
          )
        ) {
          console.warn(
            '[DocumentStatus] Ignoring invalid document notification',
          )
          return
        }
        console.info('[DocumentStatus] Document status changed', {
          documentId: payload.documentId,
          currentState: payload.currentState,
        })
        queueChange(payload.documentId)
      } catch {
        console.warn(
          '[DocumentStatus] Ignoring unreadable document notification',
        )
      }
    }

    /** Applies authoritative unread counts and signals open lists to reload. */
    function receiveNotification(message) {
      if (disposed) return
      console.debug('[Notifications] Receiving badge update')
      try {
        const payload = JSON.parse(message.body)
        if (
          payload?.type !== 'NOTIFICATIONS_CHANGED' ||
          !Number.isSafeInteger(payload.unreadCount) ||
          payload.unreadCount < 0
        ) {
          console.warn('[Notifications] Ignoring invalid badge event')
          return
        }
        summaryRevision.current += 1
        setUnreadCount(payload.unreadCount)
        setNotificationRevision((value) => value + 1)
      } catch {
        console.warn('[Notifications] Ignoring unreadable badge event')
      }
    }

    /** Schedules bounded exponential retries while an authenticated session still exists. */
    function scheduleReconnect() {
      if (disposed || reconnectTimer !== undefined || !readSession()) return
      console.warn('[DocumentStatus] Scheduling reconnect', {
        delay: retryDelay,
      })
      setDisconnected(true)
      reconnectTimer = window.setTimeout(connect, retryDelay)
      retryDelay = Math.min(retryDelay * 2, 30000)
    }

    /** Creates a new STOMP connection using a current token, refreshing after policy closure. */
    async function connect() {
      reconnectTimer = undefined
      console.info('[DocumentStatus] Connecting to document notifications')
      try {
        const session = await getValidSession(
          Boolean(rejectedToken),
          rejectedToken,
        )
        if (disposed) return
        rejectedToken = null
        const connection = new Client({
          brokerURL: import.meta.env.VITE_WS_URL,
          connectHeaders: { Authorization: 'Bearer ' + session.accessToken },
          reconnectDelay: 0,
          // Never enable STOMP frame logging: CONNECT contains the access token.
          onConnect: () => {
            if (disposed) return
            console.info('[DocumentStatus] Connected and subscribing')
            connection.subscribe('/user/queue/document-status', receiveMessage)
            connection.subscribe(
              '/user/queue/notifications',
              receiveNotification,
            )
            void refreshSummary()
            setNotificationRevision((value) => value + 1)
            retryDelay = 1000
            setDisconnected(false)
            queueChange()
          },
          onWebSocketClose: (event) => {
            if (disposed) return
            console.warn('[DocumentStatus] Connection closed', {
              code: event.code,
            })
            if (event.code === 1008) rejectedToken = session.accessToken
            void connection.deactivate()
            scheduleReconnect()
          },
          onWebSocketError: () => {
            console.warn('[DocumentStatus] WebSocket connection failed')
            if (!disposed) setDisconnected(true)
          },
          onStompError: () => {
            console.warn('[DocumentStatus] STOMP connection rejected')
            connection.forceDisconnect()
          },
        })
        client = connection
        connection.activate()
      } catch {
        console.warn('[DocumentStatus] Connection preparation failed')
        scheduleReconnect()
      }
    }

    void refreshSummary()
    void connect()
    return () => {
      console.info('[DocumentStatus] Stopping live document updates')
      disposed = true
      summaryRevision.current += 1
      window.clearTimeout(reconnectTimer)
      window.clearTimeout(batchTimer)
      if (client) void client.deactivate({ force: true })
    }
  }, [refreshSummary])

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notificationRevision,
        refreshSummary,
        disconnected,
      }}
    >
      <DocumentStatusContext.Provider value={liveDocuments ? subscribe : null}>
        {children}
      </DocumentStatusContext.Provider>
    </NotificationContext.Provider>
  )
}

/** Supplies shared notification state without opening additional socket connections. */
export function useNotifications() {
  console.debug('[Notifications] Reading bell state')
  return useContext(NotificationContext)
}

/** Displays connection recovery feedback in the main workspace. */
export function LiveConnectionNotice() {
  console.debug('[Notifications] Rendering connection feedback')
  const { disconnected } = useNotifications()
  return disconnected ? (
    <p
      role="status"
      className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      <WifiOff aria-hidden="true" className="size-4 shrink-0" />
      Đang kết nối lại cập nhật trực tiếp…
    </p>
  ) : null
}

/** Refreshes an approved screen on connection recovery or matching document changes. */
export function useDocumentStatusRefresh(
  onRefresh,
  enabled = true,
  documentId = null,
) {
  console.debug('[DocumentStatus] Reading screen subscription', {
    enabled,
    documentId,
  })
  const subscribe = useContext(DocumentStatusContext)
  const handler = useRef(onRefresh)
  useEffect(() => {
    console.debug('[DocumentStatus] Updating screen refresh handler')
    handler.current = onRefresh
  }, [onRefresh])
  useEffect(() => {
    if (!enabled || !subscribe) return
    console.debug('[DocumentStatus] Listening for relevant document changes', {
      documentId,
    })
    return subscribe((change) => {
      if (change.all || !documentId || change.documentIds.has(documentId)) {
        console.debug('[DocumentStatus] Refreshing active screen', {
          documentId,
        })
        handler.current()
      }
    })
  }, [subscribe, enabled, documentId])
}
