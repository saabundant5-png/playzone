import React, { useEffect, useRef, useState } from 'react';
import type { PlayMode } from '../../multiplayerTypes';
import { GameItem } from '../../types';
import { soundFX } from '../../utils/sound';

interface AstroDodgeGameProps {
  game: GameItem;
  playMode?: PlayMode;
  onScoreUpdate: (score: number) => void;
  onGameEnd: (finalScore: number, won: boolean, summaryText?: string) => void;
  resetSignal: number;
  previewOnly?: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  r: number;
  speed: number;
  kind: 'rock' | 'crystal';
}

export const AstroDodgeGame: React.FC<AstroDodgeGameProps> = ({
  game,
  playMode = '1p',
  onScoreUpdate,
  onGameEnd,
  resetSignal,
  previewOnly = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [shields, setShields] = useState<[number, number]>([3, 3]);
  const speedMult = game.variantConfig?.speedMultiplier ?? 1;
  const accentHex = game.variantConfig?.accentHex ?? '#4cd7f6';
  const secondaryHex = game.variantConfig?.secondaryHex ?? '#6366f1';
  const isTwoPlayer = !previewOnly && playMode === '2p-local';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 640;
    const H = 360;
    const shipState = [
      { x: isTwoPlayer ? 210 : W / 2, y: H - 48, targetX: isTwoPlayer ? 210 : W / 2, targetY: H - 48, shields: 3, score: 0, alive: true },
      { x: 430, y: H - 48, targetX: 430, targetY: H - 48, shields: 3, score: 0, alive: isTwoPlayer },
    ];

    let frame = 0;
    let ended = false;
    const keys: Record<string, boolean> = {};
    const obstacles: Obstacle[] = [];

    const stars = Array.from({ length: 42 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: Math.random() * 1.8 + 0.6,
      v: Math.random() * 1.2 + 0.5,
    }));

    setScores([0, 0]);
    setShields([3, 3]);
    onScoreUpdate(0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      keys[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key] = false;
    };
    const handlePointerMove = (e: PointerEvent) => {
      if (previewOnly || isTwoPlayer) return;
      const rect = canvas.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * W;
      shipState[0].targetX = Math.max(24, Math.min(W - 24, relX));
    };

    if (!previewOnly) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      canvas.addEventListener('pointermove', handlePointerMove);
    }

    let rafId = 0;
    const loop = () => {
      if (ended) return;
      frame++;

      if (previewOnly) {
        shipState[0].targetX = W / 2 + Math.sin(frame * 0.025) * 160;
      } else if (isTwoPlayer) {
        // Player 1: WASD
        if (keys['a'] || keys['A']) shipState[0].targetX -= 6.5;
        if (keys['d'] || keys['D']) shipState[0].targetX += 6.5;
        if (keys['w'] || keys['W']) shipState[0].targetY -= 4.5;
        if (keys['s'] || keys['S']) shipState[0].targetY += 4.5;
        // Player 2: Arrow keys
        if (keys['ArrowLeft']) shipState[1].targetX -= 6.5;
        if (keys['ArrowRight']) shipState[1].targetX += 6.5;
        if (keys['ArrowUp']) shipState[1].targetY -= 4.5;
        if (keys['ArrowDown']) shipState[1].targetY += 4.5;
      } else {
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) shipState[0].targetX -= 6.5;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) shipState[0].targetX += 6.5;
        if (keys['ArrowUp'] || keys['w'] || keys['W']) shipState[0].targetY -= 4.5;
        if (keys['ArrowDown'] || keys['s'] || keys['S']) shipState[0].targetY += 4.5;
      }

      shipState.forEach((s) => {
        s.targetX = Math.max(24, Math.min(W - 24, s.targetX));
        s.targetY = Math.max(90, Math.min(H - 28, s.targetY));
        s.x += (s.targetX - s.x) * 0.24;
        s.y += (s.targetY - s.y) * 0.24;
      });

      const spawnInterval = Math.max(13, Math.round(22 / speedMult));
      if (frame % spawnInterval === 0) {
        const isCrystal = Math.random() < 0.25;
        obstacles.push({
          x: 24 + Math.random() * (W - 48),
          y: -24,
          r: isCrystal ? 11 : 14 + Math.random() * 11,
          speed:
            (2.8 + Math.random() * 2.2 + Math.min(2.5, shipState[0].score / 400)) *
            speedMult,
          kind: isCrystal ? 'crystal' : 'rock',
        });
      }

      if (frame % 10 === 0 && !previewOnly) {
        if (shipState[0].alive) shipState[0].score += 5;
        if (isTwoPlayer && shipState[1].alive) shipState[1].score += 5;
        setScores([shipState[0].score, shipState[1].score]);
        onScoreUpdate(Math.max(shipState[0].score, shipState[1].score));
      }

      ctx.fillStyle = '#060e20';
      ctx.fillRect(0, 0, W, H);

      stars.forEach((st) => {
        st.y += st.v * speedMult;
        if (st.y > H) {
          st.y = 0;
          st.x = Math.random() * W;
        }
        ctx.fillStyle = 'rgba(218, 226, 253, 0.45)';
        ctx.fillRect(st.x, st.y, st.s, st.s);
      });

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const ob = obstacles[i];
        ob.y += ob.speed;

        ctx.beginPath();
        ctx.arc(ob.x, ob.y, ob.r, 0, Math.PI * 2);
        if (ob.kind === 'crystal') {
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
          ctx.strokeStyle = '#fde68a';
        } else {
          ctx.fillStyle = '#222a3d';
          ctx.fill();
          ctx.strokeStyle = '#f43f5e';
        }
        ctx.lineWidth = 2;
        ctx.stroke();

        let hitHandled = false;
        if (!previewOnly) {
          for (let pIdx = 0; pIdx < (isTwoPlayer ? 2 : 1); pIdx++) {
            const s = shipState[pIdx];
            if (!s.alive) continue;
            if (Math.hypot(ob.x - s.x, ob.y - s.y) < ob.r + 14) {
              obstacles.splice(i, 1);
              hitHandled = true;
              if (ob.kind === 'crystal') {
                s.score += 50;
                setScores([shipState[0].score, shipState[1].score]);
                onScoreUpdate(Math.max(shipState[0].score, shipState[1].score));
                soundFX.playScore();
              } else {
                s.shields -= 1;
                setShields([shipState[0].shields, shipState[1].shields]);
                soundFX.playHit();
                if (s.shields <= 0) {
                  s.alive = false;
                }
              }
              break;
            }
          }
        }

        if (hitHandled) {
          if (!isTwoPlayer && !shipState[0].alive) {
            ended = true;
            onGameEnd(shipState[0].score, shipState[0].score >= game.soloChallenge.targetScore);
            return;
          }
          if (isTwoPlayer && (!shipState[0].alive || !shipState[1].alive)) {
            ended = true;
            const winner = shipState[0].alive
              ? `P1 (WASD) Wins! ${shipState[0].score} vs ${shipState[1].score} pts`
              : `P2 (Arrows) Wins! ${shipState[1].score} vs ${shipState[0].score} pts`;
            soundFX.playWin();
            onGameEnd(Math.max(shipState[0].score, shipState[1].score), true, winner);
            return;
          }
          continue;
        }

        if (ob.y > H + 30) {
          obstacles.splice(i, 1);
        }
      }

      // Draw Ships
      const activeShips = isTwoPlayer ? [0, 1] : [0];
      activeShips.forEach((pIdx) => {
        const s = shipState[pIdx];
        if (!s.alive) return;
        const hullColor = pIdx === 0 ? (isTwoPlayer ? '#4cd7f6' : secondaryHex) : '#f43f5e';
        const flameColor = pIdx === 0 ? accentHex : '#f59e0b';

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.beginPath();
        ctx.moveTo(-6, 14);
        ctx.lineTo(0, 26 + (frame % 6));
        ctx.lineTo(6, 14);
        ctx.fillStyle = flameColor;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(16, 14);
        ctx.lineTo(0, 8);
        ctx.lineTo(-16, 14);
        ctx.closePath();
        ctx.fillStyle = hullColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (isTwoPlayer) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '600 10px Rubik, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(pIdx === 0 ? 'P1' : 'P2', 0, -24);
        }
        ctx.restore();
      });

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      if (!previewOnly) {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        canvas.removeEventListener('pointermove', handlePointerMove);
      }
    };
  }, [game.id, isTwoPlayer, previewOnly, resetSignal, speedMult, accentHex, secondaryHex]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-[#060e20]">
      {!previewOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-[#131b2e] px-4 py-2.5 text-sm">
          {isTwoPlayer ? (
            <>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-[#4cd7f6]">P1 (WASD):</span>
                <span className="font-mono text-white tabular-nums">{scores[0]} pts</span>
                <span className="font-mono text-xs text-[#908fa0] tabular-nums">
                  {shields[0]}/3 shields
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-[#ffb2b7]">P2 (Arrows):</span>
                <span className="font-mono text-white tabular-nums">{scores[1]} pts</span>
                <span className="font-mono text-xs text-[#908fa0] tabular-nums">
                  {shields[1]}/3 shields
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <span className="font-medium text-[#c7c4d7]">
                  Score:{' '}
                  <strong className="font-mono text-[#4cd7f6] tabular-nums">{scores[0]}</strong>
                </span>
                <span className="font-medium text-[#c7c4d7]">
                  Shields:{' '}
                  <strong className="font-mono text-[#ffb2b7] tabular-nums">{shields[0]}/3</strong>
                </span>
              </div>
              <span className="text-xs text-[#908fa0]">
                Collect gold cores (+50), dodge red meteors
              </span>
            </>
          )}
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        className="block w-full aspect-[16/9] cursor-crosshair touch-none"
      />
    </div>
  );
};
