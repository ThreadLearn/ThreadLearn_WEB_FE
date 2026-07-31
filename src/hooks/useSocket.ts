'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store';
import type { Notification, NotificationType } from '../types';
import { formatNotificationMessage, normalizeMojibakeText } from '../utils';

type RealtimeNotification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
  link?: string;
  createdAt: string;
};

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
let activeSocket: Socket | null = null;
const socketSubscribers = new Set<(socket: Socket | null) => void>();

const publishSocket = (socket: Socket | null) => {
  activeSocket = socket;
  socketSubscribers.forEach((subscriber) => subscriber(socket));
};

/** Subscribe to the authenticated application socket without opening another connection. */
export const subscribeRealtimeSocket = (subscriber: (socket: Socket | null) => void) => {
  socketSubscribers.add(subscriber);
  subscriber(activeSocket);
  return () => {
    socketSubscribers.delete(subscriber);
  };
};

/**
 * Socket.IO hook — connects when authenticated, auto-joins user room.
 * Listens for realtime events pushed by BE server.ts:
 *  - 'notification' (UC32, UC45) — new notification
 *  - 'leaderboard:update' (UC46) — rank changes
 *  - 'xp:awarded' (UC44) — XP gain
 */
export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { user, accessToken, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const userId = user?._id ?? user?.id;

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !userId) return;

    const socket = io(SOCKET_URL, {
      // The server derives the room exclusively from this verified JWT. Never
      // send a caller-controlled userId as a room selector.
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;
    publishSocket(socket);

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    // ─── UC32, UC45: Realtime notifications (level-up, quiz pass, etc.) ─────
    socket.on('notification', (notif: RealtimeNotification) => {
      const nextNotification: Notification = {
        _id: notif.id,
        userId,
        title: notif.title,
        message: notif.message,
        type: notif.type,
        metadata: notif.metadata,
        link: notif.link,
        isRead: false,
        createdAt: notif.createdAt,
      };

      queryClient.setQueryData<Notification[]>(['notifications'], (current = []) => {
        if (current.some((item) => item._id === nextNotification._id)) {
          return current;
        }
        return [nextNotification, ...current];
      });

      // Invalidate cache so notification list refreshes
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] });

      // Show toast
      toast(normalizeMojibakeText(nextNotification.title), {
        description: formatNotificationMessage(nextNotification),
      });
    });

    // ─── UC46: Leaderboard real-time update ─────────────────────────────────
    socket.on('leaderboard:update', () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['my-rank'] });
    });

    // ─── UC44: XP awarded event ─────────────────────────────────────────────
    socket.on('xp:awarded', (payload: { xp: number; totalXp: number; level: number }) => {
      queryClient.invalidateQueries({ queryKey: ['gamification-stats'] });
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      if (activeSocket === socket) publishSocket(null);
    };
  }, [isAuthenticated, accessToken, queryClient, userId]);

  const emit = useCallback(
    (event: string, data?: unknown) => {
      socketRef.current?.emit(event, data);
    },
    []
  );

  return { socket: socketRef.current, emit };
}
