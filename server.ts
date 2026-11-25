import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import type {
  AstroOnlineState,
  ChessPiece,
  ClientWsMessage,
  MultiplayerEngine,
  NeonBreakerOnlineState,
  OrbitStackerOnlineState,
  RoomSnapshot,
  ServerWsMessage,
  TrumpCard,
  TrumpDuelOnlineState,
  VoidChessOnlineState,
} from './src/multiplayerTypes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PORT = Number(process.env.PORT) || 3000;

const GAME_ENGINE_MAP: Record<string, MultiplayerEngine> = {
  'astro-dodge': 'astro-dodge',
  'meteor-sprint': 'astro-dodge',
  'neon-breaker': 'neon-breaker',
  'solar-smash': 'neon-breaker',
  'orbit-stacker': 'orbit-stacker',
  'apex-tower': 'orbit-stacker',
  'void-chess': 'void-chess',
  'trump-duel': 'trump-duel',
};

interface InternalPlayer {
  slot: 0 | 1;
  name: string;
  ready: boolean;
  score: number;
  ws: WebSocket | null;
  inputDx: number;
  inputDy: number;
}

interface InternalTrumpState {
  kind: 'trump-duel';
  trump: '♠' | '♥' | '♦' | '♣';
  turnSlot: 0 | 1;
  leadSlot: 0 | 1;
  hands: [TrumpCard[], TrumpCard[]];
  tableCards: [TrumpCard | null, TrumpCard | null];
  tricks: [number, number];
  scores: [number, number];
  message: string;
  winnerSlot: 0 | 1 | 'draw' | null;
}

type ServerGameState =
  | AstroOnlineState
  | NeonBreakerOnlineState
  | OrbitStackerOnlineState
  | VoidChessOnlineState
  | InternalTrumpState;

interface InternalRoom {
  code: string;
  gameId: string;
  engine: MultiplayerEngine;
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  players: InternalPlayer[];
  gameState: ServerGameState | null;
  tickTimer: ReturnType<typeof setInterval> | null;
  frameCount: number;
  nextObstacleId: number;
  stackDirs: [number, number];
  stackSpeeds: [number, number];
  createdAt: number;
}

const rooms = new Map<string, InternalRoom>();
const socketMeta = new Map<WebSocket, { roomCode: string; slot: 0 | 1 }>();

function sanitizePlayerName(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 18);
  return cleaned.length > 0 ? cleaned : fallback;
}

