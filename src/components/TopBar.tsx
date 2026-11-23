import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { AppSection } from '../types/compendium';

interface TopBarProps {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
  onQuickExport: () => void;
}

const NAV_ITEMS: Array<{ id: AppSection; label: string }> = [
  { id: 'lectures', label: 'Лекции' },
  { id: 'figures', label: 'Персоналии' },
  { id: 'chronology', label: 'Хронология' },
  { id: 'docs', label: 'Google Docs' },
];

export function TopBar({
  activeSection,
  onNavigate,
  onQuickExport,
}: TopBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelect = (section: AppSection) => {
    onNavigate(section);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FBF9F5] border-b border-[#E6DFD3]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 h-15 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element editorial wordmark */}
        <button
          type="button"
          onClick={() => handleSelect('lectures')}
          className="font-editorial text-2xl font-semibold tracking-tight text-[#1C1917] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E3A8A] cursor-pointer"
        >
          Словесность XIX
        </button>

        {/* Zone 2: 4 clean single-line text links */}
        <nav
          aria-label="Основная навигация"
          className="hidden md:flex items-center gap-7"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`py-1 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer border-b ${
                  isActive
                    ? 'text-[#1E3A8A] border-[#1E3A8A]'
                    : 'text-[#57534E] border-transparent hover:text-[#1C1917] hover:border-[#D6CEBE]'
                } focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1E3A8A]`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action + mobile menu button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onQuickExport}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
          >
            Экспорт в Docs
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Закрыть меню навигации' : 'Открыть меню навигации'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden p-2.5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-[#1C1917] hover:bg-[#F2EDE4] rounded-md transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          aria-label="Мобильная навигация"
          className="md:hidden border-t border-[#E6DFD3] bg-[#FBF9F5] px-4 py-3 flex flex-col gap-1"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full text-left px-3 py-2.5 min-h-[44px] text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-[#F2EDE4] text-[#1E3A8A]'
                    : 'text-[#57534E] hover:bg-[#F2EDE4]/60 hover:text-[#1C1917]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
