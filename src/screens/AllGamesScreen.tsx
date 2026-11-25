import React, { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { GameCategory, GameItem, PlayerProgress } from '../types';
import { GameCard } from '../components/GameCard';

interface AllGamesScreenProps {
  games: GameItem[];
  progress: PlayerProgress;
  selectedCategory: GameCategory | 'All';
  onSelectCategory: (category: GameCategory | 'All') => void;
  onPlayGame: (game: GameItem) => void;
  onToggleFavorite: (gameId: string) => void;
}

type SortOption = 'featured' | 'rating' | 'plays' | 'best';

const CATEGORIES: ('All' | GameCategory)[] = [
  'All',
  'Action',
  'Arcade',
  'Puzzle',
  'Strategy',
  'Card & Board',
];

export const AllGamesScreen: React.FC<AllGamesScreenProps> = ({
  games,
  progress,
  selectedCategory,
  onSelectCategory,
  onPlayGame,
  onToggleFavorite,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = games.filter((g) => {
      const matchesCat = selectedCategory === 'All' || g.category === selectedCategory;
      const matchesFav = !favoritesOnly || progress.favorites.includes(g.id);
      const matchesSearch =
        q.length === 0 ||
        g.title.toLowerCase().includes(q) ||
        g.subtitle.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q);
      return matchesCat && matchesFav && matchesSearch;
    });

    if (sortBy === 'rating') {
      return [...list].sort((a, b) => b.rating - a.rating);
    }
    if (sortBy === 'plays') {
      return [...list].sort((a, b) => b.playsCount - a.playsCount);
    }
    if (sortBy === 'best') {
      return [...list].sort(
        (a, b) => (progress.highScores[b.id] ?? 0) - (progress.highScores[a.id] ?? 0)
      );
    }
    return list;
  }, [games, selectedCategory, favoritesOnly, searchQuery, sortBy, progress.favorites, progress.highScores]);

  const handleReset = () => {
    setSearchQuery('');
    onSelectCategory('All');
    setSortBy('featured');
    setFavoritesOnly(false);
  };

  return (
    <div className="mx-auto max-w-[1360px] px-4 py-8 sm:px-8 sm:py-10 space-y-8">
      {/* Catalog Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-[#4cd7f6]">Complete Browser Library</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#dae2fd]">
            All Games
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#c7c4d7]">
            Search, filter by genre, or sort by personal best across all {games.length} instant games.
          </p>
        </div>

        <div className="font-mono text-sm text-[#908fa0] tabular-nums">
          Showing <strong className="text-[#dae2fd]">{filteredGames.length}</strong> of {games.length} titles
        </div>
      </section>

      {/* Search & Filter Toolbar */}
      <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#131b2e] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#908fa0]"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games by title, genre, or mechanic..."
              aria-label="Search games"
              className="w-full rounded-lg border border-white/10 bg-[#171f33] py-2.5 pl-10 pr-9 text-sm text-[#dae2fd] placeholder-[#908fa0] focus:border-[#4cd7f6] focus:outline-none focus:ring-2 focus:ring-[#4cd7f6]/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-[#908fa0] hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sort & Favorites Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#171f33] px-3 py-2 text-xs text-[#c7c4d7]">
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#4cd7f6]" aria-hidden="true" />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent font-medium text-[#dae2fd] focus:outline-none cursor-pointer"
              >
                <option value="featured" className="bg-[#171f33]">Featured</option>
                <option value="rating" className="bg-[#171f33]">Top Rated</option>
                <option value="plays" className="bg-[#171f33]">Most Played</option>
                <option value="best" className="bg-[#171f33]">Personal Best</option>
              </select>
            </label>

            <button
              type="button"
              onClick={() => setFavoritesOnly((prev) => !prev)}
              aria-pressed={favoritesOnly}
              className={`rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                favoritesOnly
                  ? 'border-[#f43f5e]/60 bg-[#f43f5e]/20 text-[#ffb2b7]'
                  : 'border-white/10 bg-[#171f33] text-[#c7c4d7] hover:text-white'
              }`}
            >
              Favorites ({progress.favorites.length})
            </button>
          </div>
        </div>

        {/* Category Segmented Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => onSelectCategory(category)}
                className={`rounded-lg px-3.5 py-1.5 font-display text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#06b6d4] text-[#001f26] font-semibold'
                    : 'bg-[#171f33] text-[#c7c4d7] hover:bg-[#222a3d] hover:text-white'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </section>

      {/* Games Grid */}
      {filteredGames.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#131b2e] p-12 text-center">
          <p className="font-display text-lg font-semibold text-[#dae2fd]">
            No games matched your current filters
          </p>
          <p className="mt-1.5 text-sm text-[#908fa0]">
            Clear your search query or reset genre filters to view the full PlayZone library.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-5 rounded-lg bg-[#6366f1] px-5 py-2.5 font-display text-sm font-semibold text-white hover:bg-[#5558e8] cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              personalBest={progress.highScores[game.id] ?? 0}
              isFavorite={progress.favorites.includes(game.id)}
              onPlay={onPlayGame}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
};
