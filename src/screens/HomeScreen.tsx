import React, { useState } from 'react';
import { ArrowRight, Flame, Globe, Keyboard, Play, Trophy } from 'lucide-react';
import type { PlayMode } from '../multiplayerTypes';
import { GameCategory, GameItem, LeaderboardEntry, PlayerProgress, ScreenPath } from '../types';
import { GameCard } from '../components/GameCard';
import { AstroDodgeGame } from '../components/games/AstroDodgeGame';

interface HomeScreenProps {
  games: GameItem[];
  leaderboard: LeaderboardEntry[];
  progress: PlayerProgress;
  onPlayGame: (game: GameItem, mode?: PlayMode, joinCode?: string) => void;
  onToggleFavorite: (gameId: string) => void;
  onNavigate: (screen: ScreenPath, categoryFilter?: GameCategory | 'All') => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  games,
  leaderboard,
  progress,
  onPlayGame,
  onToggleFavorite,
  onNavigate,
}) => {
  const featuredGame = games[0];
  const trendingGames = games.filter((g) => g.isTrending).slice(0, 4);
  const topPersonalScore = Math.max(0, ...Object.values(progress.highScores));
  const [quickRoomCode, setQuickRoomCode] = useState('');

  const genres: { label: GameCategory; count: number; summary: string }[] = [
    { label: 'Action', count: games.filter((g) => g.category === 'Action').length, summary: 'High-speed dodgers & overdrive reflexes' },
    { label: 'Puzzle', count: games.filter((g) => g.category === 'Puzzle').length, summary: 'Word hunts & grid inversion challenges' },
    { label: 'Strategy', count: games.filter((g) => g.category === 'Strategy').length, summary: 'Tactical chess bots & pattern logic' },
    { label: 'Card & Board', count: games.filter((g) => g.category === 'Card & Board').length, summary: 'Celestial trick-taking & table duels' },
  ];

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-8 sm:px-8 sm:py-10 space-y-12">
      {/* Hero Spotlight (2-column split, items-stretch) */}
      <section aria-labelledby="home-hero-heading">
        <div className="grid gap-8 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#131b2e] p-6 sm:p-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-[#908fa0]">
                <span className="text-[#4cd7f6]">Featured Game</span>
                <span aria-hidden="true">·</span>
                <span>{featuredGame.category}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{featuredGame.rating.toFixed(1)} ★</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{featuredGame.playsCount.toLocaleString()} plays</span>
              </div>

              <h1
                id="home-hero-heading"
                className="mt-3 font-display text-3xl sm:text-5xl font-bold tracking-tight text-[#dae2fd] leading-[1.12] [text-wrap:balance]"
              >
                {featuredGame.title}: {featuredGame.subtitle}
              </h1>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-[#c7c4d7]">
                {featuredGame.description} Jump into solo runs, challenge a friend locally with WASD vs. Arrow keys, or open a live room code.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onPlayGame(featuredGame, '1p')}
                className="inline-flex items-center gap-2.5 rounded-lg bg-[#6366f1] px-6 py-3 font-display text-sm font-semibold text-white shadow-[0_0_24px_rgba(99,102,241,0.4)] hover:bg-[#5558e8] active:scale-[0.98] transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6]"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                <span>Play Featured Game</span>
              </button>

              <button
                type="button"
                onClick={() => onPlayGame(featuredGame, '2p-local')}
                className="inline-flex items-center gap-2 rounded-lg border border-[#4cd7f6]/45 bg-transparent px-4 py-3 font-display text-sm font-semibold text-[#4cd7f6] hover:bg-[#4cd7f6]/10 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6]"
              >
                <Keyboard className="h-4 w-4" aria-hidden="true" />
                <span>2P Local Duel</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('single-player')}
                className="inline-flex items-center gap-1.5 px-3 py-3 font-display text-sm font-medium text-[#c7c4d7] hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Solo Challenges</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col">
            <div className="group relative flex-1 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#060e20]">
              <div className="h-full w-full flex items-center justify-center">
                <AstroDodgeGame
                  game={featuredGame}
                  onScoreUpdate={() => {}}
                  onGameEnd={() => {}}
                  resetSignal={0}
                  previewOnly
                />
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b1326]/90 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
                <div>
                  <p className="text-xs font-medium text-[#4cd7f6]">Live Arcade Preview</p>
                  <p className="font-display text-base font-semibold text-white">
                    {featuredGame.soloChallenge.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onPlayGame(featuredGame, '1p')}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#06b6d4] px-4 py-2 font-display text-xs font-semibold text-[#001f26] hover:bg-[#4cd7f6] transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  <span>Launch Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width 4-column Hub Metrics Strip below Hero split */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-white/[0.08] bg-[#171f33] px-5 py-4">
            <div className="text-xs font-medium text-[#908fa0]">Instant Catalog</div>
            <div className="mt-1 font-display text-2xl font-bold text-[#dae2fd] tabular-nums">
              {games.length} Games
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#171f33] px-5 py-4">
            <div className="text-xs font-medium text-[#908fa0]">Playable Engines</div>
            <div className="mt-1 font-display text-2xl font-bold text-[#4cd7f6] tabular-nums">
              7 Modes
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#171f33] px-5 py-4">
            <div className="text-xs font-medium text-[#908fa0]">Your Best Score</div>
            <div className="mt-1 font-display text-2xl font-bold text-[#f59e0b] tabular-nums">
              {topPersonalScore.toLocaleString()} pts
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-[#171f33] px-5 py-4">
            <div className="text-xs font-medium text-[#908fa0]">Sessions Completed</div>
            <div className="mt-1 font-display text-2xl font-bold text-[#c0c1ff] tabular-nums">
              {progress.gamesPlayed}
            </div>
          </div>
        </div>
      </section>

      {/* Multiplayer & Local 2P Arena Bar */}
      <section aria-labelledby="multiplayer-bar-heading" className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6 rounded-2xl border border-white/[0.08] bg-[#131b2e] p-6 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#4cd7f6]">
              <Keyboard className="h-4 w-4" aria-hidden="true" />
              <span>Same-Keyboard Versus</span>
            </div>
            <h2 id="multiplayer-bar-heading" className="mt-1.5 font-display text-xl font-semibold text-[#dae2fd]">
              Local 2-Player (WASD vs. Arrow Keys)
            </h2>
            <p className="mt-1.5 text-sm text-[#c7c4d7]">
              Player 1 uses <strong className="font-mono text-[#4cd7f6]">WASD</strong> and Player 2 uses{' '}
              <strong className="font-mono text-[#ffb2b7]">Arrow Keys</strong> across Astro Dodge, Neon Breaker, Orbit Stacker, Void Chess, and Trump Duel.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onPlayGame(games[0], '2p-local')}
              className="rounded-lg bg-[#06b6d4] px-4 py-2 font-display text-xs font-semibold text-[#001f26] hover:bg-[#4cd7f6] cursor-pointer whitespace-nowrap shrink-0"
            >
              Play Astro Dodge 2P
            </button>
            <button
              type="button"
              onClick={() => onPlayGame(games[1], '2p-local')}
              className="rounded-lg border border-white/15 bg-[#171f33] px-4 py-2 font-display text-xs font-semibold text-[#dae2fd] hover:border-[#4cd7f6]/50 cursor-pointer whitespace-nowrap shrink-0"
            >
              Neon Breaker 2P
            </button>
            <button
              type="button"
              onClick={() => onPlayGame(games[6], '2p-local')}
              className="rounded-lg border border-white/15 bg-[#171f33] px-4 py-2 font-display text-xs font-semibold text-[#dae2fd] hover:border-[#4cd7f6]/50 cursor-pointer whitespace-nowrap shrink-0"
            >
              Orbit Stacker 2P
            </button>
          </div>
        </div>

        <div className="lg:col-span-6 rounded-2xl border border-white/[0.08] bg-[#131b2e] p-6 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#c0c1ff]">
              <Globe className="h-4 w-4" aria-hidden="true" />
              <span>Live WebSocket Rooms</span>
            </div>
            <h2 className="mt-1.5 font-display text-xl font-semibold text-[#dae2fd]">
              Online Room-Code Multiplayer
            </h2>
            <p className="mt-1.5 text-sm text-[#c7c4d7]">
              Generate a 6-character room code to invite a friend, or enter a code below to jump into a live match.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onPlayGame(games[0], '2p-online', quickRoomCode.trim().toUpperCase());
            }}
            className="flex flex-wrap items-center gap-3"
          >
            <button
              type="button"
              onClick={() => onPlayGame(games[0], '2p-online')}
              className="rounded-lg bg-[#6366f1] px-4 py-2 font-display text-xs font-semibold text-white hover:bg-[#5558e8] cursor-pointer whitespace-nowrap shrink-0"
            >
              Create Room
            </button>
            <input
              type="text"
              maxLength={6}
              value={quickRoomCode}
              onChange={(e) =>
                setQuickRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
              }
              placeholder="ROOM CODE"
              aria-label="Enter 6-character room code"
              className="w-36 rounded-lg border border-white/10 bg-[#171f33] px-3 py-2 font-mono text-xs uppercase tracking-widest text-[#dae2fd] placeholder-[#908fa0] focus:border-[#4cd7f6] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg border border-[#4cd7f6]/45 bg-transparent px-4 py-2 font-display text-xs font-semibold text-[#4cd7f6] hover:bg-[#4cd7f6]/10 cursor-pointer whitespace-nowrap shrink-0"
            >
              Join Code
            </button>
          </form>
        </div>
      </section>

      {/* Trending Now Section */}
      <section aria-labelledby="trending-heading">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2
              id="trending-heading"
              className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight text-[#dae2fd]"
            >
              <Flame className="h-5 w-5 text-[#f43f5e]" aria-hidden="true" />
              <span>Trending Now</span>
            </h2>
            <p className="mt-1 text-sm text-[#908fa0]">
              Most played browser titles across action, card, and strategy rooms.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('all-games', 'All')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4cd7f6] hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>View All Games</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trendingGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              personalBest={progress.highScores[game.id] ?? 0}
              isFavorite={progress.favorites.includes(game.id)}
              onPlay={(g) => onPlayGame(g, '1p')}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      </section>

      {/* Leaderboard Podium + Browse by Genre */}
      <section className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-[#131b2e] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-[#dae2fd]">
                <Trophy className="h-5 w-5 text-[#f59e0b]" aria-hidden="true" />
                <span>Arcade Leaderboard</span>
              </h2>
              <p className="mt-1 text-xs text-[#908fa0]">
                Your new high scores automatically enter the PlayZone standings.
              </p>
            </div>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {leaderboard.slice(0, 6).map((entry, idx) => {
              const rank = idx + 1;
              const rankColor =
                rank === 1
                  ? 'text-[#f59e0b]'
                  : rank === 2
                  ? 'text-[#4cd7f6]'
                  : rank === 3
                  ? 'text-[#c0c1ff]'
                  : 'text-[#908fa0]';

              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between gap-4 py-3.5 px-3 rounded-lg ${
                    entry.isCurrentUser ? 'bg-[#6366f1]/15' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className={`w-6 font-mono text-sm font-bold tabular-nums ${rankColor}`}>
                      #{rank}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-semibold text-[#dae2fd]">
                        {entry.playerName}
                        {entry.isCurrentUser ? ' (You)' : ''}
                      </p>
                      <p className="truncate text-xs text-[#908fa0]">{entry.gameTitle}</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold text-[#4cd7f6] tabular-nums shrink-0">
                    {entry.score.toLocaleString()} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#131b2e] p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#dae2fd]">
              Jump by Genre
            </h2>
            <p className="mt-1 text-xs text-[#908fa0]">
              Filter the full catalog directly into your preferred arcade style.
            </p>

            <div className="mt-5 grid gap-3">
              {genres.map((genre) => (
                <button
                  key={genre.label}
                  type="button"
                  onClick={() => onNavigate('all-games', genre.label)}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#171f33] px-4 py-3.5 text-left transition-colors hover:border-[#4cd7f6]/50 hover:bg-[#222a3d] cursor-pointer"
                >
                  <div>
                    <div className="font-display text-sm font-semibold text-[#dae2fd]">
                      {genre.label}
                    </div>
                    <div className="mt-0.5 text-xs text-[#908fa0]">{genre.summary}</div>
                  </div>
                  <span className="font-mono text-xs font-semibold text-[#4cd7f6] tabular-nums shrink-0">
                    {genre.count} titles
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