function normalizeRoomCode(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function generateRoomCode(): string {
  for (let attempt = 0; attempt < 25; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += ROOM_ALPHABET[crypto.randomInt(ROOM_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return String(Date.now()).slice(-6);
}

function sendJson(ws: WebSocket | null, payload: ServerWsMessage): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function buildSnapshotForSlot(room: InternalRoom, slot: 0 | 1): RoomSnapshot {
  let publicGameState: RoomSnapshot['gameState'] = null;
  if (room.gameState) {
    if (room.gameState.kind === 'trump-duel') {
      const ts = room.gameState;
      const clientTrumpState: TrumpDuelOnlineState = {
        kind: 'trump-duel',
        trump: ts.trump,
        turnSlot: ts.turnSlot,
        leadSlot: ts.leadSlot,
        handCounts: [ts.hands[0].length, ts.hands[1].length],
        myHand: ts.hands[slot],
        tableCards: ts.tableCards,
        tricks: ts.tricks,
        scores: ts.scores,
        message: ts.message,
        winnerSlot: ts.winnerSlot,
      };
      publicGameState = clientTrumpState;
    } else {
      publicGameState = room.gameState;
    }
  }

  return {
    code: room.code,
    gameId: room.gameId,
    engine: room.engine,
    status: room.status,
    players: room.players.map((p) => ({
      slot: p.slot,
      name: p.name,
      ready: p.ready,
      score: p.score,
      connected: Boolean(p.ws && p.ws.readyState === WebSocket.OPEN),
    })),
    yourSlot: slot,
    gameState: publicGameState,
  };
}

function broadcastRoom(room: InternalRoom): void {
  for (const player of room.players) {
    sendJson(player.ws, {
      type: 'room:state',
      room: buildSnapshotForSlot(room, player.slot),
    });
  }
}

function stopRoomLoop(room: InternalRoom): void {
  if (room.tickTimer) {
    clearInterval(room.tickTimer);
    room.tickTimer = null;
  }
}

function createInitialChessBoard(): (ChessPiece | null)[][] {
  const backRow: ChessPiece['type'][] = ['R', 'N', 'Q', 'K', 'N', 'R'];
  const board: (ChessPiece | null)[][] = Array.from({ length: 6 }, () => Array(6).fill(null));
  for (let c = 0; c < 6; c++) {
    board[0][c] = { color: 'b', type: backRow[c] };
    board[1][c] = { color: 'b', type: 'P' };
    board[4][c] = { color: 'w', type: 'P' };
    board[5][c] = { color: 'w', type: backRow[c] };
  }
  return board;
}

function getChessLegalMoves(
  board: (ChessPiece | null)[][],
  r: number,
  c: number
): [number, number][] {
  const piece = board[r]?.[c];
  if (!piece) return [];
  const moves: [number, number][] = [];
  const inBounds = (nr: number, nc: number) => nr >= 0 && nr < 6 && nc >= 0 && nc < 6;

  if (piece.type === 'P') {
    const dir = piece.color === 'w' ? -1 : 1;
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      moves.push([r + dir, c]);
    }
    for (const dc of [-1, 1]) {
      const nr = r + dir;
      const nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc] && board[nr][nc]!.color !== piece.color) {
        moves.push([nr, nc]);
      }
    }
  } else if (piece.type === 'N') {
    const jumps = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [dr, dc] of jumps) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc]?.color !== piece.color) {
        moves.push([nr, nc]);
      }
    }
  } else if (piece.type === 'K') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc) && board[nr][nc]?.color !== piece.color) {
          moves.push([nr, nc]);
        }
      }
    }
  } else {
    const dirs =
      piece.type === 'R'
        ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
        : [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [1, 1], [1, -1], [-1, 1], [-1, -1],
          ];
    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const target = board[nr][nc];
        if (!target) {
          moves.push([nr, nc]);
        } else {
          if (target.color !== piece.color) moves.push([nr, nc]);
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  }
  return moves;
}

function createTrumpInitialState(): InternalTrumpState {
  const suits: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
  const ranks = [
    { rank: 9, label: '9' },
    { rank: 10, label: '10' },
    { rank: 11, label: 'J' },
    { rank: 12, label: 'Q' },
    { rank: 13, label: 'K' },
    { rank: 14, label: 'A' },
  ];
  const deck: TrumpCard[] = [];
  for (const suit of suits) {
    for (const r of ranks) {
      deck.push({ id: `${suit}-${r.label}`, suit, rank: r.rank, label: r.label });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const trump = suits[crypto.randomInt(suits.length)];
  return {
    kind: 'trump-duel',
    trump,
    turnSlot: 0,
    leadSlot: 0,
    hands: [deck.slice(0, 6), deck.slice(6, 12)],
    tableCards: [null, null],
    tricks: [0, 0],
    scores: [0, 0],
    message: 'Player 1 leads Trick 1.',
    winnerSlot: null,
  };
}

function createNeonBreakerState(): NeonBreakerOnlineState {
  const bricks: NeonBreakerOnlineState['bricks'] = [];
  const colors = ['#f43f5e', '#f59e0b', '#4cd7f6', '#6366f1'];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 8; c++) {
      bricks.push({
        x: 20 + c * 76,
        y: 34 + r * 26,
        alive: true,
        pts: (4 - r) * 25,
        color: colors[r],
      });
    }
  }
  return {
    kind: 'neon-breaker',
    paddles: [
      { x: 140, score: 0 },
      { x: 400, score: 0 },
    ],
    ball: { x: 320, y: 270, dx: 4.5, dy: -4.8 },
    bricks,
    shields: 4,
    lastHitter: 0,
    winnerSlot: null,
  };
}

