import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface TicketUpdate {
  success: boolean;
  data: any;
  timestamp?: string;
}

interface UseTicketsSocketOptions {
  enabled?: boolean;
  onTicketCreated?: (ticket: any) => void;
  onTicketUpdated?: (ticket: any) => void;
  onTicketDeleted?: (ticket: any) => void;
  onError?: (error: any) => void;
}

export const useTicketsSocket = (options: UseTicketsSocketOptions = {}) => {
  const {
    enabled = true,
    onTicketCreated,
    onTicketUpdated,
    onTicketDeleted,
    onError,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const watchingRef = useRef(false);
  const connectedRef = useRef(false);
  
  // Use refs for callbacks to avoid stale closures
  const onTicketCreatedRef = useRef(onTicketCreated);
  const onTicketUpdatedRef = useRef(onTicketUpdated);
  const onTicketDeletedRef = useRef(onTicketDeleted);
  const onErrorRef = useRef(onError);

  // Keep refs up to date
  useEffect(() => {
    onTicketCreatedRef.current = onTicketCreated;
  }, [onTicketCreated]);

  useEffect(() => {
    onTicketUpdatedRef.current = onTicketUpdated;
  }, [onTicketUpdated]);

  useEffect(() => {
    onTicketDeletedRef.current = onTicketDeleted;
  }, [onTicketDeleted]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';
      
      console.log('Connecting to WebSocket:', wsUrl);
      
      socketRef.current = io(wsUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling'],
      });

      socketRef.current.on('connect', () => {
        console.log('✅ Connected to tickets WebSocket:', socketRef.current?.id);
        connectedRef.current = true;
        
        // Auto-watch tickets on connect
        if (socketRef.current) {
          socketRef.current.emit('watch-tickets', { limit: 500, offset: 0 }, (response: any) => {
            if (response?.success) {
              console.log('✅ Successfully watching tickets');
              watchingRef.current = true;
            } else {
              console.error('Failed to watch tickets:', response?.error);
            }
          });
        }
      });

      socketRef.current.on('disconnect', () => {
        console.log('❌ Disconnected from tickets WebSocket');
        connectedRef.current = false;
        watchingRef.current = false;
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        connectedRef.current = false;
        onErrorRef.current?.(error);
      });

      socketRef.current.on('error', (error) => {
        console.error('WebSocket error:', error);
        onErrorRef.current?.(error);
      });

      socketRef.current.on('ticket-created', (data: TicketUpdate) => {
        console.log('📥 Received ticket-created event:', data);
        if (data.success && data.data) {
          onTicketCreatedRef.current?.(data.data);
        }
      });

      socketRef.current.on('ticket-updated', (data: TicketUpdate) => {
        console.log('📝 Received ticket-updated event:', data);
        if (data.success && data.data) {
          onTicketUpdatedRef.current?.(data.data);
        }
      });

      socketRef.current.on('ticket-deleted', (data: TicketUpdate) => {
        console.log('🗑️ Received ticket-deleted event:', data);
        if (data.success && data.data) {
          onTicketDeletedRef.current?.(data.data);
        }
      });
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      onErrorRef.current?.(error);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      watchingRef.current = false;
      connectedRef.current = false;
    }
  }, []);

  const watchTickets = useCallback((limit: number = 500, offset: number = 0) => {
    if (!socketRef.current?.connected) {
      console.warn('Socket not connected, cannot watch tickets');
      return;
    }

    socketRef.current.emit('watch-tickets', { limit, offset }, (response: any) => {
      if (response?.success) {
        console.log('✅ Successfully watching tickets');
        watchingRef.current = true;
      } else {
        console.error('Failed to watch tickets:', response?.error);
      }
    });
  }, []);

  const unwatchTickets = useCallback(() => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('unwatch-tickets', {}, (response: any) => {
      if (response?.success) {
        console.log('Stopped watching tickets');
        watchingRef.current = false;
      }
    });
  }, []);

  const getTickets = useCallback(
    (limit: number = 10, offset: number = 0) => {
      return new Promise((resolve, reject) => {
        if (!socketRef.current?.connected) {
          reject(new Error('Socket not connected'));
          return;
        }

        socketRef.current.emit(
          'get-tickets',
          { limit, offset },
          (response: any) => {
            if (response?.success) {
              resolve(response);
            } else {
              reject(new Error(response?.error || 'Unknown error'));
            }
          }
        );
      });
    },
    []
  );

  const getTicketById = useCallback((id: number) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      socketRef.current.emit('get-ticket-by-id', { id }, (response: any) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Unknown error'));
        }
      });
    });
  }, []);

  const getTicketByTrace = useCallback((traceNo: string) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      socketRef.current.emit(
        'get-ticket-by-trace',
        { traceNo },
        (response: any) => {
          if (response?.success) {
            resolve(response);
          } else {
            reject(new Error(response?.error || 'Unknown error'));
          }
        }
      );
    });
  }, []);

  const searchTicketsByDate = useCallback(
    (startDate: string, endDate: string) => {
      return new Promise((resolve, reject) => {
        if (!socketRef.current?.connected) {
          reject(new Error('Socket not connected'));
          return;
        }

        socketRef.current.emit(
          'search-tickets-by-date',
          { startDate, endDate },
          (response: any) => {
            if (response?.success) {
              resolve(response);
            } else {
              reject(new Error(response?.error || 'Unknown error'));
            }
          }
        );
      });
    },
    []
  );

  const getTicketCount = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      socketRef.current.emit('get-ticket-count', {}, (response: any) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Unknown error'));
        }
      });
    });
  }, []);

  const isConnected = useCallback(() => connectedRef.current, []);
  const isWatching = useCallback(() => watchingRef.current, []);

  // Connect on mount if enabled
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    socket: socketRef.current,
    isConnected,
    isWatching,
    connect,
    disconnect,
    watchTickets,
    unwatchTickets,
    getTickets,
    getTicketById,
    getTicketByTrace,
    searchTicketsByDate,
    getTicketCount,
  };
};
