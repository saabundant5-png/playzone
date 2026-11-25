import React, { useCallback, useEffect, useState } from 'react';
import type { PlayMode } from '../../multiplayerTypes';
import { GameItem } from '../../types';
import { soundFX } from '../../utils/sound';

interface VoidChessGameProps {
  game: GameItem;
  playMode?: PlayMode;
  onScoreUpdate: (score: number) => void;
  onGameEnd: (finalScore: number, won: boolean, summaryText?: string) => void;
  resetSignal: number;
}

type PieceColor = 'w' | 'b';
type PieceType = 'K' | 'Q' | 'R' | 'N' | 'P';

interface Piece {
  color: PieceColor;
  type: PieceType;
}

type Board = (Piece | null)[][];

const PIECE_GLYPHS: Record<PieceColor, Record<PieceType, string>> = {
  w: { K: '♔', Q: '♕', R: '♖', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', N: '♞', P: '♟' },
};

const PIECE_VALUES: Record<PieceType, number> = {
  P: 40,
  N: 90,
  R: 130,
  Q: 220,
  K: 500,
};

function createInitialBoard(): Board {
  const backRow: PieceType[] = ['R', 'N', 'Q', 'K', 'N', 'R'];
  const board: Board = Array.from({ length: 6 }, () => Array(6).fill(null));
  for (let c = 0; c < 6; c++) {
    board[0][c] = { color: 'b', type: backRow[c] };
    board[1][c] = { color: 'b', type: 'P' };
    board[4][c] = { color: 'w', type: 'P' };
    board[5][c] = { color: 'w', type: backRow[c] };
  }
  return board;
}

function getPseudoLegalMoves(board: Board, r: number, c: number): [number, number][] {
  const piece = board[r][c];
  if (!piece) return [];
  const moves: [number, number][] = [];
  const inBounds = (nr: number, nc: number) => nr >= 0 && nr < 6 && nc >= 0 && nc < 6;

  if (piece.type === 'P') {
    const dir = piece.color === 'w' ? -1 : 1;
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      moves.push([r + dir, c]);
    }
    [-1, 1].forEach((dc) => {
      const nr = r + dir;
      const nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc] && board[nr][nc]!.color !== piece.color) {
        moves.push([nr, nc]);
      }
    });
  } else if (piece.type === 'N') {
    const jumps = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    jumps.forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc]?.color !== piece.color) {
        moves.push([nr, nc]);
      }
    });
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
    dirs.forEach(([dr, dc]) => {
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
    });
  }
  return moves;
}

