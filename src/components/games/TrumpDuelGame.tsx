import React, { useCallback, useEffect, useState } from 'react';
import type { PlayMode } from '../../multiplayerTypes';
import { GameItem } from '../../types';
import { soundFX } from '../../utils/sound';

interface TrumpDuelGameProps {
  game: GameItem;
  playMode?: PlayMode;
  onScoreUpdate: (score: number) => void;
  onGameEnd: (finalScore: number, won: boolean, summaryText?: string) => void;
  resetSignal: number;
}

type Suit = '♠' | '♥' | '♦' | '♣';

interface Card {
  id: string;
  suit: Suit;
  rank: number;
  label: string;
}

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: { rank: number; label: string }[] = [
  { rank: 9, label: '9' },
  { rank: 10, label: '10' },
  { rank: 11, label: 'J' },
  { rank: 12, label: 'Q' },
  { rank: 13, label: 'K' },
  { rank: 14, label: 'A' },
];

function dealMatch(): { playerHand: Card[]; botHand: Card[]; trump: Suit } {
  const deck: Card[] = [];
  SUITS.forEach((suit) => {
    RANKS.forEach(({ rank, label }) => {
      deck.push({ id: `${suit}-${label}`, suit, rank, label });
    });
  });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const trump = SUITS[Math.floor(Math.random() * SUITS.length)];
  return {
    playerHand: deck.slice(0, 6),
    botHand: deck.slice(6, 12),
    trump,
  };
}

