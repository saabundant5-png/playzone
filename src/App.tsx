import { useCallback, useEffect, useMemo, useState } from 'react';
import { GAMES_CATALOG, INITIAL_LEADERBOARD } from './data/games';
import type { PlayMode } from './multiplayerTypes';
import { GameCategory, GameItem, LeaderboardEntry, PlayerProgress, ScreenPath } from './types';
import { TopNav } from './components/TopNav';
import { HomeScreen } from './screens/HomeScreen';
import { SinglePlayerScreen } from './screens/SinglePlayerScreen';
import { AllGamesScreen } from './screens/AllGamesScreen';
import { GameStageModal } from './components/GameStageModal';
import { useMultiplayerRoom } from './hooks/useMultiplayerRoom';
import { soundFX } from './utils/sound';

const STORAGE_KEY = 'playzone_player_progress_v1';

const DEFAULT_PROGRESS: PlayerProgress = {
  highScores: {},
  favorites: ['astro-dodge', 'void-chess'],
  gamesPlayed: 0,
  unlockedAchievements: [],
  dailyStreak: 1,
  lastPlayedGameId: null,
};

const SCREEN_TITLES: Record<ScreenPath, string> = {
  home: 'Home - PlayZone',
  'single-player': 'Single Player - PlayZone',
  'all-games': 'All Games - PlayZone',
};

function readInitialScreen(): ScreenPath {
  if (typeof window === 'undefined') return 'home';
  const hash = window.location.hash.replace('#', '');
  if (hash === 'single-player' || hash === 'all-games' || hash === 'home') {
    return hash;
  }
  return 'home';
}