function startMatch(room: InternalRoom): void {
  stopRoomLoop(room);
  room.status = 'PLAYING';
  room.frameCount = 0;
  room.nextObstacleId = 1;
  for (const p of room.players) {
    p.score = 0;
    p.inputDx = 0;
    p.inputDy = 0;
  }

  if (room.engine === 'astro-dodge') {
    room.gameState = {
      kind: 'astro-dodge',
      ships: [
        { x: 210, y: 310, shields: 3, score: 0, alive: true },
        { x: 430, y: 310, shields: 3, score: 0, alive: true },
      ],
      obstacles: [],
      winnerSlot: null,
    };
    room.tickTimer = setInterval(() => tickAstroDodge(room), 33);
  } else if (room.engine === 'neon-breaker') {
    room.gameState = createNeonBreakerState();
    room.tickTimer = setInterval(() => tickNeonBreaker(room), 33);
  } else if (room.engine === 'orbit-stacker') {
    room.stackDirs = [1, -1];
    room.stackSpeeds = [4.2, 4.2];
    room.gameState = {
      kind: 'orbit-stacker',
      towers: [
        {
          stack: [{ x: 95, width: 130, color: '#4cd7f6' }],
          activeX: 30,
          activeWidth: 130,
          score: 0,
          alive: true,
        },
        {
          stack: [{ x: 415, width: 130, color: '#f43f5e' }],
          activeX: 480,
          activeWidth: 130,
          score: 0,
          alive: true,
        },
      ],
      winnerSlot: null,
    };
    room.tickTimer = setInterval(() => tickOrbitStacker(room), 33);
  } else if (room.engine === 'void-chess') {
    room.gameState = {
      kind: 'void-chess',
      board: createInitialChessBoard(),
      turn: 'w',
      scores: [0, 0],
      statusNote: 'Player 1 (White) to move.',
      winnerSlot: null,
    };
  } else if (room.engine === 'trump-duel') {
    room.gameState = createTrumpInitialState();
  }

  broadcastRoom(room);
}

function tickAstroDodge(room: InternalRoom): void {
  const gs = room.gameState;
  if (!gs || gs.kind !== 'astro-dodge' || room.status !== 'PLAYING') {
    stopRoomLoop(room);
    return;
  }

  room.frameCount++;
  const speedMult = room.gameId === 'meteor-sprint' ? 1.35 : 1;

  for (let i = 0; i < 2; i++) {
    const player = room.players[i];
    const ship = gs.ships[i];
    if (!player || !ship.alive) continue;
    ship.x = Math.max(24, Math.min(616, ship.x + player.inputDx * 7.5));
    ship.y = Math.max(80, Math.min(332, ship.y + player.inputDy * 5.5));
  }

  if (room.frameCount % 8 === 0) {
    for (let i = 0; i < 2; i++) {
      if (gs.ships[i].alive) {
        gs.ships[i].score += 5;
        if (room.players[i]) room.players[i].score = gs.ships[i].score;
      }
    }
  }

  const spawnEvery = Math.max(10, Math.round(16 / speedMult));
  if (room.frameCount % spawnEvery === 0) {
    const isCrystal = Math.random() < 0.25;
    gs.obstacles.push({
      id: room.nextObstacleId++,
      x: 24 + Math.random() * 592,
      y: -20,
      r: isCrystal ? 11 : 14 + Math.random() * 10,
      kind: isCrystal ? 'crystal' : 'rock',
    });
  }

  for (let idx = gs.obstacles.length - 1; idx >= 0; idx--) {
    const ob = gs.obstacles[idx];
    ob.y += (ob.kind === 'crystal' ? 4.2 : 5.1) * speedMult;

    let removed = false;
    for (let sIdx = 0; sIdx < 2; sIdx++) {
      const ship = gs.ships[sIdx];
      if (!ship.alive) continue;
      if (Math.hypot(ob.x - ship.x, ob.y - ship.y) < ob.r + 14) {
        gs.obstacles.splice(idx, 1);
        removed = true;
        if (ob.kind === 'crystal') {
          ship.score += 50;
          if (room.players[sIdx]) room.players[sIdx].score = ship.score;
        } else {
          ship.shields -= 1;
          if (ship.shields <= 0) {
            ship.alive = false;
          }
        }
        break;
      }
    }
    if (!removed && ob.y > 385) {
      gs.obstacles.splice(idx, 1);
    }
  }

  if (!gs.ships[0].alive || !gs.ships[1].alive) {
    if (!gs.ships[0].alive && !gs.ships[1].alive) {
      gs.winnerSlot =
        gs.ships[0].score === gs.ships[1].score
          ? 'draw'
          : gs.ships[0].score > gs.ships[1].score
          ? 0
          : 1;
    } else {
      gs.winnerSlot = gs.ships[0].alive ? 0 : 1;
    }
    room.status = 'FINISHED';
    stopRoomLoop(room);
  }

  broadcastRoom(room);
}

