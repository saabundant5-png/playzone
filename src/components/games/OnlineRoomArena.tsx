import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import type {
  ChessPiece,
  RoomSnapshot,
  TrumpCard,
} from '../../multiplayerTypes';
import { soundFX } from '../../utils/sound';

interface OnlineRoomArenaProps {
  room: RoomSnapshot;
  onSendInput: (dx: number, dy: number) => void;
  onSendDrop: () => void;
  onSendChessMove: (from: [number, number], to: [number, number]) => void;
  onSendCardPlay: (cardId: string) => void;
  onRematch: () => void;
  onLeaveRoom: () => void;
}

const PIECE_GLYPHS: Record<'w' | 'b', Record<ChessPiece['type'], string>> = {
  w: { K: '♔', Q: '♕', R: '♖', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', N: '♞', P: '♟' },
};

export const OnlineRoomArena: React.FC<OnlineRoomArenaProps> = ({
  room,
  onSendInput,
  onSendDrop,
  onSendChessMove,
  onSendCardPlay,
  onRematch,
  onLeaveRoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [chessSelected, setChessSelected] = useState<[number, number] | null>(null);
  const keysPressedRef = useRef<Record<string, boolean>>({});
  const lastInputRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const gs = room.gameState;
  const p1 = room.players[0];
  const p2 = room.players[1];
  const isHost = room.yourSlot === 0;

  // Real-time keyboard input handler (both WASD and Arrow keys work for the local online player!)
  useEffect(() => {
    if (room.status !== 'PLAYING') return;
    if (
      room.engine !== 'astro-dodge' &&
      room.engine !== 'neon-breaker' &&
      room.engine !== 'orbit-stacker'
    ) {
      return;
    }

    const computeAndEmit = () => {
      const k = keysPressedRef.current;
      let dx = 0;
      let dy = 0;
      if (k['a'] || k['A'] || k['ArrowLeft']) dx -= 1;
      if (k['d'] || k['D'] || k['ArrowRight']) dx += 1;
      if (k['w'] || k['W'] || k['ArrowUp']) dy -= 1;
      if (k['s'] || k['S'] || k['ArrowDown']) dy += 1;

      if (dx !== lastInputRef.current.dx || dy !== lastInputRef.current.dy) {
        lastInputRef.current = { dx, dy };
        onSendInput(dx, dy);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (room.engine === 'orbit-stacker' && (e.code === 'Space' || e.key === 'Enter' || e.key === 'w' || e.key === 'ArrowUp')) {
        if (!e.repeat) {
          soundFX.playClick();
          onSendDrop();
        }
        return;
      }
      keysPressedRef.current[e.key] = true;
      computeAndEmit();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key] = false;
      computeAndEmit();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      keysPressedRef.current = {};
      onSendInput(0, 0);
    };
  }, [room.engine, room.status, onSendInput, onSendDrop]);

  // Render canvas for real-time engines
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gs) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 640;
    const H = 360;
    ctx.fillStyle = '#060e20';
    ctx.fillRect(0, 0, W, H);

    if (gs.kind === 'astro-dodge') {
      gs.obstacles.forEach((ob) => {
        ctx.beginPath();
        ctx.arc(ob.x, ob.y, ob.r, 0, Math.PI * 2);
        ctx.fillStyle = ob.kind === 'crystal' ? '#f59e0b' : '#222a3d';
        ctx.fill();
        ctx.strokeStyle = ob.kind === 'crystal' ? '#fde68a' : '#f43f5e';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      const shipColors = ['#4cd7f6', '#f43f5e'];
      gs.ships.forEach((ship, idx) => {
        if (!ship.alive) return;
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(16, 14);
        ctx.lineTo(0, 8);
        ctx.lineTo(-16, 14);
        ctx.closePath();
        ctx.fillStyle = shipColors[idx];
        ctx.fill();
        ctx.strokeStyle = room.yourSlot === idx ? '#ffffff' : 'rgba(255,255,255,0.4)';
        ctx.lineWidth = room.yourSlot === idx ? 2.5 : 1.2;
        ctx.stroke();
        ctx.restore();
      });
    } else if (gs.kind === 'neon-breaker') {
      gs.bricks.forEach((b) => {
        if (!b.alive) return;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, 68, 18, 4);
        ctx.fill();
      });

      const paddleColors = ['#4cd7f6', '#f43f5e'];
      gs.paddles.forEach((p, idx) => {
        ctx.fillStyle = paddleColors[idx];
        ctx.beginPath();
        ctx.roundRect(p.x, H - 28, 92, 12, 6);
        ctx.fill();
      });

      ctx.beginPath();
      ctx.arc(gs.ball.x, gs.ball.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    } else if (gs.kind === 'orbit-stacker') {
      // Divider
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(W / 2, 16);
      ctx.lineTo(W / 2, H - 16);
      ctx.stroke();

      gs.towers.forEach((tower, idx) => {
        const visible = tower.stack.slice(-11);
        visible.forEach((slab, sIdx) => {
          const y = H - 30 - sIdx * 25;
          ctx.fillStyle = slab.color;
          ctx.beginPath();
          ctx.roundRect(slab.x, y, slab.width, 22, 4);
          ctx.fill();
        });
        if (tower.alive) {
          const activeY = H - 30 - visible.length * 25;
          ctx.fillStyle = idx === 0 ? '#a5f3fc' : '#fecdd3';
          ctx.beginPath();
          ctx.roundRect(tower.activeX, activeY, tower.activeWidth, 22, 4);
          ctx.fill();
        }
      });
    }
  }, [gs, room.yourSlot]);

  if (!gs) return null;

  const winnerLabel =
    gs.winnerSlot === 'draw'
      ? 'Match Tied!'
      : gs.winnerSlot === 0
      ? `${p1?.name ?? 'Player 1'} Wins!`
      : gs.winnerSlot === 1
      ? `${p2?.name ?? 'Player 2'} Wins!`
      : null;

  const isRed = (s: TrumpCard['suit']) => s === '♥' || s === '♦';

  return (
    <div className="space-y-4">
      {/* Live Players Scoreboard Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#131b2e] px-4 py-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="font-display font-semibold text-[#4cd7f6]">
            {p1?.name ?? 'Player 1'} {room.yourSlot === 0 ? '(You)' : ''}
          </span>
          <span className="font-mono font-bold text-white tabular-nums">
            {p1?.score ?? 0} pts
          </span>
        </div>

        <span className="font-mono text-xs text-[#908fa0]">ROOM {room.code}</span>

        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-white tabular-nums">
            {p2?.score ?? 0} pts
          </span>
          <span className="font-display font-semibold text-[#ffb2b7]">
            {p2?.name ?? 'Player 2'} {room.yourSlot === 1 ? '(You)' : ''}
          </span>
        </div>
      </div>

      {/* Finished Banner */}
      {room.status === 'FINISHED' && winnerLabel && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#f59e0b]/40 bg-[#171f33] px-5 py-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-[#f59e0b]" />
            <div>
              <h4 className="font-display text-lg font-bold text-[#dae2fd]">{winnerLabel}</h4>
              <p className="text-xs text-[#c7c4d7]">
                Final Score: {p1?.score ?? 0} vs {p2?.score ?? 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isHost ? (
              <button
                type="button"
                onClick={onRematch}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#6366f1] px-4 py-2 font-display text-xs font-semibold text-white hover:bg-[#5558e8] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Rematch</span>
              </button>
            ) : (
              <span className="text-xs text-[#908fa0]">Waiting for host to start rematch...</span>
            )}
            <button
              type="button"
              onClick={onLeaveRoom}
              className="rounded-lg border border-white/10 bg-[#222a3d] px-3.5 py-2 text-xs font-medium text-[#dae2fd] hover:text-white cursor-pointer"
            >
              Leave Room
            </button>
          </div>
        </div>
      )}

      {/* Real-time Canvas View */}
      {(gs.kind === 'astro-dodge' ||
        gs.kind === 'neon-breaker' ||
        gs.kind === 'orbit-stacker') && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#060e20]">
          <canvas
            ref={canvasRef}
            width={640}
            height={360}
            onClick={() => {
              if (gs.kind === 'orbit-stacker' && room.status === 'PLAYING') {
                onSendDrop();
              }
            }}
            className="block w-full aspect-[16/9] touch-none"
          />
          <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#131b2e] px-4 py-2 text-xs text-[#908fa0]">
            <span>
              {gs.kind === 'orbit-stacker'
                ? 'Press Space, Enter, W, or click canvas to drop your slab.'
                : 'Use WASD or Arrow Keys to move your craft/paddle.'}
            </span>
            {gs.kind === 'astro-dodge' && (
              <span className="font-mono tabular-nums text-[#c7c4d7]">
                Shields: P1 {gs.ships[0].shields}/3 · P2 {gs.ships[1].shields}/3
              </span>
            )}
            {gs.kind === 'neon-breaker' && (
              <span className="font-mono tabular-nums text-[#c7c4d7]">
                Arena Shields: {gs.shields}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Turn-based Online Chess */}
      {gs.kind === 'void-chess' && (
        <div className="flex flex-col items-center rounded-xl border border-white/10 bg-[#060e20] p-5">
          <p className="mb-3 text-sm text-[#dae2fd]">
            You are{' '}
            <strong className={room.yourSlot === 0 ? 'text-[#4cd7f6]' : 'text-[#ffb2b7]'}>
              {room.yourSlot === 0 ? 'White (P1)' : 'Black (P2)'}
            </strong>{' '}
            — {gs.statusNote}
          </p>
          <div className="grid grid-cols-6 overflow-hidden rounded-xl border border-white/15">
            {gs.board.map((row, r) =>
              row.map((piece, c) => {
                const isDark = (r + c) % 2 === 1;
                const isSel = chessSelected?.[0] === r && chessSelected?.[1] === c;
                const myColor = room.yourSlot === 0 ? 'w' : 'b';
                const isMyTurn = gs.turn === myColor && room.status === 'PLAYING';

                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    disabled={!isMyTurn}
                    onClick={() => {
                      if (!isMyTurn) return;
                      if (chessSelected) {
                        if (chessSelected[0] === r && chessSelected[1] === c) {
                          setChessSelected(null);
                          return;
                        }
                        if (piece?.color === myColor) {
                          setChessSelected([r, c]);
                          soundFX.playClick();
                          return;
                        }
                        onSendChessMove(chessSelected, [r, c]);
                        setChessSelected(null);
                        soundFX.playClick();
                      } else if (piece?.color === myColor) {
                        setChessSelected([r, c]);
                        soundFX.playClick();
                      }
                    }}
                    className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center text-2xl sm:text-3xl transition-colors cursor-pointer disabled:cursor-default ${
                      isSel
                        ? 'bg-[#6366f1]/60'
                        : isDark
                        ? 'bg-[#131b2e]'
                        : 'bg-[#222a3d]'
                    }`}
                  >
                    {piece && (
                      <span className={piece.color === 'w' ? 'text-[#f8fafc]' : 'text-[#ffb2b7]'}>
                        {PIECE_GLYPHS[piece.color][piece.type]}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Turn-based Online Trump Duel */}
      {gs.kind === 'trump-duel' && (
        <div className="rounded-xl border border-white/10 bg-[#0f5132]/35 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#060e20]/80 px-4 py-2.5 text-sm">
            <span className="text-[#c7c4d7]">
              Trump Suit:{' '}
              <strong className={`text-lg ${isRed(gs.trump) ? 'text-[#f43f5e]' : 'text-[#4cd7f6]'}`}>
                {gs.trump}
              </strong>
            </span>
            <span className="font-mono text-[#dae2fd] tabular-nums">
              Tricks: {gs.tricks[0]} - {gs.tricks[1]}
            </span>
            <span className="text-xs font-medium text-[#4cd7f6]">
              {gs.turnSlot === room.yourSlot ? 'Your Turn' : 'Opponent Turn'}
            </span>
          </div>

          {/* Opponent Hidden Cards */}
          <div className="flex justify-center gap-2">
            {Array.from({ length: gs.handCounts[room.yourSlot === 0 ? 1 : 0] }).map((_, i) => (
              <div
                key={i}
                className="flex h-12 w-9 items-center justify-center rounded-lg border border-white/15 bg-[#171f33] text-[10px] text-[#908fa0]"
              >
                PZ
              </div>
            ))}
          </div>

          {/* Table Battle Zone */}
          <div className="flex flex-col items-center rounded-xl border border-white/10 bg-[#060e20]/60 p-4">
            <div className="flex items-center gap-6">
              {[0, 1].map((slotIdx) => {
                const card = gs.tableCards[slotIdx];
                return (
                  <div key={slotIdx} className="flex flex-col items-center">
                    <span className="mb-1 text-[11px] text-[#908fa0]">
                      {slotIdx === room.yourSlot ? 'You' : 'Opponent'}
                    </span>
                    {card ? (
                      <div className="flex h-24 w-16 flex-col items-center justify-center rounded-lg bg-[#f8fafc] shadow">
                        <span className={`font-display text-lg font-bold ${isRed(card.suit) ? 'text-[#dc2626]' : 'text-[#0f172a]'}`}>
                          {card.label}
                        </span>
                        <span className={`text-2xl ${isRed(card.suit) ? 'text-[#dc2626]' : 'text-[#0f172a]'}`}>
                          {card.suit}
                        </span>
                      </div>
                    ) : (
                      <div className="flex h-24 w-16 items-center justify-center rounded-lg border border-dashed border-white/20 text-xs text-[#908fa0]">
                        —
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-[#dae2fd]">{gs.message}</p>
          </div>

          {/* Local Player Hand */}
          <div className="flex flex-wrap justify-center gap-2.5">
            {gs.myHand.map((card) => {
              const isMyTurn = gs.turnSlot === room.yourSlot && room.status === 'PLAYING';
              const leadCard = gs.tableCards[gs.leadSlot];
              const mustFollow =
                isMyTurn &&
                leadCard &&
                room.yourSlot !== gs.leadSlot &&
                gs.myHand.some((c) => c.suit === leadCard.suit);
              const isLegal = isMyTurn && (!mustFollow || card.suit === leadCard?.suit);

              return (
                <button
                  key={card.id}
                  type="button"
                  disabled={!isLegal}
                  onClick={() => {
                    soundFX.playClick();
                    onSendCardPlay(card.id);
                  }}
                  className={`flex h-24 w-16 flex-col items-center justify-center rounded-lg border bg-[#f8fafc] shadow transition-transform duration-150 ${
                    isLegal
                      ? 'border-[#4cd7f6] hover:-translate-y-1.5 cursor-pointer'
                      : 'border-white/10 opacity-45 cursor-not-allowed'
                  }`}
                >
                  <span className={`font-display text-lg font-bold ${isRed(card.suit) ? 'text-[#dc2626]' : 'text-[#0f172a]'}`}>
                    {card.label}
                  </span>
                  <span className={`text-2xl ${isRed(card.suit) ? 'text-[#dc2626]' : 'text-[#0f172a]'}`}>
                    {card.suit}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
