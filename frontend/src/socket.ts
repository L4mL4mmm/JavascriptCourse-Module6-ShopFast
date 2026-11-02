import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  if (!socket) {
    socket = io('/', {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: {
        token: token || '',
      },
    });

    socket.on('connect', () => {
      console.log('[WebSocket] Connected with ID:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[WebSocket] Connection Error (running mock simulator mode):', err.message);
    });
  }

  if (token && socket.auth) {
    socket.auth = { token };
  }

  return socket;
}

export function subscribeToOrder(
  orderId: string,
  onStatusUpdate: (data: any) => void,
  onSubscribed?: (data: any) => void,
) {
  const s = getSocket();

  s.emit('subscribe_order', { orderId });

  s.off('order_status_updated');
  s.off('order_subscribed');

  s.on('order_status_updated', onStatusUpdate);
  if (onSubscribed) {
    s.on('order_subscribed', onSubscribed);
  }
}

export function unsubscribeFromOrder(orderId: string) {
  if (socket) {
    socket.emit('unsubscribe_order', { orderId });
  }
}
