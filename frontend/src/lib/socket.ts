import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://sariah-unburnt-uncoarsely.ngrok-free.dev';

let socket: Socket | null = null;

/** Get or create the shared socket instance */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });
  }
  return socket;
}

/**
 * React hook to listen for a socket event.
 * Automatically subscribes on mount and unsubscribes on unmount.
 */
export function useSocketEvent<T = any>(
  event: string,
  callback: (data: T) => void,
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const s = getSocket();
    const handler = (data: T) => callbackRef.current(data);
    s.on(event, handler);
    return () => {
      s.off(event, handler);
    };
  }, [event]);
}