export const TrumpDuelGame: React.FC<TrumpDuelGameProps> = ({
  game,
  playMode = '1p',
  onScoreUpdate,
  onGameEnd,
  resetSignal,
}) => {
  const isTwoPlayer = playMode === '2p-local';
  const [match, setMatch] = useState(() => dealMatch());
  const [p1Hand, setP1Hand] = useState<Card[]>(match.playerHand);
  const [p2Hand, setP2Hand] = useState<Card[]>(match.botHand);
  const [trump, setTrump] = useState<Suit>(match.trump);
  const [p1Card, setP1Card] = useState<Card | null>(null);
  const [p2Card, setP2Card] = useState<Card | null>(null);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [tricks, setTricks] = useState<[number, number]>([0, 0]);
  const [turnSlot, setTurnSlot] = useState<0 | 1>(0);
  const [leadSlot, setLeadSlot] = useState<0 | 1>(0);
  const [cursorIdx, setCursorIdx] = useState(0);
  const [message, setMessage] = useState('Player 1 leads Trick 1.');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fresh = dealMatch();
    setMatch(fresh);
    setP1Hand(fresh.playerHand);
    setP2Hand(fresh.botHand);
    setTrump(fresh.trump);
    setP1Card(null);
    setP2Card(null);
    setScores([0, 0]);
    setTricks([0, 0]);
    setTurnSlot(0);
    setLeadSlot(0);
    setCursorIdx(0);
    setMessage(isTwoPlayer ? 'P1 (A/D + W) leads Trick 1.' : 'Lead any card to start Trick 1.');
    setBusy(false);
    onScoreUpdate(0);
  }, [game.id, isTwoPlayer, resetSignal]);

  const cardPower = useCallback(
    (card: Card, leadSuit: Suit): number => {
      if (card.suit === trump) return 100 + card.rank;
      if (card.suit === leadSuit) return 50 + card.rank;
      return card.rank;
    },
    [trump]
  );

  const handlePlayLocal2PCard = useCallback(
    (slot: 0 | 1, card: Card) => {
      if (busy || turnSlot !== slot) return;

      const currentHand = slot === 0 ? p1Hand : p2Hand;
      const leadCard = leadSlot === 0 ? p1Card : p2Card;
      if (leadCard && slot !== leadSlot) {
        const hasSuit = currentHand.some((c) => c.suit === leadCard.suit);
        if (hasSuit && card.suit !== leadCard.suit) {
          soundFX.playHit();
          setMessage(`Must follow suit (${leadCard.suit})!`);
          return;
        }
      }

      soundFX.playClick();
      const nextHand = currentHand.filter((c) => c.id !== card.id);
      if (slot === 0) {
        setP1Hand(nextHand);
        setP1Card(card);
      } else {
        setP2Hand(nextHand);
        setP2Card(card);
      }
      setCursorIdx(0);

      const otherCard = slot === 0 ? p2Card : p1Card;
      if (!otherCard) {
        const otherSlot: 0 | 1 = slot === 0 ? 1 : 0;
        setTurnSlot(otherSlot);
        setMessage(
          otherSlot === 0
            ? 'P1 (A/D + W or click) to respond.'
            : 'P2 (←/→ + ↑ or click) to respond.'
        );
        return;
      }

      // Resolve trick
      setBusy(true);
      const firstCard = leadSlot === 0 ? (slot === 0 ? card : otherCard) : slot === 1 ? card : otherCard;
      const secondCard = leadSlot === 0 ? (slot === 1 ? card : otherCard) : slot === 0 ? card : otherCard;
      const trickWinner: 0 | 1 =
        cardPower(firstCard, firstCard.suit) >= cardPower(secondCard, firstCard.suit)
          ? leadSlot
          : leadSlot === 0
          ? 1
          : 0;

      const nextScores: [number, number] = [...scores] as [number, number];
      nextScores[trickWinner] += 100;
      nextScores[trickWinner === 0 ? 1 : 0] += 20;
      const nextTricks: [number, number] = [...tricks] as [number, number];
      nextTricks[trickWinner] += 1;

      setScores(nextScores);
      setTricks(nextTricks);
      onScoreUpdate(Math.max(nextScores[0], nextScores[1]));
      soundFX.playScore();
      setMessage(`P${trickWinner + 1} won the trick!`);

      const remaining = (slot === 0 ? nextHand.length : p1Hand.length) + (slot === 1 ? nextHand.length : p2Hand.length);
      if (remaining === 0) {
        setTimeout(() => {
          soundFX.playWin();
          const summary =
            nextTricks[0] === nextTricks[1]
              ? `Draw! ${nextTricks[0]} - ${nextTricks[1]} tricks`
              : nextTricks[0] > nextTricks[1]
              ? `P1 (WASD) Wins! ${nextTricks[0]} - ${nextTricks[1]} tricks`
              : `P2 (Arrows) Wins! ${nextTricks[1]} - ${nextTricks[0]} tricks`;
          onGameEnd(Math.max(nextScores[0], nextScores[1]), true, summary);
        }, 700);
      } else {
        setTimeout(() => {
          setP1Card(null);
          setP2Card(null);
          setLeadSlot(trickWinner);
          setTurnSlot(trickWinner);
          setCursorIdx(0);
          setMessage(`P${trickWinner + 1} leads next trick.`);
          setBusy(false);
        }, 850);
      }
    },
    [busy, cardPower, leadSlot, onGameEnd, onScoreUpdate, p1Card, p1Hand, p2Card, p2Hand, scores, tricks, turnSlot]
  );

  const handlePlay1PCard = (card: Card) => {
    if (busy) return;
    setBusy(true);
    soundFX.playClick();

    const nextPlayerHand = p1Hand.filter((c) => c.id !== card.id);
    setP1Hand(nextPlayerHand);
    setP1Card(card);
    setP2Card(null);
    setMessage('Dealer is responding...');

    setTimeout(() => {
      const sameSuit = p2Hand.filter((c) => c.suit === card.suit);
      const pool = sameSuit.length > 0 ? sameSuit : p2Hand;
      pool.sort((a, b) => cardPower(b, card.suit) - cardPower(a, card.suit));
      const best = pool[0];
      const chosen =
        cardPower(best, card.suit) > cardPower(card, card.suit)
          ? best
          : pool[pool.length - 1];

      const nextBotHand = p2Hand.filter((c) => c.id !== chosen.id);
      setP2Hand(nextBotHand);
      setP2Card(chosen);

      const playerWonTrick = cardPower(card, card.suit) > cardPower(chosen, card.suit);
      const nextScore = scores[0] + (playerWonTrick ? 100 : 20);
      const nextP1Tricks = tricks[0] + (playerWonTrick ? 1 : 0);
      const nextP2Tricks = tricks[1] + (playerWonTrick ? 0 : 1);

      setScores([nextScore, scores[1]]);
      setTricks([nextP1Tricks, nextP2Tricks]);
      onScoreUpdate(nextScore);

      if (playerWonTrick) {
        soundFX.playScore();
        setMessage(`You won the trick (${card.label}${card.suit} beats ${chosen.label}${chosen.suit}).`);
      } else {
        soundFX.playHit();
        setMessage(`Dealer took the trick (${chosen.label}${chosen.suit} beats ${card.label}${card.suit}).`);
      }

      if (nextPlayerHand.length === 0) {
        setTimeout(() => {
          const wonMatch = nextP1Tricks >= nextP2Tricks;
          if (wonMatch) soundFX.playWin();
          onGameEnd(nextScore, wonMatch);
        }, 700);
      } else {
        setTimeout(() => {
          setP1Card(null);
          setP2Card(null);
          setBusy(false);
        }, 750);
      }
    }, 550);
  };

  // Local 2P keyboard card selector: P1 (A/D + W/Space), P2 (ArrowLeft/ArrowRight + ArrowUp/Enter)
  useEffect(() => {
    if (!isTwoPlayer) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }
      const activeHand = turnSlot === 0 ? p1Hand : p2Hand;
      if (activeHand.length === 0 || busy) return;

      if (turnSlot === 0) {
        if (e.key === 'a' || e.key === 'A') {
          setCursorIdx((i) => Math.max(0, i - 1));
        } else if (e.key === 'd' || e.key === 'D') {
          setCursorIdx((i) => Math.min(activeHand.length - 1, i + 1));
        } else if (e.key === 'w' || e.key === 'W' || e.code === 'Space') {
          const chosen = activeHand[Math.min(cursorIdx, activeHand.length - 1)];
          if (chosen) handlePlayLocal2PCard(0, chosen);
        }
      } else {
        if (e.key === 'ArrowLeft') {
          setCursorIdx((i) => Math.max(0, i - 1));
        } else if (e.key === 'ArrowRight') {
          setCursorIdx((i) => Math.min(activeHand.length - 1, i + 1));
        } else if (e.key === 'ArrowUp' || e.key === 'Enter') {
          const chosen = activeHand[Math.min(cursorIdx, activeHand.length - 1)];
          if (chosen) handlePlayLocal2PCard(1, chosen);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, cursorIdx, handlePlayLocal2PCard, isTwoPlayer, p1Hand, p2Hand, turnSlot]);

  const isRed = (s: Suit) => s === '♥' || s === '♦';

  return (
    <div className="rounded-xl border border-white/10 bg-[#0f5132]/35 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#060e20]/80 px-4 py-2.5 text-sm">
        <div className="flex items-center gap-4">
          <span className="text-[#c7c4d7]">
            Trump Suit:{' '}
            <strong className={`text-lg ${isRed(trump) ? 'text-[#f43f5e]' : 'text-[#4cd7f6]'}`}>
              {trump}
            </strong>
          </span>
          <span className="text-[#c7c4d7]">
            Tricks:{' '}
            <strong className="font-mono text-[#dae2fd] tabular-nums">
              {isTwoPlayer ? `P1 ${tricks[0]} - ${tricks[1]} P2` : `You ${tricks[0]} - ${tricks[1]} Bot`}
            </strong>
          </span>
        </div>
        <span className="text-[#c7c4d7]">
          {isTwoPlayer ? (
            <span className="font-mono tabular-nums">
              <strong className="text-[#4cd7f6]">{scores[0]}</strong> vs{' '}
              <strong className="text-[#ffb2b7]">{scores[1]}</strong>
            </span>
          ) : (
            <>
              Score: <strong className="font-mono text-[#f59e0b] tabular-nums">{scores[0]}</strong>
            </>
          )}
        </span>
      </div>

      {/* Top Hand: Bot backs (1P) or P2 interactive cards (2P) */}
      {isTwoPlayer ? (
        <div className="mb-4 space-y-1.5">
          <p className="text-center text-xs font-semibold text-[#ffb2b7]">
            P2 Hand (←/→ + ↑)
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {p2Hand.map((card, idx) => {
              const isSelected = turnSlot === 1 && idx === Math.min(cursorIdx, p2Hand.length - 1);
              return (
                <button
                  key={card.id}
                  type="button"
                  disabled={busy || turnSlot !== 1}
                  onClick={() => handlePlayLocal2PCard(1, card)}
                  className={`flex h-20 w-14 flex-col items-center justify-center rounded-lg border bg-[#f8fafc] shadow transition-transform duration-150 ${
                    turnSlot === 1
                      ? isSelected
                        ? 'border-[#f43f5e] ring-2 ring-[#f43f5e] -translate-y-1 cursor-pointer'
                        : 'border-white/30 hover:-translate-y-1 cursor-pointer'
                      : 'border-white/10 opacity-50 cursor-default'
                  }`}
                >
                  <span className={`font-display text-base font-bold ${isRed(card.suit) ? 'text-[#dc2626]' : 'text-[#0f172a]'}`}>
                    {card.label}
                  </span>
                  <span className={`text-xl ${isRed(card.suit) ? 'text-[#dc2626]' : 'text-[#0f172a]'}`}>
                    {card.suit}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mb-5 flex justify-center gap-2">
          {p2Hand.map((c) => (
            <div
              key={c.id}
              className="h-14 w-10 rounded-lg border border-white/15 bg-[#171f33] flex items-center justify-center text-xs text-[#908fa0]"
            >
              PZ
            </div>
          ))}
        </div>
      )}

      {/* Battle Zone */}
      <div className="my-4 flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-white/10 bg-[#060e20]/60 p-4">
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <span className="mb-1 text-[11px] text-[#4cd7f6]">
              {isTwoPlayer ? 'Player 1' : 'Your Card'}
            </span>
            {p1Card ? (
              <div className="flex h-24 w-16 flex-col items-center justify-center rounded-lg bg-[#f8fafc] shadow-md">
                <span className={`font-display text-lg font-bold ${isRed(p1Card.suit) ? 'text-[#dc2626]' : 'text-[#0f172a]'}`}>
                  {p1Card.label}
                </span>
                <span className={`text-2xl ${isRed(p1Card.suit) ? 'text-[#dc2626]' : 'text-[#0f172a]'}`}>
                  {p1Card.suit}
                </span>
              </div>
            ) : (
              <div className="flex h-24 w-16 items-center justify-center rounded-lg border border-dashed border-white/20 text-xs text-[#908fa0]">
                —
              </div>
            )}
          </div>

          <span className="font-display text-sm font-semibold text-[#908fa0]">VS</span>

          <div className="flex flex-col items-center">
            <span className="mb-1 text-[11px] text-[#ffb2b7]">
              {isTwoPlayer ? 'Player 2' : 'Dealer'}
            </span>
            {p2Card ? (
              <div className="flex h-24 w-16 flex-col items-center justify-center rounded-lg bg-[#f8fafc] shadow-md">
                <span className={`font-display text-lg font-bold ${isRed(p2Card.suit) ? 'text-[#dc2626]' : 'text-[#0f172a]'}`}>
                  {p2Card.label}
                </span>
                <span className={`text-2xl ${isRed(p2Card.suit) ? 'text-[#dc2626]' : 'text-[#0f172a]'}`}>
                  {p2Card.suit}
                </span>
              </div>
            ) : (
              <div className="flex h-24 w-16 items-center justify-center rounded-lg border border-dashed border-white/20 text-xs text-[#908fa0]">
                —
              </div>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-[#dae2fd]">{message}</p>
      </div>

      {/* Bottom Hand: Player 1 */}
      <div className="mt-4 space-y-1.5">
        {isTwoPlayer && (
          <p className="text-center text-xs font-semibold text-[#4cd7f6]">
            P1 Hand (A/D + W)
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-2.5">
          {p1Hand.map((card, idx) => {
            const isSelected =
              isTwoPlayer && turnSlot === 0 && idx === Math.min(cursorIdx, p1Hand.length - 1);
            const activeTurn = isTwoPlayer ? turnSlot === 0 && !busy : !busy;
            return (
              <button
                key={card.id}
                type="button"
                disabled={!activeTurn}
                onClick={() =>
                  isTwoPlayer ? handlePlayLocal2PCard(0, card) : handlePlay1PCard(card)
                }
                className={`flex h-24 w-16 flex-col items-center justify-center rounded-lg border bg-[#f8fafc] shadow transition-transform duration-150 ${
                  activeTurn
                    ? isSelected
                      ? 'border-[#4cd7f6] ring-2 ring-[#4cd7f6] -translate-y-1.5 cursor-pointer'
                      : 'border-[#4cd7f6]/40 hover:-translate-y-1.5 hover:ring-2 hover:ring-[#4cd7f6] cursor-pointer'
                    : 'border-white/10 opacity-50 cursor-default'
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
    </div>
  );
};