function readRoomParam(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return (params.get('room') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function loadProgress(): PlayerProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      highScores: parsed.highScores ?? {},
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : DEFAULT_PROGRESS.favorites,
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements)
        ? parsed.unlockedAchievements
        : [],
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export default function App() {
  const initialRoomParam = useMemo(readRoomParam, []);
  const [currentScreen, setCurrentScreen] = useState<ScreenPath>(readInitialScreen);
  const [allGamesCategory, setAllGamesCategory] = useState<GameCategory | 'All'>('All');
  const [progress, setProgress] = useState<PlayerProgress>(loadProgress);
  const [activeGame, setActiveGame] = useState<GameItem | null>(() =>
    initialRoomParam ? GAMES_CATALOG[0] : null
  );
  const [activePlayMode, setActivePlayMode] = useState<PlayMode>(() =>
    initialRoomParam ? '2p-online' : '1p'
  );
  const [prefillJoinCode, setPrefillJoinCode] = useState<string>(initialRoomParam);
  const [muted, setMuted] = useState(false);

  const multiplayer = useMultiplayerRoom();

  useEffect(() => {
    document.title = SCREEN_TITLES[currentScreen];
  }, [currentScreen]);

  useEffect(() => {
    const onHashChange = () => {
      setCurrentScreen(readInitialScreen());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage quota errors
    }
  }, [progress]);

  const handleNavigate = useCallback(
    (screen: ScreenPath, categoryFilter?: GameCategory | 'All') => {
      if (categoryFilter !== undefined) {
        setAllGamesCategory(categoryFilter);
      }
      setCurrentScreen(screen);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `${window.location.pathname}#${screen}`);
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      }
    },
    []
  );

  const handleToggleFavorite = useCallback((gameId: string) => {
    soundFX.playClick();
    setProgress((prev) => {
      const exists = prev.favorites.includes(gameId);
      const nextFavs = exists
        ? prev.favorites.filter((id) => id !== gameId)
        : [...prev.favorites, gameId];

      const nextAchievements = new Set(prev.unlockedAchievements);
      if (nextFavs.length >= 3) {
        nextAchievements.add('curator');
      }

      return {
        ...prev,
        favorites: nextFavs,
        unlockedAchievements: Array.from(nextAchievements),
      };
    });
  }, []);

  const handleSubmitScore = useCallback((gameId: string, score: number) => {
    setProgress((prev) => {
      const prevBest = prev.highScores[gameId] ?? 0;
      const nextBest = Math.max(prevBest, score);
      const nextHighScores = { ...prev.highScores, [gameId]: nextBest };
      const gameObj = GAMES_CATALOG.find((g) => g.id === gameId);

      const nextAchievements = new Set(prev.unlockedAchievements);
      nextAchievements.add('first-launch');
      if (score >= 500) {
        nextAchievements.add('score-hunter');
      }
      if (gameObj && score >= gameObj.soloChallenge.targetScore) {
        nextAchievements.add('solo-challenger');
      }

      return {
        ...prev,
        highScores: nextHighScores,
        gamesPlayed: prev.gamesPlayed + 1,
        lastPlayedGameId: gameId,
        unlockedAchievements: Array.from(nextAchievements),
      };
    });
  }, []);

  const handleOpenGame = useCallback(
    (game: GameItem, mode: PlayMode = '1p', joinCode?: string) => {
      soundFX.playClick();
      if (joinCode !== undefined) {
        setPrefillJoinCode(joinCode);
      }
      setActivePlayMode(mode);
      setActiveGame(game);
    },
    []
  );

  const handleQuickPlay = useCallback(() => {
    soundFX.playClick();
    const target =
      GAMES_CATALOG.find((g) => g.id === progress.lastPlayedGameId) ?? GAMES_CATALOG[0];
    setActivePlayMode('1p');
    setActiveGame(target);
  }, [progress.lastPlayedGameId]);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundFX.muted = next;
      return next;
    });
  }, []);

  const mergedLeaderboard: LeaderboardEntry[] = useMemo(() => {
    const userEntries: LeaderboardEntry[] = Object.entries(progress.highScores)
      .filter(([, score]) => score > 0)
      .map(([gameId, score]) => {
        const game = GAMES_CATALOG.find((g) => g.id === gameId);
        return {
          id: `user-${gameId}`,
          playerName: 'PlayerOne',
          gameId,
          gameTitle: game?.title ?? gameId,
          score,
          isCurrentUser: true,
        };
      });

    return [...INITIAL_LEADERBOARD, ...userEntries].sort((a, b) => b.score - a.score);
  }, [progress.highScores]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0b1326] text-[#dae2fd]">
      <TopNav
        currentScreen={currentScreen}
        onNavigate={(screen) => handleNavigate(screen)}
        onQuickPlay={handleQuickPlay}
      />

      <main className="flex-1">
        {currentScreen === 'home' && (
          <HomeScreen
            games={GAMES_CATALOG}
            leaderboard={mergedLeaderboard}
            progress={progress}
            onPlayGame={handleOpenGame}
            onToggleFavorite={handleToggleFavorite}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'single-player' && (
          <SinglePlayerScreen
            games={GAMES_CATALOG}
            progress={progress}
            onPlayGame={(game) => handleOpenGame(game, '1p')}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {currentScreen === 'all-games' && (
          <AllGamesScreen
            games={GAMES_CATALOG}
            progress={progress}
            selectedCategory={allGamesCategory}
            onSelectCategory={setAllGamesCategory}
            onPlayGame={(game) => handleOpenGame(game, '1p')}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
      </main>

      <footer className="border-t border-white/[0.08] bg-[#060e20]">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-xs text-[#908fa0]">
            PlayZone Browser Arcade · Instant HTML5, Local 2P & Online Room Games
          </p>
          <div className="flex items-center gap-6 text-xs text-[#c7c4d7]">
            <button
              type="button"
              onClick={() => handleNavigate('home')}
              className="hover:text-[#4cd7f6] cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('single-player')}
              className="hover:text-[#4cd7f6] cursor-pointer"
            >
              Single Player
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('all-games', 'All')}
              className="hover:text-[#4cd7f6] cursor-pointer"
            >
              All Games
            </button>
          </div>
        </div>
      </footer>

      {activeGame && (
        <GameStageModal
          game={activeGame}
          initialMode={activePlayMode}
          personalBest={progress.highScores[activeGame.id] ?? 0}
          isFavorite={progress.favorites.includes(activeGame.id)}
          muted={muted}
          multiplayer={{
            ...multiplayer,
            initialJoinCode: prefillJoinCode,
          }}
          onToggleMute={handleToggleMute}
          onToggleFavorite={handleToggleFavorite}
          onSubmitScore={handleSubmitScore}
          onClose={() => {
            multiplayer.leaveRoom();
            setActiveGame(null);
          }}
        />
      )}
    </div>
  );
}
