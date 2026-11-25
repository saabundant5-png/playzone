import React, { useState } from 'react';
import { Check, Copy, Link2, Play, Users } from 'lucide-react';
import { GAMES_CATALOG } from '../data/games';
import type { RoomSnapshot } from '../multiplayerTypes';

const ONLINE_GAMES = GAMES_CATALOG.filter(
  (g) =>
    g.engine === 'astro-dodge' ||
    g.engine === 'neon-breaker' ||
    g.engine === 'orbit-stacker' ||
    g.engine === 'void-chess' ||
    g.engine === 'trump-duel'
);

interface MultiplayerLobbyPanelProps {
  connected: boolean;
  room: RoomSnapshot | null;
  error: string | null;
  defaultGameId: string;
  initialJoinCode?: string;
  onCreateRoom: (gameId: string, playerName: string) => void;
  onJoinRoom: (code: string, playerName: string) => void;
  onLeaveRoom: () => void;
  onSetReady: (ready: boolean) => void;
  onSetGame: (gameId: string) => void;
  onStartMatch: () => void;
  onClearError: () => void;
}

export const MultiplayerLobbyPanel: React.FC<MultiplayerLobbyPanelProps> = ({
  connected,
  room,
  error,
  defaultGameId,
  initialJoinCode = '',
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onSetReady,
  onSetGame,
  onStartMatch,
  onClearError,
}) => {
  const validDefaultGame = ONLINE_GAMES.some((g) => g.id === defaultGameId)
    ? defaultGameId
    : ONLINE_GAMES[0].id;

  const [playerName, setPlayerName] = useState('PlayerOne');
  const [selectedGameId, setSelectedGameId] = useState(validDefaultGame);
  const [joinCode, setJoinCode] = useState(initialJoinCode.toUpperCase());
  const [copiedType, setCopiedType] = useState<'code' | 'link' | null>(null);

  const handleCopy = (text: string, kind: 'code' | 'link') => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedType(kind);
    setTimeout(() => setCopiedType(null), 1600);
  };

  if (room) {
    const isHost = room.yourSlot === 0;
    const me = room.players.find((p) => p.slot === room.yourSlot);
    const hasTwoPlayers = room.players.length >= 2;
    const roomGame = ONLINE_GAMES.find((g) => g.id === room.gameId) ?? ONLINE_GAMES[0];
    const inviteUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/?room=${room.code}`
        : `?room=${room.code}`;

    return (
      <div className="rounded-xl border border-white/10 bg-[#0b1326] p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div>
            <p className="text-xs font-medium text-[#4cd7f6]">Active Multiplayer Room</p>
            <div className="mt-1 flex items-center gap-3">
              <span className="font-mono text-2xl font-bold tracking-widest text-white">
                {room.code}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(room.code, 'code')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#171f33] px-2.5 py-1.5 text-xs font-medium text-[#dae2fd] hover:border-[#4cd7f6]/50 cursor-pointer"
              >
                {copiedType === 'code' ? (
                  <Check className="h-3.5 w-3.5 text-[#4cd7f6]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copiedType === 'code' ? 'Copied' : 'Copy Code'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy(inviteUrl, 'link')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#171f33] px-2.5 py-1.5 text-xs font-medium text-[#dae2fd] hover:border-[#4cd7f6]/50 cursor-pointer"
              >
                {copiedType === 'link' ? (
                  <Check className="h-3.5 w-3.5 text-[#4cd7f6]" />
                ) : (
                  <Link2 className="h-3.5 w-3.5" />
                )}
                <span>{copiedType === 'link' ? 'Link Copied' : 'Invite Link'}</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onLeaveRoom}
            className="rounded-lg border border-white/10 bg-[#171f33] px-3.5 py-2 text-xs font-medium text-[#c7c4d7] hover:text-white cursor-pointer"
          >
            Leave Room
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-[#f43f5e]/40 bg-[#f43f5e]/15 px-4 py-2.5 text-xs text-[#ffb2b7]">
            {error}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {/* Players List */}
          <div className="rounded-xl border border-white/[0.08] bg-[#131b2e] p-4 space-y-3">
            <h4 className="flex items-center gap-2 font-display text-sm font-semibold text-[#dae2fd]">
              <Users className="h-4 w-4 text-[#4cd7f6]" />
              <span>Players ({room.players.length}/2)</span>
            </h4>

            {[0, 1].map((slotIdx) => {
              const p = room.players.find((pl) => pl.slot === slotIdx);
              return (
                <div
                  key={slotIdx}
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#171f33] px-3.5 py-2.5 text-sm"
                >
                  <div>
                    <span
                      className={`font-display font-semibold ${
                        slotIdx === 0 ? 'text-[#4cd7f6]' : 'text-[#ffb2b7]'
                      }`}
                    >
                      {p ? p.name : `Waiting for Player ${slotIdx + 1}...`}
                    </span>
                    {p && p.slot === room.yourSlot && (
                      <span className="ml-2 text-xs text-[#908fa0]">(You)</span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-[#c7c4d7]">
                    {p ? (p.ready ? 'Ready' : 'In Lobby') : 'Empty Slot'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Match Configuration */}
          <div className="rounded-xl border border-white/[0.08] bg-[#131b2e] p-4 flex flex-col justify-between space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#908fa0]">
                Selected Game
              </label>
              {isHost ? (
                <select
                  value={room.gameId}
                  onChange={(e) => onSetGame(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#171f33] px-3 py-2 text-sm text-[#dae2fd] focus:border-[#4cd7f6] focus:outline-none cursor-pointer"
                >
                  {ONLINE_GAMES.map((g) => (
                    <option key={g.id} value={g.id} className="bg-[#171f33]">
                      {g.title} ({g.category})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-1.5 rounded-lg border border-white/10 bg-[#171f33] px-3 py-2 text-sm font-medium text-[#dae2fd]">
                  {roomGame.title} ({roomGame.category})
                </div>
              )}
              <p className="mt-2 text-xs text-[#908fa0]">
                Share room code <strong className="font-mono text-[#dae2fd]">{room.code}</strong> or
                open the Invite Link in another browser tab to test live 2-player play.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onSetReady(!me?.ready)}
                className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  me?.ready
                    ? 'border-[#4cd7f6] bg-[#06b6d4]/20 text-[#4cd7f6]'
                    : 'border-white/15 bg-[#171f33] text-[#dae2fd] hover:border-[#4cd7f6]/50'
                }`}
              >
                {me?.ready ? 'Ready ✓' : 'Mark Ready'}
              </button>

              {isHost ? (
                <button
                  type="button"
                  disabled={!hasTwoPlayers}
                  onClick={onStartMatch}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 font-display text-xs font-semibold text-white hover:bg-[#5558e8] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>{hasTwoPlayers ? 'Start Online Match' : 'Waiting for Player 2'}</span>
                </button>
              ) : (
                <span className="text-xs text-[#908fa0]">
                  Host will start the match once ready.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0b1326] p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-bold text-[#dae2fd]">
            Online Room-Code Multiplayer
          </h3>
          <p className="text-xs text-[#908fa0]">
            Create a private 2-player room or enter a 6-character code to join an opponent.
          </p>
        </div>
        <span className="text-xs font-medium text-[#4cd7f6]">
          {connected ? 'Server Ready' : 'Connecting...'}
        </span>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#f43f5e]/40 bg-[#f43f5e]/15 px-4 py-2.5 text-xs text-[#ffb2b7]">
          <span>{error}</span>
          <button
            type="button"
            onClick={onClearError}
            className="font-semibold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-[#c7c4d7]">
          Your Display Name
        </label>
        <input
          type="text"
          maxLength={18}
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter nickname..."
          className="mt-1.5 w-full max-w-xs rounded-lg border border-white/10 bg-[#171f33] px-3.5 py-2 text-sm text-[#dae2fd] placeholder-[#908fa0] focus:border-[#4cd7f6] focus:outline-none"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Create Room */}
        <div className="rounded-xl border border-white/[0.08] bg-[#131b2e] p-4 space-y-3">
          <h4 className="font-display text-sm font-semibold text-[#dae2fd]">
            Create a New Room
          </h4>
          <select
            value={selectedGameId}
            onChange={(e) => setSelectedGameId(e.target.value)}
            aria-label="Select multiplayer game"
            className="w-full rounded-lg border border-white/10 bg-[#171f33] px-3 py-2 text-sm text-[#dae2fd] focus:border-[#4cd7f6] focus:outline-none cursor-pointer"
          >
            {ONLINE_GAMES.map((g) => (
              <option key={g.id} value={g.id} className="bg-[#171f33]">
                {g.title} ({g.category})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onCreateRoom(selectedGameId, playerName)}
            className="w-full rounded-lg bg-[#6366f1] px-4 py-2.5 font-display text-sm font-semibold text-white hover:bg-[#5558e8] cursor-pointer"
          >
            Create Room Code
          </button>
        </div>

        {/* Join Room */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (joinCode.trim().length >= 4) {
              onJoinRoom(joinCode.trim(), playerName);
            }
          }}
          className="rounded-xl border border-white/[0.08] bg-[#131b2e] p-4 space-y-3"
        >
          <h4 className="font-display text-sm font-semibold text-[#dae2fd]">
            Join with Room Code
          </h4>
          <input
            type="text"
            maxLength={6}
            value={joinCode}
            onChange={(e) =>
              setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
            }
            placeholder="e.g. K7M9PQ"
            aria-label="Room code"
            className="w-full rounded-lg border border-white/10 bg-[#171f33] px-3.5 py-2 font-mono text-sm uppercase tracking-widest text-[#dae2fd] placeholder-[#908fa0] focus:border-[#4cd7f6] focus:outline-none"
          />
          <button
            type="submit"
            disabled={joinCode.trim().length < 4}
            className="w-full rounded-lg border border-[#4cd7f6]/50 bg-[#06b6d4]/15 px-4 py-2.5 font-display text-sm font-semibold text-[#4cd7f6] hover:bg-[#06b6d4]/25 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
};