export const VoidChessGame: React.FC<VoidChessGameProps> = ({
  game,
  playMode = '1p',
  onScoreUpdate,
  onGameEnd,
  resetSignal,
}) => {
  const isTwoPlayer = playMode === '2p-local';
  const [board, setBoard] = useState<Board>(() => createInitialBoard());
  const [turn, setTurn] = useState<PieceColor>('w');
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [p1Cursor, setP1Cursor] = useState<[number, number]>([4, 2]);
  const [p2Cursor, setP2Cursor] = useState<[number, number]>([1, 2]);
  const [statusNote, setStatusNote] = useState('White to move. Select a piece.');

  useEffect(() => {
    setBoard(createInitialBoard());
    setTurn('w');
    setSelected(null);
    setScores([0, 0]);
    setP1Cursor([4, 2]);
    setP2Cursor([1, 2]);
    setStatusNote('White to move. Select a piece.');
    onScoreUpdate(0);
  }, [game.id, isTwoPlayer, resetSignal]);

  const legalMoves = selected ? getPseudoLegalMoves(board, selected[0], selected[1]) : [];

  const executeBotTurn = useCallback(
    (nextBoard: Board, currentScore: number) => {
      const candidates: { from: [number, number]; to: [number, number]; value: number }[] = [];
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          if (nextBoard[r][c]?.color === 'b') {
            const moves = getPseudoLegalMoves(nextBoard, r, c);
            moves.forEach(([tr, tc]) => {
              const target = nextBoard[tr][tc];
              const val = target ? PIECE_VALUES[target.type] : Math.random() * 5;
              candidates.push({ from: [r, c], to: [tr, tc], value: val });
            });
          }
        }
      }

      if (candidates.length === 0) {
        soundFX.playWin();
        onGameEnd(currentScore + 250, true);
        return;
      }

      candidates.sort((a, b) => b.value - a.value);
      const chosen = candidates[0];
      const botBoard = nextBoard.map((row) => [...row]);
      const moving = botBoard[chosen.from[0]][chosen.from[1]]!;
      const captured = botBoard[chosen.to[0]][chosen.to[1]];

      if (moving.type === 'P' && chosen.to[0] === 5) {
        botBoard[chosen.to[0]][chosen.to[1]] = { color: 'b', type: 'Q' };
      } else {
        botBoard[chosen.to[0]][chosen.to[1]] = moving;
      }
      botBoard[chosen.from[0]][chosen.from[1]] = null;

      setBoard(botBoard);
      soundFX.playClick();

      if (captured?.type === 'K') {
        soundFX.playHit();
        setStatusNote('Void Bot captured your King!');
        onGameEnd(currentScore, false);
        return;
      }

      const colNames = ['a', 'b', 'c', 'd', 'e', 'f'];
      setStatusNote(
        `Void Bot moved ${moving.type} to ${colNames[chosen.to[1]]}${6 - chosen.to[0]}. Your turn.`
      );
      setTurn('w');
    },
    [onGameEnd]
  );

  const handleSquareClick = useCallback(
    (r: number, c: number) => {
      if (!isTwoPlayer && turn !== 'w') return;

      if (selected) {
        const isLegal = legalMoves.some(([mr, mc]) => mr === r && mc === c);
        if (isLegal) {
          const nextBoard = board.map((row) => [...row]);
          const moving = nextBoard[selected[0]][selected[1]]!;
          const captured = nextBoard[r][c];

          if (moving.type === 'P' && ((moving.color === 'w' && r === 0) || (moving.color === 'b' && r === 5))) {
            nextBoard[r][c] = { color: moving.color, type: 'Q' };
          } else {
            nextBoard[r][c] = moving;
          }
          nextBoard[selected[0]][selected[1]] = null;

          const activeSlot = turn === 'w' ? 0 : 1;
          const nextScores: [number, number] = [...scores] as [number, number];
          nextScores[activeSlot] += 10 + (captured ? PIECE_VALUES[captured.type] : 0);

          if (captured) {
            soundFX.playScore();
          } else {
            soundFX.playClick();
          }

          setBoard(nextBoard);
          setSelected(null);
          setScores(nextScores);
          onScoreUpdate(Math.max(nextScores[0], nextScores[1]));

          if (captured?.type === 'K') {
            soundFX.playWin();
            const winText = isTwoPlayer
              ? `${turn === 'w' ? 'P1 White (WASD)' : 'P2 Black (Arrows)'} captured the King!`
              : undefined;
            onGameEnd(nextScores[activeSlot], true, winText);
            return;
          }

          if (isTwoPlayer) {
            const nextTurn: PieceColor = turn === 'w' ? 'b' : 'w';
            setTurn(nextTurn);
            setStatusNote(
              nextTurn === 'w'
                ? 'P1 White (WASD + Space) to move.'
                : 'P2 Black (Arrows + Enter) to move.'
            );
          } else {
            setTurn('b');
            setStatusNote('Void Bot is calculating...');
            setTimeout(() => executeBotTurn(nextBoard, nextScores[0]), 550);
          }
          return;
        }
      }

      if (board[r][c]?.color === turn) {
        setSelected([r, c]);
        soundFX.playClick();
      } else {
        setSelected(null);
      }
    },
    [board, executeBotTurn, isTwoPlayer, legalMoves, onGameEnd, onScoreUpdate, scores, selected, turn]
  );

  // Local 2P keyboard cursors (WASD + Space for P1 White, Arrow Keys + Enter for P2 Black)
  useEffect(() => {
    if (!isTwoPlayer) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'w' || e.key === 'W') {
        setP1Cursor(([r, c]) => [Math.max(0, r - 1), c]);
      } else if (e.key === 's' || e.key === 'S') {
        setP1Cursor(([r, c]) => [Math.min(5, r + 1), c]);
      } else if (e.key === 'a' || e.key === 'A') {
        setP1Cursor(([r, c]) => [r, Math.max(0, c - 1)]);
      } else if (e.key === 'd' || e.key === 'D') {
        setP1Cursor(([r, c]) => [r, Math.min(5, c + 1)]);
      } else if (e.code === 'Space' && turn === 'w') {
        handleSquareClick(p1Cursor[0], p1Cursor[1]);
      } else if (e.key === 'ArrowUp') {
        setP2Cursor(([r, c]) => [Math.max(0, r - 1), c]);
      } else if (e.key === 'ArrowDown') {
        setP2Cursor(([r, c]) => [Math.min(5, r + 1), c]);
      } else if (e.key === 'ArrowLeft') {
        setP2Cursor(([r, c]) => [r, Math.max(0, c - 1)]);
      } else if (e.key === 'ArrowRight') {
        setP2Cursor(([r, c]) => [r, Math.min(5, c + 1)]);
      } else if (e.key === 'Enter' && turn === 'b') {
        handleSquareClick(p2Cursor[0], p2Cursor[1]);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSquareClick, isTwoPlayer, p1Cursor, p2Cursor, turn]);

  return (
    <div className="flex flex-col items-center rounded-xl border border-white/10 bg-[#060e20] p-5">
      <div className="mb-4 flex w-full max-w-md items-center justify-between text-sm">
        <span className="text-[#c7c4d7]">
          Turn:{' '}
          <strong className={turn === 'w' ? 'text-[#4cd7f6]' : 'text-[#ffb2b7]'}>
            {isTwoPlayer
              ? turn === 'w'
                ? 'P1 White (WASD)'
                : 'P2 Black (Arrows)'
              : turn === 'w'
              ? 'Your Move (White)'
              : 'Void Bot (Black)'}
          </strong>
        </span>
        <span className="text-[#c7c4d7]">
          {isTwoPlayer ? (
            <span className="font-mono tabular-nums">
              <strong className="text-[#4cd7f6]">{scores[0]}</strong> -{' '}
              <strong className="text-[#ffb2b7]">{scores[1]}</strong>
            </span>
          ) : (
            <>
              Score: <strong className="font-mono text-[#f59e0b] tabular-nums">{scores[0]}</strong>
            </>
          )}
        </span>
      </div>

      <div className="grid grid-cols-6 overflow-hidden rounded-xl border border-white/15">
        {board.map((row, r) =>
          row.map((piece, c) => {
            const isDark = (r + c) % 2 === 1;
            const isSelected = selected?.[0] === r && selected?.[1] === c;
            const isLegalTarget = legalMoves.some(([mr, mc]) => mr === r && mc === c);
            const isP1Cursor = isTwoPlayer && p1Cursor[0] === r && p1Cursor[1] === c;
            const isP2Cursor = isTwoPlayer && p2Cursor[0] === r && p2Cursor[1] === c;

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => handleSquareClick(r, c)}
                aria-label={`Square ${r}-${c}`}
                className={`relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center text-2xl sm:text-3xl transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#6366f1]/60'
                    : isDark
                    ? 'bg-[#131b2e]'
                    : 'bg-[#222a3d]'
                } ${isP1Cursor ? 'ring-2 ring-inset ring-[#4cd7f6]' : ''} ${
                  isP2Cursor ? 'ring-2 ring-inset ring-[#f43f5e]' : ''
                } hover:brightness-115`}
              >
                {isLegalTarget && (
                  <span
                    className={`absolute h-3.5 w-3.5 rounded-full ${
                      piece ? 'ring-2 ring-[#f43f5e] bg-transparent h-10 w-10' : 'bg-[#4cd7f6]/75'
                    }`}
                  />
                )}
                {piece && (
                  <span
                    className={`relative z-10 select-none ${
                      piece.color === 'w' ? 'text-[#f8fafc]' : 'text-[#ffb2b7]'
                    }`}
                  >
                    {PIECE_GLYPHS[piece.color][piece.type]}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      <p className="mt-4 text-xs text-[#c7c4d7] text-center">
        {isTwoPlayer
          ? `${statusNote} (Or click squares directly.)`
          : statusNote}
      </p>
    </div>
  );
};
