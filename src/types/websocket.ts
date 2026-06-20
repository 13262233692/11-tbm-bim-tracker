export interface WsMessage<T> {
  type: 'pose' | 'alarm' | 'status' | 'config';
  data: T;
  timestamp: number;
}

export interface WsStatus {
  connected: boolean;
  latency: number;
  reconnectAttempts: number;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
