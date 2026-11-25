export type ScreenPath = 'home' | 'single-player' | 'all-games';

export type GameCategory = 'Action' | 'Puzzle' | 'Strategy' | 'Card & Board' | 'Arcade';

export type GameDifficulty = 'Casual' | 'Standard' | 'Expert';

export type GameEngineType =
  | 'astro-dodge'
  | 'neon-breaker'
  | 'hexa-pulse'
  | 'word-hunt'
  | 'void-chess'
  | 'trump-duel'
  | 'orbit-stacker';

export interface GameItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: GameCategory;
  difficulty: GameDifficulty;
  rating: number;
  playsCount: number;
  avgSessionMin: number;
  isSinglePlayerFeatured: boolean;
  isTrending?: boolean;
  engine: GameEngineType;
  variantConfig?: {
    speedMultiplier?: number;
    gridSize?: number;
    accentHex: string;
    secondaryHex: string;
    themeLabel: string;
    wordSetIndex?: number;
  };
  soloChallenge: {
    title: string;
    targetScore: number;
    unit: string;
  };
  controlsHint: string;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  gameId: string;
  gameTitle: string;
  score: number;
  isCurrentUser?: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  requirementLabel: string;
}

export interface PlayerProgress {
  highScores: Record<string, number>;
  favorites: string[];
  gamesPlayed: number;
  unlockedAchievements: string[];
  dailyStreak: number;
  lastPlayedGameId: string | null;
}
