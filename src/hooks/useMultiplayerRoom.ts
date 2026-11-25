import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientWsMessage, RoomSnapshot, ServerWsMessage } from '../multiplayerTypes';

export function useMultiplayerRoom() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingQueueRef = useRef<ClientWsMessage[]>([]);

  const ensureConnection = useCallback(() => {
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
      while (pendingQueueRef.current.length > 0) {
        const nextMsg = pendingQueueRef.current.shift();
        if (nextMsg) {
          ws.send(JSON.stringify(nextMsg));
        }
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerWsMessage;
        if (msg.type === 'room:state') {
          setRoom(msg.room);
          setError(null);
        } else if (msg.type === 'room:error') {
          setError(msg.message);
        } else if (msg.type === 'room:closed') {
          setRoom(null);
          setError(msg.message);
        }
      } catch {
        // Ignore malformed server payload
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      setError('Connection to multiplayer server failed. Please try again.');
    };
  }, []);

  useEffect(() => {
    ensureConnection();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [ensureConnection]);

  const send = useCallback(
    (msg: ClientWsMessage) => {
      ensureConnection();
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      } else {
        pendingQueueRef.current.push(msg);
      }
    },
    [ensureConnection]
  );

  const createRoom = useCallback(
    (gameId: string, playerName: string) => {
      setError(null);
      send({ type: 'room:create', gameId, playerName });
    },
    [send]
  );

  const joinRoom = useCallback(
    (code: string, playerName: string) => {
      setError(null);
      send({ type: 'room:join', code, playerName });
    },
    [send]
  );

  const leaveRoom = useCallback(() => {
    send({ type: 'room:leave' });
    setRoom(null);
    setError(null);
  }, [send]);

  const setReady = useCallback(
    (ready: boolean) => {
      send({ type: 'room:ready', ready });
    },
    [send]
  );

  const setGame = useCallback(
    (gameId: string) => {
      send({ type: 'room:set_game', gameId });
    },
    [send]
  );

  const startMatch = useCallback(() => {
    send({ type: 'room:start' });
  }, [send]);

  const rematch = useCallback(() => {
    send({ type: 'room:rematch' });
  }, [send]);

  const sendInput = useCallback(
    (dx: number, dy: number) => {
      send({ type: 'game:input', dx, dy });
    },
    [send]
  );

  const sendDrop = useCallback(() => {
    send({ type: 'game:drop' });
  }, [send]);

  const sendChessMove = useCallback(
    (from: [number, number], to: [number, number]) => {
      send({ type: 'game:chess_move', from, to });
    },
    [send]
  );

  const sendCardPlay = useCallback(
    (cardId: string) => {
      send({ type: 'game:card_play', cardId });
    },
    [send]
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    connected,
    room,
    error,
    clearError,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    setGame,
    startMatch,
    rematch,
    sendInput,
    sendDrop,
    sendChessMove,
    sendCardPlay,
  };
}
