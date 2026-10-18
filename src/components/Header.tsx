import React from 'react';

export type ActiveTab = 'studio' | 'saved' | 'sessions' | 'farhang';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  savedCount: number;
  sessionsCount: number;
  onNewComposition: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  savedCount,
  sessionsCount,
  onNewComposition,
}) => {
  const navItems: { id: ActiveTab; label: string; shortLabel: string; count?: number }[] = [
    { id: 'studio', label: 'Studio', shortLabel: 'Studio' },
    { id: 'saved', label: 'Saved Diwan', shortLabel: 'Diwan', count: savedCount },
    { id: 'sessions', label: 'Sessions', shortLabel: 'Sessions', count: sessionsCount },
    { id: 'farhang', label: 'Farhang & Craft', shortLabel: 'Farhang' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#0B070E]/95 backdrop-blur-md border-b border-[#D4AF6A]/15">
      <div className="max-w-[1380px] mx-auto px-3 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-8">
        {/* Zone 1: Brand Title (Single text element, one line) */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('studio');
          }}
          className="font-display text-lg sm:text-[26px] font-semibold tracking-tight text-[#F5EFE6] hover:text-[#D4AF6A] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF6A]"
        >
          Sukhan AI
        </a>

        {/* Zone 2: 4 Single-line Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className="flex items-center gap-2.5 sm:gap-7"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-1.5 text-[11px] sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF6A] ${
                  isActive
                    ? 'text-[#D4AF6A]'
                    : 'text-[#C8BDB0] hover:text-[#F5EFE6]'
                }`}
              >
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.shortLabel}</span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className="ml-1 font-mono-tabular text-[10px] sm:text-[11px] text-[#8E8276]">
                    ({item.count})
                  </span>
                )}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#D4AF6A]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onNewComposition}
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-[#0B070E] bg-[#D4AF6A] hover:bg-[#E5C687] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5EFE6]"
          >
            <span className="hidden sm:inline">New Composition</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>
    </header>
  );
};