function tickNeonBreaker(room: InternalRoom): void {
  const gs = room.gameState;
  if (!gs || gs.kind !== 'neon-breaker' || room.status !== 'PLAYING') {
    stopRoomLoop(room);
    return;
  }

  const paddleW = 92;
  for (let i = 0; i < 2; i++) {
    const player = room.players[i];
    if (!player) continue;
    gs.paddles[i].x = Math.max(8, Math.min(640 - paddleW - 8, gs.paddles[i].x + player.inputDx * 9));
  }

  gs.ball.x += gs.ball.dx;
  gs.ball.y += gs.ball.dy;

  if (gs.ball.x + 8 > 640 || gs.ball.x - 8 < 0) {
    gs.ball.dx = -gs.ball.dx;
  }
  if (gs.ball.y - 8 < 0) {
    gs.ball.dy = -gs.ball.dy;
  }

  for (let i = 0; i < 2; i++) {
    const px = gs.paddles[i].x;
    if (
      gs.ball.dy > 0 &&
      gs.ball.y + 8 >= 332 &&
      gs.ball.y - 8 <= 344 &&
      gs.ball.x >= px &&
      gs.ball.x <= px + paddleW
    ) {
      const hitPos = (gs.ball.x - (px + paddleW / 2)) / (paddleW / 2);
      gs.ball.dx = hitPos * 6.2;
      gs.ball.dy = -Math.abs(gs.ball.dy);
      gs.lastHitter = i as 0 | 1;
      break;
    }
  }

  let aliveBricks = 0;
  for (const b of gs.bricks) {
    if (!b.alive) continue;
    aliveBricks++;
    if (
      gs.ball.x + 7 > b.x &&
      gs.ball.x - 7 < b.x + 68 &&
      gs.ball.y + 7 > b.y &&
      gs.ball.y - 7 < b.y + 18
    ) {
      b.alive = false;
      aliveBricks--;
      gs.ball.dy = -gs.ball.dy;
      gs.paddles[gs.lastHitter].score += b.pts;
      if (room.players[gs.lastHitter]) {
        room.players[gs.lastHitter].score = gs.paddles[gs.lastHitter].score;
      }
      break;
    }
  }

  if (gs.ball.y > 372) {
    gs.shields -= 1;
    if (gs.shields <= 0) {
      gs.winnerSlot =
        gs.paddles[0].score === gs.paddles[1].score
          ? 'draw'
          : gs.paddles[0].score > gs.paddles[1].score
          ? 0
          : 1;
      room.status = 'FINISHED';
      stopRoomLoop(room);
    } else {
      gs.ball = { x: 320, y: 270, dx: 4.5 * (Math.random() > 0.5 ? 1 : -1), dy: -4.8 };
    }
  } else if (aliveBricks === 0) {
    gs.winnerSlot =
      gs.paddles[0].score === gs.paddles[1].score
        ? 'draw'
        : gs.paddles[0].score > gs.paddles[1].score
        ? 0
        : 1;
    room.status = 'FINISHED';
    stopRoomLoop(room);
  }

  broadcastRoom(room);
}

function tickOrbitStacker(room: InternalRoom): void {
  const gs = room.gameState;
  if (!gs || gs.kind !== 'orbit-stacker' || room.status !== 'PLAYING') {
    stopRoomLoop(room);
    return;
  }

  const bounds: [number, number][] = [
    [16, 304],
    [336, 624],
  ];

  for (let i = 0; i < 2; i++) {
    const tower = gs.towers[i];
    if (!tower.alive) continue;
    const [minX, maxX] = bounds[i];
    tower.activeX += room.stackSpeeds[i] * room.stackDirs[i];
    if (tower.activeX <= minX) {
      tower.activeX = minX;
      room.stackDirs[i] = 1;
    } else if (tower.activeX + tower.activeWidth >= maxX) {
      tower.activeX = maxX - tower.activeWidth;
      room.stackDirs[i] = -1;
    }
  }

  broadcastRoom(room);
}

