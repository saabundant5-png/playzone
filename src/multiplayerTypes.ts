export type PlayMode = '1p' | '2p-local' | '2p-online';

export type MultiplayerEngine =
  | 'astro-dodge'
  | 'neon-breaker'
  | 'orbit-stacker'
  | 'void-chess'
  | 'trump-duel';

export interface RoomPlayer {
  slot: 0 | 1;
  name: string;
  ready: boolean;
  score: number;
  connected: boolean;
}

export interface AstroOnlineState {
  kind: 'astro-dodge';
  ships: [
    { x: number; y: number; shields: number; score: number; alive: boolean },
    { x: number; y: number; shields: number; score: number; alive: boolean }
  ];
  obstacles: { id: number; x: number; y: number; r: number; kind: 'rock' | 'crystal' }[];
  winnerSlot: 0 | 1 | 'draw' | null;
}

export interface NeonBreakerOnlineState {
  kind: 'neon-breaker';
  paddles: [{ x: number; score: number }, { x: number; score: number }];
  ball: { x: number; y: number; dx: number; dy: number };
  bricks: { x: number; y: number; alive: boolean; pts: number; color: string }[];
  shields: number;
  lastHitter: 0 | 1;
  winnerSlot: 0 | 1 | 'draw' | null;
}

export interface OrbitStackerOnlineState {
  kind: 'orbit-stacker';
  towers: [
    {
      stack: { x: number; width: number; color: string }[];
      activeX: number;
      activeWidth: number;
      score: number;
      alive: boolean;
    },
    {
      stack: { x: number; width: number; color: string }[];
      activeX: number;
      activeWidth: number;
      score: number;
      alive: boolean;
    }
  ];
  winnerSlot: 0 | 1 | 'draw' | null;
}

export interface ChessPiece {
  color: 'w' | 'b';
  type: 'K' | 'Q' | 'R' | 'N' | 'P';
}

export interface VoidChessOnlineState {
  kind: 'void-chess';
  board: (ChessPiece | null)[][];
  turn: 'w' | 'b';
  scores: [number, number];
  statusNote: string;
  winnerSlot: 0 | 1 | 'draw' | null;
}

export interface TrumpCard {
  id: string;
  suit: '♠' | '♥' | '♦' | '♣';
  rank: number;
  label: string;
}

export interface TrumpDuelOnlineState {
  kind: 'trump-duel';
  trump: '♠' | '♥' | '♦' | '♣';
  turnSlot: 0 | 1;
  leadSlot: 0 | 1;
  handCounts: [number, number];
  myHand: TrumpCard[];
  tableCards: [TrumpCard | null, TrumpCard | null];
  tricks: [number, number];
  scores: [number, number];
  message: string;
  winnerSlot: 0 | 1 | 'draw' | null;
}

export type OnlineGameState =
  | AstroOnlineState
  | NeonBreakerOnlineState
  | OrbitStackerOnlineState
  | VoidChessOnlineState
  | TrumpDuelOnlineState;

export interface RoomSnapshot {
  code: string;
  gameId: string;
  engine: MultiplayerEngine;
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  players: RoomPlayer[];
  yourSlot: 0 | 1;
  gameState: OnlineGameState | null;
}

export type ClientWsMessage =
  | { type: 'room:create'; gameId: string; playerName: string }
  | { type: 'room:join'; code: string; playerName: string }
  | { type: 'room:leave' }
  | { type: 'room:ready'; ready: boolean }
  | { type: 'room:set_game'; gameId: string }
  | { type: 'room:start' }
  | { type: 'room:rematch' }
  | { type: 'game:input'; dx?: number; dy?: number }
  | { type: 'game:drop' }
  | { type: 'game:chess_move'; from: [number, number]; to: [number, number] }
  | { type: 'game:card_play'; cardId: string };

export type ServerWsMessage =
  | { type: 'room:state'; room: RoomSnapshot }
  | { type: 'room:error'; message: string }
  | { type: 'room:closed'; message: string };
