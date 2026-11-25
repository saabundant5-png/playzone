import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, Play, Target } from 'lucide-react';
import { ACHIEVEMENTS_LIST } from '../data/games';
import { GameDifficulty, GameItem, PlayerProgress } from '../types';
import { GameCard } from '../components/GameCard';

interface SinglePlayerScreenProps {
  games: GameItem[];
  progress: PlayerProgress;
  onPlayGame: (game: GameItem) => void;
  onToggleFavorite: (gameId: string) => void;
}

export const SinglePlayerScreen: React.FC<SinglePlayerScreenProps> = ({
  games,
  progress,
  onPlayGame,
  onToggleFavorite,
}) => {
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | GameDifficulty>('All');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const soloGames = useMemo(() => {
    return games.filter((g) => {
      const matchesDiff = difficultyFilter === 'All' || g.difficulty === difficultyFilter;
      const matchesFav = !favoritesOnly || progress.favorites.includes(g.id);
      return matchesDiff && matchesFav;
    });
  }, [games, difficultyFilter, favoritesOnly, progress.favorites]);

  const dailyFeatured = games[1]; // Neon Breaker
  const dailyBest = progress.highScores[dailyFeatured.id] ?? 0;
  const dailyPercent = Math.min(
    100,
    Math.round((dailyBest / dailyFeatured.soloChallenge.targetScore) * 100)
  );

  const clearedChallengesCount = games.filter(
    (g) => (progress.highScores[g.id] ?? 0) >= g.soloChallenge.targetScore
  ).length;

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-8 sm:px-8 sm:py-10 space-y-10">
      {/* Header & Solo Summary */}
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-[#4cd7f6]">Solo Campaigns & Challenges</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#dae2fd] [text-wrap:balance]">
            Single Player Arena
          </h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base text-[#c7c4d7]">
            Play at your own pace against smart arena bots, puzzle boards, and personal high-score targets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 rounded-xl border border-white/[0.08] bg-[#131b2e] px-6 py-4">
          <div>
            <div className="text-xs text-[#908fa0]">Targets Cleared</div>
            <div className="font-mono text-xl font-bold text-[#4cd7f6] tabular-nums">
              {clearedChallengesCount}/{games.length}
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div>
            <div className="text-xs text-[#908fa0]">Achievements</div>
            <div className="font-mono text-xl font-bold text-[#f59e0b] tabular-nums">
              {progress.unlockedAchievements.length}/{ACHIEVEMENTS_LIST.length}
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div>
            <div className="text-xs text-[#908fa0]">Favorites</div>
            <div className="font-mono text-xl font-bold text-[#c0c1ff] tabular-nums">
              {progress.favorites.length}
            </div>
          </div>
        </div>
      </section>

      {/* Daily Solo Challenge Spotlight */}
      <section className="rounded-2xl border border-[#4cd7f6]/30 bg-[#131b2e] p-6 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#f59e0b]">
              <Target className="h-4 w-4" aria-hidden="true" />
              <span>Featured Solo Challenge</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold text-[#dae2fd]">
              {dailyFeatured.title}: {dailyFeatured.soloChallenge.title}
            </h2>
            <p className="mt-1.5 text-sm text-[#c7c4d7]">
              Current personal best:{' '}
              <strong className="font-mono text-[#4cd7f6] tabular-nums">
                {dailyBest.toLocaleString()} / {dailyFeatured.soloChallenge.targetScore} pts
              </strong>
            </p>
            <div className="mt-4 h-2.5 w-full max-w-md overflow-hidden rounded-full bg-[#060e20]">
              <div
                className="h-full rounded-full bg-[#4cd7f6] transition-all duration-300"
                style={{ width: `${dailyPercent}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onPlayGame(dailyFeatured)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6366f1] px-6 py-3 font-display text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:bg-[#5558e8] cursor-pointer whitespace-nowrap shrink-0 self-start lg:self-center"
          >
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            <span>Attempt Challenge</span>
          </button>
        </div>
      </section>

      {/* Difficulty & Filter Bar */}
      <section aria-labelledby="solo-roster-heading" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="solo-roster-heading" className="font-display text-2xl font-semibold text-[#dae2fd]">
            Solo Games & Targets
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#131b2e] p-1">
              {(['All', 'Casual', 'Standard', 'Expert'] as const).map((diff) => {
                const active = difficultyFilter === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficultyFilter(diff)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#6366f1] text-white'
                        : 'text-[#c7c4d7] hover:text-white'
                    }`}
                  >
                    {diff}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setFavoritesOnly((prev) => !prev)}
              aria-pressed={favoritesOnly}
              className={`rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                favoritesOnly
                  ? 'border-[#f43f5e]/60 bg-[#f43f5e]/20 text-[#ffb2b7]'
                  : 'border-white/[0.08] bg-[#131b2e] text-[#c7c4d7] hover:text-white'
              }`}
            >
              Favorites Only
            </button>
          </div>
        </div>

        {soloGames.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#131b2e] p-10 text-center">
            <p className="font-display text-lg font-semibold text-[#dae2fd]">
              No matching solo games found
            </p>
            <p className="mt-1 text-sm text-[#908fa0]">
              Try switching difficulty filters or disabling the favorites-only filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setDifficultyFilter('All');
                setFavoritesOnly(false);
              }}
              className="mt-4 rounded-lg bg-[#6366f1] px-4 py-2 font-display text-xs font-semibold text-white hover:bg-[#5558e8] cursor-pointer"
            >
              Show All Solo Games
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {soloGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                personalBest={progress.highScores[game.id] ?? 0}
                isFavorite={progress.favorites.includes(game.id)}
                onPlay={onPlayGame}
                onToggleFavorite={onToggleFavorite}
                showChallenge
              />
            ))}
          </div>
        )}
      </section>

      {/* Trophy Case / Achievements */}
      <section aria-labelledby="achievements-heading" className="rounded-2xl border border-white/[0.08] bg-[#131b2e] p-6">
        <div className="mb-5 flex items-center gap-2">
          <Award className="h-5 w-5 text-[#f59e0b]" aria-hidden="true" />
          <h2 id="achievements-heading" className="font-display text-xl font-semibold text-[#dae2fd]">
            Solo Trophy Case
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ACHIEVEMENTS_LIST.map((ach) => {
            const unlocked = progress.unlockedAchievements.includes(ach.id);
            return (
              <div
                key={ach.id}
                className={`rounded-xl border p-4 ${
                  unlocked
                    ? 'border-[#4cd7f6]/40 bg-[#171f33]'
                    : 'border-white/[0.06] bg-[#0b1326]/70 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs font-medium">
                  <span className={unlocked ? 'text-[#4cd7f6]' : 'text-[#908fa0]'}>
                    {unlocked ? 'Unlocked' : 'Locked'}
                  </span>
                  {unlocked && <CheckCircle2 className="h-4 w-4 text-[#4cd7f6]" aria-hidden="true" />}
                </div>
                <h3 className="mt-2 font-display text-base font-semibold text-[#dae2fd]">
                  {ach.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#908fa0]">{ach.description}</p>
                <p className="mt-3 font-mono text-[11px] text-[#c7c4d7]">{ach.requirementLabel}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