function handleChessMove(
  room: InternalRoom,
  slot: 0 | 1,
  from: [number, number],
  to: [number, number]
): void {
  const gs = room.gameState;
  if (!gs || gs.kind !== 'void-chess' || room.status !== 'PLAYING') return;
  const expectedColor = slot === 0 ? 'w' : 'b';
  if (gs.turn !== expectedColor) return;

  const [fr, fc] = from;
  const [tr, tc] = to;
  if (
    !Number.isInteger(fr) ||
    !Number.isInteger(fc) ||
    !Number.isInteger(tr) ||
    !Number.isInteger(tc) ||
    fr < 0 ||
    fr >= 6 ||
    fc < 0 ||
    fc >= 6 ||
    tr < 0 ||
    tr >= 6 ||
    tc < 0 ||
    tc >= 6
  ) {
    return;
  }

  const piece = gs.board[fr]?.[fc];
  if (!piece || piece.color !== expectedColor) return;

  const legal = getChessLegalMoves(gs.board, fr, fc);
  if (!legal.some(([mr, mc]) => mr === tr && mc === tc)) return;

  const pieceValues: Record<ChessPiece['type'], number> = {
    P: 40,
    N: 90,
    R: 130,
    Q: 220,
    K: 500,
  };

  const captured = gs.board[tr][tc];
  if (piece.type === 'P' && ((piece.color === 'w' && tr === 0) || (piece.color === 'b' && tr === 5))) {
    gs.board[tr][tc] = { color: piece.color, type: 'Q' };
  } else {
    gs.board[tr][tc] = piece;
  }
  gs.board[fr][fc] = null;

  gs.scores[slot] += 10 + (captured ? pieceValues[captured.type] : 0);
  if (room.players[slot]) room.players[slot].score = gs.scores[slot];

  if (captured?.type === 'K') {
    gs.winnerSlot = slot;
    gs.statusNote = `${room.players[slot]?.name ?? `Player ${slot + 1}`} captured the King!`;
    room.status = 'FINISHED';
  } else {
    gs.turn = expectedColor === 'w' ? 'b' : 'w';
    const nextSlot = slot === 0 ? 1 : 0;
    gs.statusNote = `${room.players[nextSlot]?.name ?? `Player ${nextSlot + 1}`}'s turn (${
      gs.turn === 'w' ? 'White' : 'Black'
    }).`;
  }

  broadcastRoom(room);
}

function handleTrumpPlay(room: InternalRoom, slot: 0 | 1, cardId: string): void {
  const gs = room.gameState;
  if (!gs || gs.kind !== 'trump-duel' || room.status !== 'PLAYING') return;
  if (gs.turnSlot !== slot) return;

  const hand = gs.hands[slot];
  const cardIdx = hand.findIndex((c) => c.id === cardId);
  if (cardIdx === -1) return;

  const played = hand[cardIdx];
  const otherSlot: 0 | 1 = slot === 0 ? 1 : 0;
  const leadCard = gs.tableCards[gs.leadSlot];

  // Enforce follow-suit when second to act
  if (leadCard && slot !== gs.leadSlot) {
    const hasLeadSuit = hand.some((c) => c.suit === leadCard.suit);
    if (hasLeadSuit && played.suit !== leadCard.suit) {
      return;
    }
  }

  hand.splice(cardIdx, 1);
  gs.tableCards[slot] = played;

  if (!gs.tableCards[otherSlot]) {
    gs.turnSlot = otherSlot;
    gs.message = `${room.players[otherSlot]?.name ?? `Player ${otherSlot + 1}`}'s turn to respond.`;
    broadcastRoom(room);
    return;
  }

  // Resolve trick
  const firstCard = gs.tableCards[gs.leadSlot]!;
  const secondCard = gs.tableCards[gs.leadSlot === 0 ? 1 : 0]!;
  const power = (c: TrumpCard) => {
    if (c.suit === gs.trump) return 100 + c.rank;
    if (c.suit === firstCard.suit) return 50 + c.rank;
    return c.rank;
  };

  const trickWinner: 0 | 1 =
    power(firstCard) >= power(secondCard) ? gs.leadSlot : gs.leadSlot === 0 ? 1 : 0;
  gs.tricks[trickWinner] += 1;
  gs.scores[trickWinner] += 100;
  gs.scores[trickWinner === 0 ? 1 : 0] += 20;
  if (room.players[0]) room.players[0].score = gs.scores[0];
  if (room.players[1]) room.players[1].score = gs.scores[1];

  const winnerName = room.players[trickWinner]?.name ?? `Player ${trickWinner + 1}`;
  gs.message = `${winnerName} won the trick!`;

  if (gs.hands[0].length === 0 && gs.hands[1].length === 0) {
    gs.winnerSlot =
      gs.tricks[0] === gs.tricks[1] ? 'draw' : gs.tricks[0] > gs.tricks[1] ? 0 : 1;
    room.status = 'FINISHED';
    broadcastRoom(room);
    return;
  }

  gs.leadSlot = trickWinner;
  gs.turnSlot = trickWinner;
  broadcastRoom(room);

  setTimeout(() => {
    if (room.gameState?.kind === 'trump-duel' && room.status === 'PLAYING') {
      room.gameState.tableCards = [null, null];
      room.gameState.message = `${winnerName} leads the next trick.`;
      broadcastRoom(room);
    }
  }, 850);
}

