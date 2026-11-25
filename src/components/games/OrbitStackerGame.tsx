import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PlayMode } from '../../multiplayerTypes';
import { GameItem } from '../../types';
import { soundFX } from '../../utils/sound';

interface OrbitStackerGameProps {
  game: GameItem;
  playMode?: PlayMode;
  onScoreUpdate: (score: number) => void;
  onGameEnd: (finalScore: number, won: boolean, summaryText?: string) => void;
  resetSignal: number;
}

interface Slab {
  x: number;
  width: number;
  color: string;
}

interface TowerState {
  stack: Slab[];
  activeX: number;
  activeWidth: number;
  dir: number;
  speed: number;
  score: number;
  alive: boolean;
}

export const OrbitStackerGame: React.FC<OrbitStackerGameProps> = ({
  game,
  playMode = '1p',
  onScoreUpdate,
  onGameEnd,
  resetSignal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [floors, setFloors] = useState<[number, number]>([0, 0]);
  const speedMult = game.variantConfig?.speedMultiplier ?? 1;
  const isTwoPlayer = playMode === '2p-local';

  const makeInitialTowers = useCallback((): [TowerState, TowerState] => {
    if (isTwoPlayer) {
      return [
        {
          stack: [{ x: 95, width: 130, color: '#4cd7f6' }],
          activeX: 30,
          activeWidth: 130,
          dir: 1,
          speed: 3.8 * speedMult,
          score: 0,
          alive: true,
        },
        {
          stack: [{ x: 415, width: 130, color: '#f43f5e' }],
          activeX: 480,
          activeWidth: 130,
          dir: -1,
          speed: 3.8 * speedMult,
          score: 0,
          alive: true,
        },
      ];
    }
    return [
      {
        stack: [{ x: 220, width: 200, color: '#6366f1' }],
        activeX: 60,
        activeWidth: 200,
        dir: 1,
        speed: 3.4 * speedMult,
        score: 0,
        alive: true,
      },
      {
        stack: [],
        activeX: 0,
        activeWidth: 0,
        dir: 1,
        speed: 0,
        score: 0,
        alive: false,
      },
    ];
  }, [isTwoPlayer, speedMult]);

  const stateRef = useRef<{ towers: [TowerState, TowerState]; ended: boolean }>({
    towers: makeInitialTowers(),
    ended: false,
  });

  const dropForPlayer = useCallback(
    (pIdx: 0 | 1) => {
      const st = stateRef.current;
      if (st.ended) return;
      const tower = st.towers[pIdx];
      if (!tower.alive) return;

      const top = tower.stack[tower.stack.length - 1];
      const left = Math.max(top.x, tower.activeX);
      const right = Math.min(top.x + top.width, tower.activeX + tower.activeWidth);
      const overlap = right - left;

      if (overlap <= 4) {
        tower.alive = false;
        soundFX.playHit();

        if (!isTwoPlayer) {
          st.ended = true;
          onGameEnd(tower.score, tower.score >= game.soloChallenge.targetScore);
          return;
        }

        const other = st.towers[pIdx === 0 ? 1 : 0];
        if (!other.alive || other.score > tower.score) {
          st.ended = true;
          const t0 = st.towers[0].score;
          const t1 = st.towers[1].score;
          const summary =
            t0 === t1
              ? `Draw! ${t0} - ${t1} pts`
              : t0 > t1
              ? `P1 (W) Wins! ${t0} vs ${t1} pts`
              : `P2 (↑) Wins! ${t1} vs ${t0} pts`;
          soundFX.playWin();
          onGameEnd(Math.max(t0, t1), true, summary);
        }
        return;
      }

      const isPerfect = Math.abs(tower.activeX - top.x) <= 6;
      const finalX = isPerfect ? top.x : left;
      const finalWidth = isPerfect ? top.width : overlap;
      const palette =
        pIdx === 0
          ? ['#4cd7f6', '#6366f1', '#c0c1ff']
          : ['#f43f5e', '#f59e0b', '#ffb2b7'];

      tower.stack.push({
        x: finalX,
        width: finalWidth,
        color: palette[tower.stack.length % palette.length],
      });
      tower.activeWidth = finalWidth;

      const minX = isTwoPlayer ? (pIdx === 0 ? 16 : 336) : 30;
      const maxX = isTwoPlayer ? (pIdx === 0 ? 304 : 624) : 610;
      tower.activeX = tower.stack.length % 2 === 0 ? minX : maxX - finalWidth;
      tower.dir = tower.stack.length % 2 === 0 ? 1 : -1;
      tower.speed = Math.min(8.5, (3.6 + tower.stack.length * 0.25) * speedMult);

      tower.score += isPerfect ? 60 : 35;
      setScores([st.towers[0].score, st.towers[1].score]);
      setFloors([st.towers[0].stack.length - 1, Math.max(0, st.towers[1].stack.length - 1)]);
      onScoreUpdate(Math.max(st.towers[0].score, st.towers[1].score));

      if (isPerfect) {
        soundFX.playWin();
      } else {
        soundFX.playScore();
      }
    },
    [game.soloChallenge.targetScore, isTwoPlayer, onGameEnd, onScoreUpdate, speedMult]
  );

  useEffect(() => {
    stateRef.current = {
      towers: makeInitialTowers(),
      ended: false,
    };
    setScores([0, 0]);
    setFloors([0, 0]);
    onScoreUpdate(0);
  }, [game.id, resetSignal, makeInitialTowers]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTwoPlayer) {
        if (e.key === 'w' || e.key === 'W' || e.code === 'Space') {
          e.preventDefault();
          dropForPlayer(0);
        } else if (e.key === 'ArrowUp' || e.key === 'Enter') {
          e.preventDefault();
          dropForPlayer(1);
        }
      } else if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        dropForPlayer(0);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dropForPlayer, isTwoPlayer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 640;
    const H = 360;
    let rafId = 0;

    const render = () => {
      const st = stateRef.current;
      const bounds: [number, number][] = isTwoPlayer
        ? [
            [16, 304],
            [336, 624],
          ]
        : [
            [16, W - 16],
            [0, 0],
          ];

      for (let i = 0; i < (isTwoPlayer ? 2 : 1); i++) {
        const t = st.towers[i];
        if (!st.ended && t.alive) {
          const [minX, maxX] = bounds[i];
          t.activeX += t.speed * t.dir;
          if (t.activeX <= minX) {
            t.activeX = minX;
            t.dir = 1;
          } else if (t.activeX + t.activeWidth >= maxX) {
            t.activeX = maxX - t.activeWidth;
            t.dir = -1;
          }
        }
      }

      ctx.fillStyle = '#060e20';
      ctx.fillRect(0, 0, W, H);

      if (isTwoPlayer) {
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        ctx.moveTo(W / 2, 16);
        ctx.lineTo(W / 2, H - 16);
        ctx.stroke();
      }

      const slabH = 22;
      for (let i = 0; i < (isTwoPlayer ? 2 : 1); i++) {
        const t = st.towers[i];
        const visibleStack = t.stack.slice(-11);
        visibleStack.forEach((slab, idx) => {
          const y = H - 30 - idx * (slabH + 3);
          ctx.fillStyle = slab.color;
          ctx.beginPath();
          ctx.roundRect(slab.x, y, slab.width, slabH, 4);
          ctx.fill();
        });

        if (!st.ended && t.alive) {
          const activeY = H - 30 - visibleStack.length * (slabH + 3);
          ctx.fillStyle = i === 0 ? '#ffffff' : '#fecdd3';
          ctx.beginPath();
          ctx.roundRect(t.activeX, activeY, t.activeWidth, slabH, 4);
          ctx.fill();
        }
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [isTwoPlayer, resetSignal]);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-[#060e20]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-[#131b2e] px-4 py-2.5 text-sm">
        {isTwoPlayer ? (
          <>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-[#4cd7f6]">P1 (W / Space):</span>
              <span className="font-mono text-white tabular-nums">{scores[0]} pts</span>
              <button
                type="button"
                onClick={() => dropForPlayer(0)}
                className="rounded bg-[#06b6d4] px-2.5 py-1 text-xs font-semibold text-[#001f26] cursor-pointer"
              >
                Drop P1
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-[#ffb2b7]">P2 (↑ / Enter):</span>
              <span className="font-mono text-white tabular-nums">{scores[1]} pts</span>
              <button
                type="button"
                onClick={() => dropForPlayer(1)}
                className="rounded bg-[#f43f5e] px-2.5 py-1 text-xs font-semibold text-white cursor-pointer"
              >
                Drop P2
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <span className="font-medium text-[#c7c4d7]">
                Score: <strong className="font-mono text-[#4cd7f6] tabular-nums">{scores[0]}</strong>
              </span>
              <span className="font-medium text-[#c7c4d7]">
                Floors: <strong className="font-mono text-[#f59e0b] tabular-nums">{floors[0]}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => dropForPlayer(0)}
              className="rounded-md bg-[#6366f1] px-3 py-1 font-display text-xs font-semibold text-white hover:bg-[#5558e8] cursor-pointer"
            >
              Drop Slab (Space)
            </button>
          </>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        onClick={() => {
          if (!isTwoPlayer) dropForPlayer(0);
        }}
        className="block w-full aspect-[16/9] cursor-pointer touch-manipulation"
      />
    </div>
  );
};
