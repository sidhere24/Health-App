import { Download, Menu, Type } from 'lucide-react';
import type { TextSizeMode } from '../types/nutrition';
import { PWAInstallButton } from './PWAInstallButton';
import type { ActiveTab } from './SidebarNav';

interface TopBarProps {
  activeTab: ActiveTab;
  textSize: TextSizeMode;
  onToggleTextSize: () => void;
  onOpenMobileMenu: () => void;
  onExportGroceryCsv: () => void;
}

const TAB_TITLES: Record<ActiveTab, string> = {
  overview: 'Daily Tracker',
  weekly: 'Next & Weekly Prep',
  grocery: 'Grocery List',
  labs: 'Lab Tests & AI',
  foods: 'Food Index',
};

export function TopBar({
  activeTab,
  textSize,
  onToggleTextSize,
  onOpenMobileMenu,
  onExportGroceryCsv,
}: TopBarProps) {
  const isLarge = textSize === 'large';

  return (
    <header className="sticky top-0 z-30 h-14 lg:h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation and profile menu"
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="hidden sm:inline font-display font-semibold text-slate-500 whitespace-nowrap shrink-0">
            HydraPrep
          </span>
          <span className="hidden sm:inline text-slate-300" aria-hidden="true">
            /
          </span>
          <h1 className="font-display text-base font-semibold text-slate-900 truncate">
            {TAB_TITLES[activeTab]}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <PWAInstallButton />

        <button
          type="button"
          onClick={onToggleTextSize}
          aria-pressed={isLarge}
          aria-label={isLarge ? 'Switch to standard text size' : 'Switch to larger comfortable text size'}
          title="Toggle larger, easier-to-read text"
          className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
            isLarge
              ? 'bg-teal-50 text-teal-900 border-teal-300'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Type className="w-3.5 h-3.5 text-teal-700" />
          <span className="hidden sm:inline">{isLarge ? 'Large Text: On' : 'Large Text'}</span>
          <span className="sm:hidden">{isLarge ? 'A+' : 'Aa'}</span>
        </button>

        <button
          type="button"
          onClick={onExportGroceryCsv}
          className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 min-h-[40px] text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export Prep CSV</span>
          <span className="sm:hidden">CSV</span>
        </button>
      </div>
    </header>
  );
}