function handleOrbitDrop(room: InternalRoom, slot: 0 | 1): void {
  const gs = room.gameState;
  if (!gs || gs.kind !== 'orbit-stacker' || room.status !== 'PLAYING') return;
  const tower = gs.towers[slot];
  if (!tower.alive) return;

  const top = tower.stack[tower.stack.length - 1];
  const left = Math.max(top.x, tower.activeX);
  const right = Math.min(top.x + top.width, tower.activeX + tower.activeWidth);
  const overlap = right - left;

  if (overlap <= 4) {
    tower.alive = false;
  } else {
    const isPerfect = Math.abs(tower.activeX - top.x) <= 6;
    const finalX = isPerfect ? top.x : left;
    const finalWidth = isPerfect ? top.width : overlap;
    const color = slot === 0 ? '#4cd7f6' : '#f43f5e';

    tower.stack.push({ x: finalX, width: finalWidth, color });
    tower.activeWidth = finalWidth;
    const minX = slot === 0 ? 16 : 336;
    const maxX = slot === 0 ? 304 : 624;
    tower.activeX = tower.stack.length % 2 === 0 ? minX : maxX - finalWidth;
    room.stackDirs[slot] = tower.stack.length % 2 === 0 ? 1 : -1;
    room.stackSpeeds[slot] = Math.min(8.5, 4.2 + tower.stack.length * 0.25);

    tower.score += isPerfect ? 60 : 35;
    if (room.players[slot]) room.players[slot].score = tower.score;
  }

  if (!gs.towers[0].alive && !gs.towers[1].alive) {
    gs.winnerSlot =
      gs.towers[0].score === gs.towers[1].score
        ? 'draw'
        : gs.towers[0].score > gs.towers[1].score
        ? 0
        : 1;
    room.status = 'FINISHED';
    stopRoomLoop(room);
  } else if (!gs.towers[0].alive || !gs.towers[1].alive) {
    const aliveSlot: 0 | 1 = gs.towers[0].alive ? 0 : 1;
    const deadSlot: 0 | 1 = aliveSlot === 0 ? 1 : 0;
    if (gs.towers[aliveSlot].score > gs.towers[deadSlot].score) {
      gs.winnerSlot = aliveSlot;
      room.status = 'FINISHED';
      stopRoomLoop(room);
    }
  }

  broadcastRoom(room);
}

