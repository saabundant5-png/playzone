import React, { useEffect, useRef, useState } from 'react';
import type { PlayMode } from '../../multiplayerTypes';
import { GameItem } from '../../types';
import { soundFX } from '../../utils/sound';

interface NeonBreakerGameProps {
  game: GameItem;
  playMode?: PlayMode;
  onScoreUpdate: (score: number) => void;
  onGameEnd: (finalScore: number, won: boolean, summaryText?: string) => void;
  resetSignal: number;
}

export const NeonBreakerGame: React.FC<NeonBreakerGameProps> = ({
  game,
  playMode = '1p',
  onScoreUpdate,
  onGameEnd,
  resetSignal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [lives, setLives] = useState(3);
  const speedMult = game.variantConfig?.speedMultiplier ?? 1;
  const accentHex = game.variantConfig?.accentHex ?? '#6366f1';
  const secondaryHex = game.variantConfig?.secondaryHex ?? '#4cd7f6';
  const isTwoPlayer = playMode === '2p-local';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 640;
    const H = 360;
    const paddleW = isTwoPlayer ? 88 : 104;
    const paddleH = 12;
    let p1X = isTwoPlayer ? 130 : (W - paddleW) / 2;
    let p2X = 420;
    let ballX = W / 2;
    let ballY = H - 56;
    let dx = 3.5 * speedMult;
    let dy = -3.7 * speedMult;
    const currentScores: [number, number] = [0, 0];
    let lastHitter: 0 | 1 = 0;
    let currentLives = isTwoPlayer ? 4 : 3;
    let ended = false;
    const keys: Record<string, boolean> = {};

    const rows = 4;
    const cols = 8;
    const brickW = 68;
    const brickH = 18;
    const pad = 8;
    const offsetLeft = 20;
    const offsetTop = 34;

    const bricks: { x: number; y: number; alive: boolean; pts: number; color: string }[] = [];
    const colors = ['#f43f5e', '#f59e0b', secondaryHex, accentHex];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: offsetLeft + c * (brickW + pad),
          y: offsetTop + r * (brickH + pad),
          alive: true,
          pts: (rows - r) * 25,
          color: colors[r % colors.length],
        });
      }
    }

    setScores([0, 0]);
    setLives(currentLives);
    onScoreUpdate(0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
      }
      keys[e.key] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key] = false;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (isTwoPlayer) return;
      const rect = canvas.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * W;
      p1X = Math.max(8, Math.min(W - paddleW - 8, relX - paddleW / 2));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('pointermove', onPointerMove);

    let rafId = 0;
    const loop = () => {
      if (ended) return;

      if (isTwoPlayer) {
        if (keys['a'] || keys['A']) p1X -= 7.5;
        if (keys['d'] || keys['D']) p1X += 7.5;
        if (keys['ArrowLeft']) p2X -= 7.5;
        if (keys['ArrowRight']) p2X += 7.5;
        p1X = Math.max(8, Math.min(W - paddleW - 8, p1X));
        p2X = Math.max(8, Math.min(W - paddleW - 8, p2X));
      } else {
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) p1X -= 7.5;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) p1X += 7.5;
        p1X = Math.max(8, Math.min(W - paddleW - 8, p1X));
      }

      ballX += dx;
      ballY += dy;

      if (ballX + 8 > W || ballX - 8 < 0) {
        dx = -dx;
        soundFX.playClick();
      }
      if (ballY - 8 < 0) {
        dy = -dy;
        soundFX.playClick();
      }

      // Paddle collisions
      const paddles = isTwoPlayer ? [p1X, p2X] : [p1X];
      for (let idx = 0; idx < paddles.length; idx++) {
        const px = paddles[idx];
        if (
          ballY + 8 >= H - 28 &&
          ballY - 8 <= H - 28 + paddleH &&
          ballX >= px &&
          ballX <= px + paddleW &&
          dy > 0
        ) {
          const hitPos = (ballX - (px + paddleW / 2)) / (paddleW / 2);
          dx = hitPos * 4.9 * speedMult;
          dy = -Math.abs(dy);
          lastHitter = idx as 0 | 1;
          soundFX.playClick();
          break;
        }
      }

      // Brick collisions
      let remaining = 0;
      for (const b of bricks) {
        if (!b.alive) continue;
        remaining++;
        if (
          ballX + 7 > b.x &&
          ballX - 7 < b.x + brickW &&
          ballY + 7 > b.y &&
          ballY - 7 < b.y + brickH
        ) {
          b.alive = false;
          remaining--;
          dy = -dy;
          currentScores[lastHitter] += b.pts;
          setScores([...currentScores] as [number, number]);
          onScoreUpdate(Math.max(currentScores[0], currentScores[1]));
          soundFX.playScore();
          break;
        }
      }

      if (remaining === 0) {
        ended = true;
        soundFX.playWin();
        if (isTwoPlayer) {
          const winner =
            currentScores[0] === currentScores[1]
              ? `Draw! ${currentScores[0]} - ${currentScores[1]} pts`
              : currentScores[0] > currentScores[1]
              ? `P1 (WASD) Wins! ${currentScores[0]} vs ${currentScores[1]} pts`
              : `P2 (Arrows) Wins! ${currentScores[1]} vs ${currentScores[0]} pts`;
          onGameEnd(Math.max(currentScores[0], currentScores[1]), true, winner);
        } else {
          onGameEnd(currentScores[0] + currentLives * 100, true);
        }
        return;
      }

      if (ballY > H + 12) {
        currentLives -= 1;
        setLives(currentLives);
        soundFX.playHit();
        if (currentLives <= 0) {
          ended = true;
          if (isTwoPlayer) {
            const winner =
              currentScores[0] === currentScores[1]
                ? `Draw! ${currentScores[0]} - ${currentScores[1]} pts`
                : currentScores[0] > currentScores[1]
                ? `P1 (WASD) Wins! ${currentScores[0]} vs ${currentScores[1]} pts`
                : `P2 (Arrows) Wins! ${currentScores[1]} vs ${currentScores[0]} pts`;
            onGameEnd(Math.max(currentScores[0], currentScores[1]), true, winner);
          } else {
            onGameEnd(currentScores[0], false);
          }
          return;
        }
        ballX = W / 2;
        ballY = H - 56;
        dx = 3.5 * speedMult * (Math.random() > 0.5 ? 1 : -1);
        dy = -3.7 * speedMult;
      }

      ctx.fillStyle = '#060e20';
      ctx.fillRect(0, 0, W, H);

      for (const b of bricks) {
        if (!b.alive) continue;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, brickW, brickH, 4);
        ctx.fill();
      }

      // P1 Paddle
      ctx.fillStyle = secondaryHex;
      ctx.beginPath();
      ctx.roundRect(p1X, H - 28, paddleW, paddleH, 6);
      ctx.fill();

      // P2 Paddle
      if (isTwoPlayer) {
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.roundRect(p2X, H - 28, paddleW, paddleH, 6);
        ctx.fill();
      }

      // Ball
      ctx.beginPath();
      ctx.arc(ballX, ballY, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointermove', onPointerMove);
    };
  }, [game.id, isTwoPlayer, resetSignal, speedMult, accentHex, secondaryHex]);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-[#060e20]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-[#131b2e] px-4 py-2.5 text-sm">
        {isTwoPlayer ? (
          <>
            <span className="text-[#c7c4d7]">
              <strong className="text-[#4cd7f6]">P1 (A/D):</strong>{' '}
              <span className="font-mono text-white tabular-nums">{scores[0]}</span>
            </span>
            <span className="font-mono text-xs text-[#908fa0] tabular-nums">
              Shields: {lives}/4
            </span>
            <span className="text-[#c7c4d7]">
              <strong className="text-[#ffb2b7]">P2 (←/→):</strong>{' '}
              <span className="font-mono text-white tabular-nums">{scores[1]}</span>
            </span>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <span className="font-medium text-[#c7c4d7]">
                Score: <strong className="font-mono text-[#4cd7f6] tabular-nums">{scores[0]}</strong>
              </span>
              <span className="font-medium text-[#c7c4d7]">
                Shields: <strong className="font-mono text-[#ffb2b7] tabular-nums">{lives}/3</strong>
              </span>
            </div>
            <span className="text-xs text-[#908fa0]">Clear all bricks (+100 bonus per shield)</span>
          </>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        className="block w-full aspect-[16/9] cursor-ew-resize touch-none"
      />
    </div>
  );
};
