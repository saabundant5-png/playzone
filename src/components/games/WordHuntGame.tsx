import React, { useEffect, useMemo, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { GameItem } from '../../types';
import { soundFX } from '../../utils/sound';

interface WordHuntGameProps {
  game: GameItem;
  onScoreUpdate: (score: number) => void;
  onGameEnd: (finalScore: number, won: boolean) => void;
  resetSignal: number;
}

interface PlacedWord {
  word: string;
  cells: [number, number][];
  orientation: 'Horizontal' | 'Vertical' | 'Diagonal';
}

interface WordSet {
  grid: string[][];
  words: PlacedWord[];
}

const WORD_SETS: WordSet[] = [
  {
    grid: [
      ['A', 'R', 'C', 'A', 'D', 'E', 'Q', 'M'],
      ['P', 'L', 'A', 'Y', 'Z', 'O', 'N', 'E'],
      ['N', 'X', 'T', 'B', 'K', 'R', 'E', 'T'],
      ['E', 'S', 'P', 'R', 'I', 'T', 'E', 'S'],
      ['O', 'P', 'I', 'X', 'E', 'L', 'L', 'K'],
      ['N', 'V', 'L', 'B', 'O', 'N', 'U', 'S'],
      ['Q', 'U', 'E', 'S', 'T', 'J', 'W', 'C'],
      ['Z', 'H', 'D', 'C', 'O', 'M', 'B', 'O'],
    ],
    words: [
      { word: 'ARCADE', orientation: 'Horizontal', cells: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5]] },
      { word: 'ZONE', orientation: 'Horizontal', cells: [[1,4],[1,5],[1,6],[1,7]] },
      { word: 'SPRITE', orientation: 'Horizontal', cells: [[3,1],[3,2],[3,3],[3,4],[3,5],[3,6]] },
      { word: 'PIXEL', orientation: 'Horizontal', cells: [[4,1],[4,2],[4,3],[4,4],[4,5]] },
      { word: 'QUEST', orientation: 'Horizontal', cells: [[6,0],[6,1],[6,2],[6,3],[6,4]] },
      { word: 'COMBO', orientation: 'Horizontal', cells: [[7,3],[7,4],[7,5],[7,6],[7,7]] },
    ],
  },
  {
    grid: [
      ['N', 'E', 'B', 'U', 'L', 'A', 'Q', 'Z'],
      ['O', 'R', 'B', 'I', 'T', 'K', 'P', 'U'],
      ['V', 'A', 'S', 'T', 'R', 'O', 'L', 'N'],
      ['A', 'S', 'T', 'A', 'R', 'M', 'S', 'A'],
      ['P', 'U', 'L', 'S', 'A', 'R', 'E', 'R'],
      ['C', 'O', 'M', 'E', 'T', 'V', 'T', 'X'],
      ['Q', 'U', 'A', 'S', 'A', 'R', 'L', 'B'],
      ['W', 'M', 'O', 'O', 'N', 'D', 'A', 'Y'],
    ],
    words: [
      { word: 'NEBULA', orientation: 'Horizontal', cells: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5]] },
      { word: 'ORBIT', orientation: 'Horizontal', cells: [[1,0],[1,1],[1,2],[1,3],[1,4]] },
      { word: 'PULSAR', orientation: 'Horizontal', cells: [[4,0],[4,1],[4,2],[4,3],[4,4],[4,5]] },
      { word: 'COMET', orientation: 'Horizontal', cells: [[5,0],[5,1],[5,2],[5,3],[5,4]] },
      { word: 'QUASAR', orientation: 'Horizontal', cells: [[6,0],[6,1],[6,2],[6,3],[6,4],[6,5]] },
      { word: 'MOON', orientation: 'Horizontal', cells: [[7,1],[7,2],[7,3],[7,4]] },
    ],
  },
];

