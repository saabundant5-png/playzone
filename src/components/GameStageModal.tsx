import React, { useEffect, useRef, useState } from 'react';
import {
  Globe,
  Heart,
  Keyboard,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Trophy,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { PlayMode, RoomSnapshot } from '../multiplayerTypes';
import { GameItem } from '../types';
import { GameArtwork } from './GameArtwork';
import { MultiplayerLobbyPanel } from './MultiplayerLobbyPanel';
import { AstroDodgeGame } from './games/AstroDodgeGame';
import { NeonBreakerGame } from './games/NeonBreakerGame';
import { HexaPulseGame } from './games/HexaPulseGame';
import { WordHuntGame } from './games/WordHuntGame';
import { VoidChessGame } from './games/VoidChessGame';
import { TrumpDuelGame } from './games/TrumpDuelGame';
import { OrbitStackerGame } from './games/OrbitStackerGame';
import { OnlineRoomArena } from './games/OnlineRoomArena';
import { soundFX } from '../utils/sound';

const MULTIPLAYER_ENGINES = new Set([
  'astro-dodge',
  'neon-breaker',
  'orbit-stacker',
  'void-chess',
  'trump-duel',
]);

interface MultiplayerHandlers {
  connected: boolean;
  room: RoomSnapshot | null;
  error: string | null;
  initialJoinCode?: string;
  createRoom: (gameId: string, playerName: string) => void;
  joinRoom: (code: string, playerName: string) => void;
  leaveRoom: () => void;
  setReady: (ready: boolean) => void;
  setGame: (gameId: string) => void;
  startMatch: () => void;
  rematch: () => void;
  sendInput: (dx: number, dy: number) => void;
  sendDrop: () => void;
  sendChessMove: (from: [number, number], to: [number, number]) => void;
  sendCardPlay: (cardId: string) => void;
  clearError: () => void;
}

interface GameStageModalProps {
  game: GameItem;
  initialMode?: PlayMode;
  personalBest: number;
  isFavorite: boolean;
  muted: boolean;
  multiplayer: MultiplayerHandlers;
  onToggleMute: () => void;
  onToggleFavorite: (gameId: string) => void;
  onSubmitScore: (gameId: string, score: number) => void;
  onClose: () => void;
}

type GameStageState = 'TITLE_MENU' | 'PLAYING' | 'GAME_OVER';

export const GameStageModal: React.FC<GameStageModalProps> = ({
  game,
  initialMode = '1p',
  personalBest,
  isFavorite,
  muted,
  multiplayer,
  onToggleMute,
  onToggleFavorite,
  onSubmitScore,
  onClose,
}) => {
  const supportsMultiplayer = MULTIPLAYER_ENGINES.has(game.engine);
  const [playMode, setPlayMode] = useState<PlayMode>(
    supportsMultiplayer ? initialMode : '1p'
  );
  const [stageState, setStageState] = useState<GameStageState>('PLAYING');
  const [liveScore, setLiveScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [wonRun, setWonRun] = useState(false);
  const [endSummary, setEndSummary] = useState<string | undefined>(undefined);
  const [resetSignal, setResetSignal] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPlayMode(supportsMultiplayer ? initialMode : '1p');
    setStageState('PLAYING');
    setLiveScore(0);
    setEndSummary(undefined);
  }, [game.id, initialMode, supportsMultiplayer]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleModeChange = (nextMode: PlayMode) => {
    soundFX.playClick();
    setPlayMode(nextMode);
    setStageState('PLAYING');
    setLiveScore(0);
    setEndSummary(undefined);
    setResetSignal((prev) => prev + 1);
  };

  const handleGameEnd = (score: number, won: boolean, summaryText?: string) => {
    setFinalScore(score);
    setWonRun(won);
    setEndSummary(summaryText);
    setStageState('GAME_OVER');
    onSubmitScore(game.id, score);
  };

  const handleRestart = () => {
    soundFX.playClick();
    if (playMode === '2p-online' && multiplayer.room) {
      multiplayer.rematch();
      return;
    }
    setLiveScore(0);
    setEndSummary(undefined);
    setResetSignal((prev) => prev + 1);
    setStageState('PLAYING');
  };

  const handleToggleFullscreen = () => {
    if (!stageRef.current) return;
    if (!document.fullscreenElement) {
      stageRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const renderLocalEngine = () => {
    const commonProps = {
      game,
      playMode,
      onScoreUpdate: setLiveScore,
      onGameEnd: handleGameEnd,
      resetSignal,
    };

    switch (game.engine) {
      case 'astro-dodge':
        return <AstroDodgeGame {...commonProps} />;
      case 'neon-breaker':
        return <NeonBreakerGame {...commonProps} />;
      case 'orbit-stacker':
        return <OrbitStackerGame {...commonProps} />;
      case 'void-chess':
        return <VoidChessGame {...commonProps} />;
      case 'trump-duel':
        return <TrumpDuelGame {...commonProps} />;
      case 'hexa-pulse':
        return <HexaPulseGame {...commonProps} />;
      case 'word-hunt':
        return <WordHuntGame {...commonProps} />;
    }
  };

  const displayedBest = Math.max(personalBest, liveScore, finalScore);

  const twoPlayerControlsHint =
    game.engine === 'astro-dodge'
      ? 'P1 (Cyan): W / A / S / D · P2 (Coral): Arrow Keys'
      : game.engine === 'neon-breaker'
      ? 'P1 (Cyan): A / D · P2 (Coral): Left / Right Arrow Keys'
      : game.engine === 'orbit-stacker'
      ? 'P1 (Left Tower): W or Space · P2 (Right Tower): Up Arrow or Enter'
      : game.engine === 'void-chess'
      ? 'P1 White: WASD + Space (or Click) · P2 Black: Arrow Keys + Enter (or Click)'
      : 'P1: A / D + W (or Click) · P2: Left / Right + Up Arrow (or Click)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060e20]/90 p-3 sm:p-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-stage-title"
    >
      <div
        ref={stageRef}
        className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#131b2e] shadow-[0_24px_80px_rgba(0,0,0,0.65)] max-h-[94vh]"
      >
        {/* Top Stage Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-[#171f33] px-5 py-3.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-[#908fa0]">
              <span className="text-[#4cd7f6] font-medium">{game.category}</span>
              <span aria-hidden="true">·</span>
              <span>{game.subtitle}</span>
            </div>
            <h2
              id="game-stage-title"
              className="truncate font-display text-lg font-bold text-[#dae2fd]"
            >
              {game.title}
            </h2>
          </div>

          {supportsMultiplayer && (
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#0b1326] p-1">
              <button
                type="button"
                onClick={() => handleModeChange('1p')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  playMode === '1p'
                    ? 'bg-[#6366f1] text-white'
                    : 'text-[#c7c4d7] hover:text-white'
                }`}
              >
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                <span>1P Solo</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('2p-local')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  playMode === '2p-local'
                    ? 'bg-[#06b6d4] text-[#001f26] font-semibold'
                    : 'text-[#c7c4d7] hover:text-white'
                }`}
              >
                <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
                <span>2P Local</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('2p-online')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  playMode === '2p-online'
                    ? 'bg-[#6366f1] text-white'
                    : 'text-[#c7c4d7] hover:text-white'
                }`}
              >
                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Online Room</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-[11px] text-[#908fa0]">Best Score</span>
              <span className="font-mono text-sm font-semibold text-[#f59e0b] tabular-nums">
                {displayedBest.toLocaleString()} pts
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close game stage"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#222a3d] text-[#c7c4d7] hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {playMode === '2p-online' ? (
            multiplayer.room &&
            (multiplayer.room.status === 'PLAYING' ||
              multiplayer.room.status === 'FINISHED') ? (
              <OnlineRoomArena
                room={multiplayer.room}
                onSendInput={multiplayer.sendInput}
                onSendDrop={multiplayer.sendDrop}
                onSendChessMove={multiplayer.sendChessMove}
                onSendCardPlay={multiplayer.sendCardPlay}
                onRematch={multiplayer.rematch}
                onLeaveRoom={multiplayer.leaveRoom}
              />
            ) : (
              <MultiplayerLobbyPanel
                connected={multiplayer.connected}
                room={multiplayer.room}
                error={multiplayer.error}
                defaultGameId={game.id}
                initialJoinCode={multiplayer.initialJoinCode}
                onCreateRoom={multiplayer.createRoom}
                onJoinRoom={multiplayer.joinRoom}
                onLeaveRoom={multiplayer.leaveRoom}
                onSetReady={multiplayer.setReady}
                onSetGame={multiplayer.setGame}
                onStartMatch={multiplayer.startMatch}
                onClearError={multiplayer.clearError}
              />
            )
          ) : (
            <>
              {stageState === 'TITLE_MENU' && (
                <div className="grid gap-6 md:grid-cols-2 items-center rounded-xl border border-white/10 bg-[#0b1326] p-6">
                  <div className="overflow-hidden rounded-xl aspect-[16/9]">
                    <GameArtwork game={game} className="h-full w-full" />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-bold text-[#dae2fd]">
                      {game.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#c7c4d7]">
                      {game.description}
                    </p>
                    <div className="mt-4 rounded-xl bg-[#171f33] p-3.5 text-xs text-[#c7c4d7]">
                      <p className="font-semibold text-[#4cd7f6]">Controls</p>
                      <p className="mt-1">
                        {playMode === '2p-local' ? twoPlayerControlsHint : game.controlsHint}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playClick();
                        setStageState('PLAYING');
                      }}
                      className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#6366f1] px-5 py-2.5 font-display text-sm font-semibold text-white hover:bg-[#5558e8] cursor-pointer"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      <span>Start Game</span>
                    </button>
                  </div>
                </div>
              )}

              {stageState === 'PLAYING' && (
                <div>
                  {renderLocalEngine()}
                  <p className="mt-3 text-center text-xs text-[#908fa0]">
                    {playMode === '2p-local' ? twoPlayerControlsHint : game.controlsHint}
                  </p>
                </div>
              )}

              {stageState === 'GAME_OVER' && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0b1326] px-6 py-10 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6366f1]/20 text-[#f59e0b]">
                    <Trophy className="h-7 w-7" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-[#dae2fd]">
                    {endSummary
                      ? endSummary
                      : wonRun
                      ? 'Victory Achieved'
                      : 'Session Complete'}
                  </h3>
                  {!endSummary && (
                    <p className="mt-1.5 text-sm text-[#c7c4d7]">
                      {finalScore >= game.soloChallenge.targetScore
                        ? `Solo Challenge Cleared (${game.soloChallenge.targetScore} ${game.soloChallenge.unit} target met)`
                        : `Solo Target: ${game.soloChallenge.targetScore} ${game.soloChallenge.unit}`}
                    </p>
                  )}

                  <div className="mt-6 flex items-center gap-8 rounded-xl border border-white/[0.08] bg-[#171f33] px-8 py-4">
                    <div>
                      <div className="text-xs text-[#908fa0]">Top Score</div>
                      <div className="mt-1 font-mono text-2xl font-bold text-[#4cd7f6] tabular-nums">
                        {finalScore.toLocaleString()}
                      </div>
                    </div>
                    <div className="h-10 w-px bg-white/10" />
                    <div>
                      <div className="text-xs text-[#908fa0]">Personal Best</div>
                      <div className="mt-1 font-mono text-2xl font-bold text-[#f59e0b] tabular-nums">
                        {Math.max(personalBest, finalScore).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleRestart}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#6366f1] px-5 py-2.5 font-display text-sm font-semibold text-white hover:bg-[#5558e8] cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Play Again</span>
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#4cd7f6]/40 bg-transparent px-5 py-2.5 font-display text-sm font-semibold text-[#4cd7f6] hover:bg-[#4cd7f6]/10 cursor-pointer"
                    >
                      <span>Back to Hub</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick-Launch Floating Utility Dock */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] bg-[#171f33] px-5 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleMute}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#222a3d] px-3 py-2 text-xs font-medium text-[#dae2fd] hover:border-[#4cd7f6]/50 cursor-pointer whitespace-nowrap shrink-0"
            >
              {muted ? (
                <VolumeX className="h-3.5 w-3.5 text-[#ffb2b7]" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-[#4cd7f6]" />
              )}
              <span>{muted ? 'Unmute' : 'Sound On'}</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleFavorite(game.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#222a3d] px-3 py-2 text-xs font-medium text-[#dae2fd] hover:border-[#f43f5e]/50 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Heart
                className={`h-3.5 w-3.5 ${
                  isFavorite ? 'fill-[#f43f5e] text-[#f43f5e]' : 'text-[#c7c4d7]'
                }`}
              />
              <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {playMode !== '2p-online' && (
              <button
                type="button"
                onClick={handleRestart}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#222a3d] px-3 py-2 text-xs font-medium text-[#dae2fd] hover:border-[#4cd7f6]/50 cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restart</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#222a3d] px-3 py-2 text-xs font-medium text-[#dae2fd] hover:border-[#4cd7f6]/50 cursor-pointer whitespace-nowrap shrink-0"
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
              <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