function removeSocketFromRoom(ws: WebSocket): void {
  const meta = socketMeta.get(ws);
  if (!meta) return;
  socketMeta.delete(ws);

  const room = rooms.get(meta.roomCode);
  if (!room) return;

  room.players = room.players.filter((p) => p.slot !== meta.slot);
  if (room.players.length === 0) {
    stopRoomLoop(room);
    rooms.delete(room.code);
    return;
  }

  // Re-index remaining player as slot 0 if needed and return to lobby if match was running
  stopRoomLoop(room);
  room.players[0].slot = 0;
  room.players[0].ready = false;
  if (room.players[0].ws) {
    socketMeta.set(room.players[0].ws, { roomCode: room.code, slot: 0 });
  }
  room.status = 'LOBBY';
  room.gameState = null;
  broadcastRoom(room);
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, activeRooms: rooms.size });
  });

  app.get('/api/rooms/:code', (req, res) => {
    const code = normalizeRoomCode(req.params.code);
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ exists: false });
      return;
    }
    res.json({
      exists: true,
      code: room.code,
      gameId: room.gameId,
      playerCount: room.players.length,
      status: room.status,
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let msg: ClientWsMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientWsMessage;
      } catch {
        sendJson(ws, { type: 'room:error', message: 'Invalid message payload.' });
        return;
      }

      if (!msg || typeof msg.type !== 'string') return;

      if (msg.type === 'room:create') {
        removeSocketFromRoom(ws);
        const gameId =
          typeof msg.gameId === 'string' && GAME_ENGINE_MAP[msg.gameId]
            ? msg.gameId
            : 'astro-dodge';
        const engine = GAME_ENGINE_MAP[gameId];
        const code = generateRoomCode();
        const name = sanitizePlayerName(msg.playerName, 'Player 1');

        const room: InternalRoom = {
          code,
          gameId,
          engine,
          status: 'LOBBY',
          players: [
            {
              slot: 0,
              name,
              ready: false,
              score: 0,
              ws,
              inputDx: 0,
              inputDy: 0,
            },
          ],
          gameState: null,
          tickTimer: null,
          frameCount: 0,
          nextObstacleId: 1,
          stackDirs: [1, -1],
          stackSpeeds: [4.2, 4.2],
          createdAt: Date.now(),
        };
        rooms.set(code, room);
        socketMeta.set(ws, { roomCode: code, slot: 0 });
        broadcastRoom(room);
        return;
      }

      if (msg.type === 'room:join') {
        const code = normalizeRoomCode(msg.code);
        const room = rooms.get(code);
        if (!room) {
          sendJson(ws, {
            type: 'room:error',
            message: `Room "${code || '???'}" was not found.`,
          });
          return;
        }
        if (room.players.length >= 2) {
          sendJson(ws, {
            type: 'room:error',
            message: `Room ${code} already has 2 players.`,
          });
          return;
        }
        removeSocketFromRoom(ws);
        const name = sanitizePlayerName(msg.playerName, 'Player 2');
        room.players.push({
          slot: 1,
          name,
          ready: false,
          score: 0,
          ws,
          inputDx: 0,
          inputDy: 0,
        });
        socketMeta.set(ws, { roomCode: code, slot: 1 });
        broadcastRoom(room);
        return;
      }

      if (msg.type === 'room:leave') {
        removeSocketFromRoom(ws);
        return;
      }

      const meta = socketMeta.get(ws);
      if (!meta) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      const player = room.players.find((p) => p.slot === meta.slot);
      if (!player) return;

      if (msg.type === 'room:ready') {
        player.ready = Boolean(msg.ready);
        broadcastRoom(room);
      } else if (msg.type === 'room:set_game') {
        if (meta.slot !== 0 || room.status !== 'LOBBY') return;
        if (typeof msg.gameId === 'string' && GAME_ENGINE_MAP[msg.gameId]) {
          room.gameId = msg.gameId;
          room.engine = GAME_ENGINE_MAP[msg.gameId];
          broadcastRoom(room);
        }
      } else if (msg.type === 'room:start' || msg.type === 'room:rematch') {
        if (meta.slot !== 0) return;
        if (room.players.length < 2) {
          sendJson(ws, {
            type: 'room:error',
            message: 'Wait for a second player to join with your room code before starting.',
          });
          return;
        }
        startMatch(room);
      } else if (msg.type === 'game:input') {
        if (typeof msg.dx === 'number' && Number.isFinite(msg.dx)) {
          player.inputDx = Math.max(-1, Math.min(1, msg.dx));
        }
        if (typeof msg.dy === 'number' && Number.isFinite(msg.dy)) {
          player.inputDy = Math.max(-1, Math.min(1, msg.dy));
        }
      } else if (msg.type === 'game:drop') {
        handleOrbitDrop(room, meta.slot);
      } else if (msg.type === 'game:chess_move') {
        handleChessMove(room, meta.slot, msg.from, msg.to);
      } else if (msg.type === 'game:card_play' && typeof msg.cardId === 'string') {
        handleTrumpPlay(room, meta.slot, msg.cardId);
      }
    });

    ws.on('close', () => {
      removeSocketFromRoom(ws);
    });
  });

  // Periodic cleanup of stale empty rooms older than 2 hours
  setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms.entries()) {
      const anyOpen = room.players.some((p) => p.ws && p.ws.readyState === WebSocket.OPEN);
      if (!anyOpen && now - room.createdAt > 2 * 60 * 60 * 1000) {
        stopRoomLoop(room);
        rooms.delete(code);
      }
    }
  }, 5 * 60 * 1000);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`PlayZone server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start PlayZone server:', err);
  process.exit(1);
});