export const WordHuntGame: React.FC<WordHuntGameProps> = ({
  game,
  onScoreUpdate,
  onGameEnd,
  resetSignal,
}) => {
  const setIndex = game.variantConfig?.wordSetIndex ?? 0;
  const wordSet = WORD_SETS[setIndex % WORD_SETS.length];

  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [startCell, setStartCell] = useState<[number, number] | null>(null);
  const [hintTier, setHintTier] = useState<number>(0);
  const [hintText, setHintText] = useState<string>('Select the first and last letter of a hidden word.');

  useEffect(() => {
    setFoundWords([]);
    setStartCell(null);
    setHintTier(0);
    setHintText('Select the first and last letter of a hidden word.');
    onScoreUpdate(0);
  }, [game.id, resetSignal]);

  const foundCellSet = useMemo(() => {
    const s = new Set<string>();
    wordSet.words.forEach((w) => {
      if (foundWords.includes(w.word)) {
        w.cells.forEach(([r, c]) => s.add(`${r}-${c}`));
      }
    });
    return s;
  }, [foundWords, wordSet]);

  const nextRemainingWord = wordSet.words.find((w) => !foundWords.includes(w.word));

  const highlightedFirstCell = useMemo(() => {
    if (hintTier >= 4 && nextRemainingWord) {
      const [r, c] = nextRemainingWord.cells[0];
      return `${r}-${c}`;
    }
    return null;
  }, [hintTier, nextRemainingWord]);

  const handleCellClick = (r: number, c: number) => {
    if (!startCell) {
      setStartCell([r, c]);
      soundFX.playClick();
      return;
    }

    const [sr, sc] = startCell;
    setStartCell(null);

    const matched = wordSet.words.find((w) => {
      if (foundWords.includes(w.word)) return false;
      const first = w.cells[0];
      const last = w.cells[w.cells.length - 1];
      return (
        (first[0] === sr && first[1] === sc && last[0] === r && last[1] === c) ||
        (last[0] === sr && last[1] === sc && first[0] === r && first[1] === c)
      );
    });

    if (matched) {
      const nextFound = [...foundWords, matched.word];
      setFoundWords(nextFound);
      setHintTier(0);
      setHintText(`Found "${matched.word}"!`);
      const score = nextFound.length * 100;
      onScoreUpdate(score);
      soundFX.playScore();

      if (nextFound.length === wordSet.words.length) {
        soundFX.playWin();
        setTimeout(() => onGameEnd(score, true), 450);
      }
    } else {
      soundFX.playHit();
      setHintText('Not a listed word — try tapping the first and last letter again.');
    }
  };

  const handleHint = () => {
    if (!nextRemainingWord) return;
    soundFX.playClick();
    const nextTier = Math.min(4, hintTier + 1);
    setHintTier(nextTier);

    if (nextTier === 1) {
      setHintText(`Tier 1 Clue: Look for a ${nextRemainingWord.word.length}-letter word starting with "${nextRemainingWord.word[0]}".`);
    } else if (nextTier === 2) {
      setHintText(`Tier 2 Clue: "${nextRemainingWord.word}" runs ${nextRemainingWord.orientation}.`);
    } else if (nextTier === 3) {
      setHintText(
        `Tier 3 Clue: Starts in Row ${nextRemainingWord.cells[0][0] + 1}, Column ${nextRemainingWord.cells[0][1] + 1}.`
      );
    } else {
      setHintText(`Tier 4 Clue: First letter of "${nextRemainingWord.word}" is highlighted in amber.`);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#060e20] p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[#c7c4d7]">
          Found:{' '}
          <strong className="font-mono text-[#4cd7f6] tabular-nums">
            {foundWords.length}/{wordSet.words.length}
          </strong>{' '}
          <span className="mx-2 text-[#464554]">|</span>
          Score:{' '}
          <strong className="font-mono text-[#f59e0b] tabular-nums">
            {foundWords.length * 100}
          </strong>
        </div>

        <button
          type="button"
          onClick={handleHint}
          className="inline-flex items-center gap-2 rounded-lg border border-[#4cd7f6]/40 bg-[#131b2e] px-3 py-1.5 font-display text-xs font-semibold text-[#4cd7f6] hover:bg-[#4cd7f6]/15 cursor-pointer"
        >
          <Lightbulb className="h-3.5 w-3.5" />
          <span>Hint ({hintTier}/4)</span>
        </button>
      </div>

      <p className="mb-4 rounded-lg bg-[#131b2e] px-3.5 py-2 text-sm text-[#dae2fd]">
        {hintText}
      </p>

      <div className="flex flex-col lg:flex-row items-start gap-6">
        <div className="grid grid-cols-8 gap-1.5 mx-auto">
          {wordSet.grid.map((row, r) =>
            row.map((letter, c) => {
              const key = `${r}-${c}`;
              const isFound = foundCellSet.has(key);
              const isStart = startCell?.[0] === r && startCell?.[1] === c;
              const isHinted = highlightedFirstCell === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleCellClick(r, c)}
                  className={`flex h-11 w-11 items-center justify-center rounded-lg border font-display text-lg font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6] ${
                    isStart
                      ? 'border-[#4cd7f6] bg-[#06b6d4]/30 text-white'
                      : isFound
                      ? 'border-[#6366f1]/60 bg-[#6366f1]/30 text-[#e1e0ff]'
                      : isHinted
                      ? 'border-[#f59e0b] bg-[#f59e0b]/25 text-[#fde68a]'
                      : 'border-white/10 bg-[#171f33] text-[#dae2fd] hover:border-white/30'
                  }`}
                >
                  {letter}
                </button>
              );
            })
          )}
        </div>

        <div className="w-full lg:w-48 rounded-xl border border-white/[0.08] bg-[#131b2e] p-4">
          <h4 className="font-display text-sm font-semibold text-[#dae2fd] mb-3">
            Word List
          </h4>
          <ul className="grid grid-cols-2 lg:grid-cols-1 gap-2">
            {wordSet.words.map((w) => {
              const done = foundWords.includes(w.word);
              return (
                <li
                  key={w.word}
                  className={`font-mono text-sm font-medium ${
                    done ? 'line-through text-[#4cd7f6]' : 'text-[#c7c4d7]'
                  }`}
                >
                  {w.word}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};
