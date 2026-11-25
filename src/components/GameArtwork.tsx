import React from 'react';
import { GameItem } from '../types';

interface GameArtworkProps {
  game: GameItem;
  className?: string;
}

export const GameArtwork: React.FC<GameArtworkProps> = ({ game, className = '' }) => {
  const accent = game.variantConfig?.accentHex ?? '#4cd7f6';
  const secondary = game.variantConfig?.secondaryHex ?? '#6366f1';

  return (
    <div
      className={`relative overflow-hidden bg-[#060e20] select-none ${className}`}
      aria-hidden="true"
    >
      {/* Subtle radial atmosphere */}
      <div
        className="absolute inset-0 opacity-35"
        style={{
          background: `radial-gradient(circle at 75% 25%, ${accent}33 0%, transparent 55%), radial-gradient(circle at 20% 80%, ${secondary}33 0%, transparent 60%)`,
        }}
      />

      {game.engine === 'astro-dodge' && (
        <svg viewBox="0 0 320 180" className="w-full h-full">
          <defs>
            <linearGradient id={`grad-${game.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={accent} />
              <stop offset="100%" stopColor={secondary} />
            </linearGradient>
          </defs>
          {/* Starfield */}
          <circle cx="38" cy="30" r="1.5" fill="#dae2fd" opacity="0.5" />
          <circle cx="95" cy="52" r="1" fill="#dae2fd" opacity="0.7" />
          <circle cx="240" cy="36" r="1.5" fill={accent} opacity="0.8" />
          <circle cx="285" cy="95" r="1" fill="#dae2fd" opacity="0.5" />
          <circle cx="52" cy="142" r="1.5" fill={secondary} opacity="0.6" />
          {/* Speed lanes */}
          <line x1="70" y1="0" x2="70" y2="180" stroke="#ffffff" strokeOpacity="0.06" strokeDasharray="6 6" />
          <line x1="160" y1="0" x2="160" y2="180" stroke="#ffffff" strokeOpacity="0.08" strokeDasharray="6 6" />
          <line x1="250" y1="0" x2="250" y2="180" stroke="#ffffff" strokeOpacity="0.06" strokeDasharray="6 6" />
          {/* Asteroids */}
          <polygon points="82,42 98,35 110,49 101,64 84,60" fill="#222a3d" stroke={secondary} strokeWidth="2" />
          <polygon points="222,74 242,66 254,84 238,98 220,90" fill="#222a3d" stroke="#f43f5e" strokeWidth="2" />
          <circle cx="122" cy="112" r="8" fill="#f59e0b" opacity="0.85" />
          {/* Ship */}
          <path d="M160 112 L178 150 L160 142 L142 150 Z" fill={`url(#grad-${game.id})`} />
          <line x1="160" y1="146" x2="160" y2="170" stroke={accent} strokeWidth="3" strokeLinecap="round" opacity="0.8" />
        </svg>
      )}

      {game.engine === 'neon-breaker' && (
        <svg viewBox="0 0 320 180" className="w-full h-full">
          {/* Brick rows */}
          {[0, 1, 2].map((row) =>
            [0, 1, 2, 3, 4].map((col) => {
              if (row === 2 && (col === 1 || col === 3)) return null;
              const fill = row === 0 ? secondary : row === 1 ? accent : '#f59e0b';
              return (
                <rect
                  key={`${row}-${col}`}
                  x={28 + col * 54}
                  y={24 + row * 20}
                  width="46"
                  height="13"
                  rx="3"
                  fill={fill}
                  fillOpacity={0.85}
                />
              );
            })
          )}
          {/* Ball trail & ball */}
          <line x1="115" y1="140" x2="182" y2="88" stroke={accent} strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
          <circle cx="184" cy="86" r="7" fill="#ffffff" />
          {/* Paddle */}
          <rect x="112" y="148" width="96" height="10" rx="5" fill={accent} />
        </svg>
      )}

      {game.engine === 'void-chess' && (
        <svg viewBox="0 0 320 180" className="w-full h-full">
          <g transform="translate(88, 18)">
            {[0, 1, 2, 3].map((r) =>
              [0, 1, 2, 3].map((c) => (
                <rect
                  key={`${r}-${c}`}
                  x={c * 36}
                  y={r * 36}
                  width="36"
                  height="36"
                  fill={(r + c) % 2 === 0 ? '#1e293b' : '#0f172a'}
                  stroke="#ffffff"
                  strokeOpacity="0.06"
                />
              ))
            )}
            {/* Legal move highlight */}
            <rect x="72" y="36" width="36" height="36" fill={secondary} fillOpacity="0.25" stroke={secondary} strokeWidth="1.5" />
            <circle cx="90" cy="54" r="5" fill={secondary} />
            {/* Pieces */}
            <text x="18" y="27" textAnchor="middle" fontSize="22" fill="#f43f5e">♛</text>
            <text x="126" y="27" textAnchor="middle" fontSize="22" fill="#94a3b8">♚</text>
            <text x="54" y="135" textAnchor="middle" fontSize="22" fill="#dae2fd">♘</text>
            <text x="90" y="99" textAnchor="middle" fontSize="22" fill={accent}>♕</text>
          </g>
        </svg>
      )}

      {game.engine === 'trump-duel' && (
        <svg viewBox="0 0 320 180" className="w-full h-full">
          {/* Felt subtle ellipse */}
          <ellipse cx="160" cy="94" rx="126" ry="66" fill="#0f5132" fillOpacity="0.35" stroke={accent} strokeOpacity="0.3" strokeWidth="1.5" />
          {/* Left card */}
          <g transform="translate(88, 40) rotate(-10)">
            <rect width="58" height="82" rx="8" fill="#f8fafc" />
            <text x="10" y="22" fontSize="14" fontWeight="700" fill="#dc2626">A</text>
            <text x="29" y="54" textAnchor="middle" fontSize="28" fill="#dc2626">♥</text>
          </g>
          {/* Right card */}
          <g transform="translate(174, 34) rotate(8)">
            <rect width="58" height="82" rx="8" fill="#f8fafc" />
            <text x="10" y="22" fontSize="14" fontWeight="700" fill="#0f172a">K</text>
            <text x="29" y="54" textAnchor="middle" fontSize="28" fill="#0f172a">♠</text>
          </g>
        </svg>
      )}

      {game.engine === 'word-hunt' && (
        <svg viewBox="0 0 320 180" className="w-full h-full">
          <g transform="translate(64, 22)">
            {[
              ['P', 'L', 'A', 'Y', 'Z', 'O'],
              ['C', 'N', 'E', 'O', 'N', 'R'],
              ['Q', 'U', 'A', 'R', 'K', 'B'],
              ['V', 'O', 'I', 'D', 'X', 'I'],
            ].map((row, r) =>
              row.map((letter, c) => {
                const isHighlighted = r === 0 && c < 4;
                return (
                  <g key={`${r}-${c}`} transform={`translate(${c * 32}, ${r * 34})`}>
                    <rect
                      width="28"
                      height="28"
                      rx="6"
                      fill={isHighlighted ? accent : '#171f33'}
                      fillOpacity={isHighlighted ? 0.28 : 1}
                      stroke={isHighlighted ? accent : '#2d3449'}
                      strokeWidth="1.2"
                    />
                    <text
                      x="14"
                      y="19"
                      textAnchor="middle"
                      fontSize="13"
                      fontWeight="700"
                      fill={isHighlighted ? '#ffffff' : '#c7c4d7'}
                    >
                      {letter}
                    </text>
                  </g>
                );
              })
            )}
          </g>
        </svg>
      )}

      {game.engine === 'hexa-pulse' && (
        <svg viewBox="0 0 320 180" className="w-full h-full">
          <g transform="translate(92, 22)">
            {[0, 1, 2, 3].map((r) =>
              [0, 1, 2, 3].map((c) => {
                const active = (r + c) % 2 === 0 || (r === 1 && c === 2);
                return (
                  <rect
                    key={`${r}-${c}`}
                    x={c * 34}
                    y={r * 34}
                    width="28"
                    height="28"
                    rx="6"
                    fill={active ? accent : '#1e293b'}
                    fillOpacity={active ? 0.85 : 0.9}
                    stroke={active ? '#ffffff' : '#31394d'}
                    strokeOpacity={active ? 0.45 : 1}
                  />
                );
              })
            )}
          </g>
        </svg>
      )}

      {game.engine === 'orbit-stacker' && (
        <svg viewBox="0 0 320 180" className="w-full h-full">
          <rect x="85" y="136" width="150" height="16" rx="4" fill={secondary} fillOpacity="0.9" />
          <rect x="96" y="116" width="128" height="16" rx="4" fill={accent} fillOpacity="0.9" />
          <rect x="106" y="96" width="108" height="16" rx="4" fill={secondary} fillOpacity="0.95" />
          <rect x="114" y="76" width="92" height="16" rx="4" fill={accent} />
          {/* Moving slab */}
          <rect x="144" y="42" width="92" height="16" rx="4" fill="#ffffff" fillOpacity="0.92" />
          <line x1="144" y1="50" x2="114" y2="50" stroke={accent} strokeDasharray="4 4" strokeWidth="1.5" />
        </svg>
      )}

      {/* Subtle bottom contrast gradient for clean framing */}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#171f33] to-transparent pointer-events-none" />
    </div>
  );
};
