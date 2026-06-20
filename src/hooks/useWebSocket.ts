import { useEffect, useRef, useCallback } from 'react';
import type { WebSocketConfig, WebSocketStatus, WsMessage } from '@/types/websocket';
import type { TbmPoseData, AlarmRecord } from '@/types/tbm';

interface UseWebSocketOptions extends Partial<WebSocketConfig> {
  onPoseMessage?: (pose: TbmPoseData) => void;
  onAlarmMessage?: (alarm: AlarmRecord) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
  onMessage?: (message: WsMessage<unknown>) => void;
  autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = 'ws://localhost:8080/ws',
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    heartbeatInterval = 30000,
    onPoseMessage,
    onAlarmMessage,
    onStatusChange,
    onMessage,
    autoConnect = true,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const statusRef = useRef<WebSocketStatus>('disconnected');
  const reconnectAttemptsRef = useRef(0);
  const heartbeatTimerRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const setStatus = useCallback(
    (status: WebSocketStatus) => {
      statusRef.current = status;
      onStatusChange?.(status);
    },
    [onStatusChange]
  );

  const clearTimers = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    heartbeatTimerRef.current = window.setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');
    clearTimers();

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
        startHeartbeat();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WsMessage<unknown> = JSON.parse(event.data);
          onMessage?.(message);

          if (message.type === 'pose' && onPoseMessage) {
            onPoseMessage(message.data as TbmPoseData);
          } else if (message.type === 'alarm' && onAlarmMessage) {
            onAlarmMessage(message.data as AlarmRecord);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        setStatus('disconnected');
        clearTimers();

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          setStatus('reconnecting');
          reconnectTimerRef.current = window.setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setStatus('error');
    }
  }, [url, reconnectInterval, maxReconnectAttempts, clearTimers, startHeartbeat, setStatus, onPoseMessage, onAlarmMessage, onMessage]);

  const disconnect = useCallback(() => {
    clearTimers();
    reconnectAttemptsRef.current = maxReconnectAttempts;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('disconnected');
  }, [clearTimers, maxReconnectAttempts, setStatus]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connect,
    disconnect,
    send,
    status: statusRef.current,
    reconnectAttempts: reconnectAttemptsRef.current,
  };
}
