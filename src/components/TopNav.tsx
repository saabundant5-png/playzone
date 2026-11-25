import React from 'react';
import { Play } from 'lucide-react';
import { ScreenPath } from '../types';

interface TopNavProps {
  currentScreen: ScreenPath;
  onNavigate: (screen: ScreenPath) => void;
  onQuickPlay: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentScreen,
  onNavigate,
  onQuickPlay,
}) => {
  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    target: ScreenPath
  ) => {
    e.preventDefault();
    onNavigate(target);
  };

  const navItems: { path: ScreenPath; label: string }[] = [
    { path: 'home', label: 'Home' },
    { path: 'single-player', label: 'Single Player' },
    { path: 'all-games', label: 'All Games' },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0b1326]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-4 py-3.5 sm:gap-8 sm:px-8">
        {/* Zone 1: Single text element Brand Zone */}
        <a
          href="#home"
          onClick={(e) => handleLinkClick(e, 'home')}
          className="font-display text-xl font-bold tracking-tight text-[#dae2fd] whitespace-nowrap shrink-0 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6] rounded"
        >
          PlayZone
        </a>

        {/* Zone 2: Clean single-line text navigation links with exact data-path attributes */}
        <nav
          aria-label="Primary Navigation"
          className="flex items-center gap-5 sm:gap-8"
        >
          {navItems.map((item) => {
            const isActive = currentScreen === item.path;
            return (
              <a
                key={item.path}
                href={`#${item.path}`}
                data-path={item.path}
                aria-current={isActive ? 'page' : undefined}
                onClick={(e) => handleLinkClick(e, item.path)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6] rounded ${
                  isActive
                    ? 'text-[#4cd7f6]'
                    : 'text-[#c7c4d7] hover:text-[#dae2fd]'
                }`}
              >
                {item.label}
                <span
                  className={`absolute inset-x-0 -bottom-[1px] h-0.5 rounded-full transition-opacity duration-150 ${
                    isActive ? 'bg-[#4cd7f6] opacity-100' : 'opacity-0'
                  }`}
                />
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onQuickPlay}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 font-display text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:bg-[#5558e8] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4cd7f6]"
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span>Quick Play</span>
          </button>
        </div>
      </div>
    </header>
  );
};
