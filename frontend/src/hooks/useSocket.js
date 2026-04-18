import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

let socketInstance = null; // Singleton across the React tree

/**
 * useSocket
 * Returns a stable Socket.io client instance.
 * The socket is authenticated with the current JWT.
 */
export function useSocket() {
  const { token } = useAuth();
  const socketRef = useRef(socketInstance);

  useEffect(() => {
    if (!token) {
      // Disconnect on logout
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        socketInstance    = null;
      }
      return;
    }

    if (!socketRef.current) {
      const socket = io('/', {
        auth:             { token },
        transports:       ['websocket', 'polling'],
        reconnection:     true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socket.on('connect',            () => {
        console.log('[Socket] Connected:', socket.id)
        socket.emit('join-user-room')
      });
      socket.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));
      socket.on('connect_error', (err) => console.warn('[Socket] Error:', err.message));

      socketRef.current = socket;
      socketInstance    = socket;
    }

    return () => {
      // DO NOT disconnect on unmount — keep singleton alive
    };
  }, [token]);

  /** Emit helper with safety check */
  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  /** Subscribe to an event; returns an unsubscribe function */
  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  return { socket: socketRef.current, emit, on };
}
