import React, { useEffect, useState } from 'react';
import { GameItem } from '../../types';
import { soundFX } from '../../utils/sound';

interface HexaPulseGameProps {
  game: GameItem;
  onScoreUpdate: (score: number) => void;
  onGameEnd: (finalScore: number, won: boolean) => void;
  resetSignal: number;
}

function createSolvableBoard(size: number, scrambleSteps: number): boolean[][] {
  const grid = Array.from({ length: size }, () => Array(size).fill(true));
  const toggleAt = (r: number, c: number) => {
    const dirs = [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    dirs.forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        grid[nr][nc] = !grid[nr][nc];
      }
    });
  };
  for (let i = 0; i < scrambleSteps; i++) {
    toggleAt(Math.floor(Math.random() * size), Math.floor(Math.random() * size));
  }
  // Ensure not already solved
  if (grid.every((row) => row.every(Boolean))) {
    toggleAt(Math.floor(size / 2), Math.floor(size / 2));
  }
  return grid;
}

export const HexaPulseGame: React.FC<HexaPulseGameProps> = ({
  game,
  onScoreUpdate,
  onGameEnd,
  resetSignal,
}) => {
  const size = game.variantConfig?.gridSize ?? 5;
  const [round, setRound] = useState(1);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [grid, setGrid] = useState<boolean[][]>(() => createSolvableBoard(size, 6));

  useEffect(() => {
    setRound(1);
    setMoves(0);
    setScore(0);
    setGrid(createSolvableBoard(size, 6));
    onScoreUpdate(0);
  }, [game.id, resetSignal, size]);

  const handleCellClick = (r: number, c: number) => {
    soundFX.playClick();
    const next = grid.map((row) => [...row]);
    const dirs = [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    dirs.forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        next[nr][nc] = !next[nr][nc];
      }
    });
    const nextMoves = moves + 1;
    setGrid(next);
    setMoves(nextMoves);

    if (next.every((row) => row.every(Boolean))) {
      const roundScore = Math.max(150, 350 - nextMoves * 10);
      const totalScore = score + roundScore;
      setScore(totalScore);
      onScoreUpdate(totalScore);
      soundFX.playWin();

      if (round >= 2) {
        onGameEnd(totalScore, true);
      } else {
        setTimeout(() => {
          setRound((prev) => prev + 1);
          setMoves(0);
          setGrid(createSolvableBoard(size, 8));
        }, 450);
      }
    }
  };

  const litCount = grid.flat().filter(Boolean).length;
  const totalCells = size * size;

  return (
    <div className="flex flex-col items-center rounded-xl border border-white/10 bg-[#060e20] p-6">
      <div className="mb-5 flex w-full max-w-md items-center justify-between text-sm">
        <span className="text-[#c7c4d7]">
          Board <strong className="font-mono text-[#dae2fd] tabular-nums">{round}/2</strong>
        </span>
        <span className="text-[#c7c4d7]">
          Moves: <strong className="font-mono text-[#4cd7f6] tabular-nums">{moves}</strong>
        </span>
        <span className="text-[#c7c4d7]">
          Lit: <strong className="font-mono text-[#f59e0b] tabular-nums">{litCount}/{totalCells}</strong>
        </span>
        <span className="text-[#c7c4d7]">
          Score: <strong className="font-mono text-[#c0c1ff] tabular-nums">{score}</strong>
        </span>
      </div>

      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {grid.map((row, r) =>
          row.map((lit, c) => (
            <button
              key={`${r}-${c}`}
              type="button"
              onClick={() => handleCellClick(r, c)}
              aria-label={`Row ${r + 1} Column ${c + 1} ${lit ? 'Active' : 'Inactive'}`}
              className={`h-14 w-14 sm:h-16 sm:w-16 rounded-xl border transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6] ${
                lit
                  ? 'border-[#4cd7f6] bg-[#06b6d4]/25 shadow-[0_0_16px_rgba(76,215,246,0.28)]'
                  : 'border-white/10 bg-[#171f33] hover:border-white/25'
              }`}
            >
              <span
                className={`block mx-auto h-3 w-3 rounded-sm transition-transform ${
                  lit ? 'bg-[#4cd7f6] scale-110' : 'bg-[#464554]'
                }`}
              />
            </button>
          ))
        )}
      </div>

      <p className="mt-5 text-xs text-[#908fa0]">
        Turn every tile cyan. Each click flips the tile and its 4 neighbors.
      </p>
    </div>
  );
};
