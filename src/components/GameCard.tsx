import React from 'react';
import { Heart, Play, Star } from 'lucide-react';
import { GameItem } from '../types';
import { GameArtwork } from './GameArtwork';

interface GameCardProps {
  game: GameItem;
  personalBest: number;
  isFavorite: boolean;
  onPlay: (game: GameItem) => void;
  onToggleFavorite: (gameId: string) => void;
  showChallenge?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  personalBest,
  isFavorite,
  onPlay,
  onToggleFavorite,
  showChallenge = false,
}) => {
  const challengeCleared = personalBest >= game.soloChallenge.targetScore;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#171f33] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#4cd7f6]/50 hover:shadow-[0_12px_32px_rgba(6,182,212,0.12)]">
      {/* Media Thumbnail */}
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        <GameArtwork game={game} className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]" />
        <button
          type="button"
          onClick={() => onToggleFavorite(game.id)}
          aria-label={isFavorite ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`}
          aria-pressed={isFavorite}
          className={`absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-lg border backdrop-blur-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6] ${
            isFavorite
              ? 'border-[#f43f5e]/60 bg-[#f43f5e]/20 text-[#ffb2b7]'
              : 'border-white/10 bg-[#0b1326]/75 text-[#c7c4d7] hover:text-white'
          }`}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          {/* Clean unboxed metadata row */}
          <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-[#908fa0]">
            <span className="text-[#4cd7f6]">{game.category}</span>
            <span aria-hidden="true">·</span>
            <span>{game.difficulty}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 text-[#f59e0b] tabular-nums">
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
              {game.rating.toFixed(1)}
            </span>
          </div>

          <h3 className="font-display text-lg font-semibold tracking-tight text-[#dae2fd] group-hover:text-white">
            {game.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[#c7c4d7]">
            {game.description}
          </p>

          {showChallenge && (
            <div className="mt-3 rounded-xl bg-[#131b2e] px-3.5 py-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-[#c7c4d7]">Solo Target</span>
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    challengeCleared ? 'text-[#4cd7f6]' : 'text-[#f59e0b]'
                  }`}
                >
                  {challengeCleared
                    ? 'Cleared'
                    : `${game.soloChallenge.targetScore} ${game.soloChallenge.unit}`}
                </span>
              </div>
              <p className="mt-1 text-[#908fa0]">{game.soloChallenge.title}</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/[0.06] pt-4">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-[#908fa0]">
              {personalBest > 0 ? 'Personal Best' : 'Community Plays'}
            </span>
            <span className="font-mono text-sm font-semibold text-[#dae2fd] tabular-nums">
              {personalBest > 0
                ? `${personalBest.toLocaleString()} pts`
                : `${game.playsCount.toLocaleString()}`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onPlay(game)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 font-display text-sm font-semibold text-white hover:bg-[#5558e8] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6]"
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span>Play</span>
          </button>
        </div>
      </div>
    </article>
  );
};
