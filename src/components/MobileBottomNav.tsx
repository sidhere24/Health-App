import { CalendarDays, CheckSquare, Leaf, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import type { ActiveTab } from './SidebarNav';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenProfileDrawer: () => void;
}

const TABS: Array<{ id: ActiveTab; label: string; icon: typeof CheckSquare }> = [
  { id: 'overview', label: 'Today', icon: CheckSquare },
  { id: 'weekly', label: 'Week', icon: CalendarDays },
  { id: 'grocery', label: 'Grocery', icon: ShoppingBag },
  { id: 'foods', label: 'Foods', icon: Leaf },
];

export function MobileBottomNav({
  activeTab,
  onSelectTab,
  onOpenProfileDrawer,
}: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 grid grid-cols-5 items-center px-1"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-col items-center justify-center min-h-[48px] rounded-lg transition-colors ${
              active ? 'text-teal-700 dark:text-teal-200 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? 'text-teal-700' : 'text-slate-500'}`} />
            <span className="text-[11px] tracking-tight mt-0.5 leading-none text-slate-500 dark:text-slate-400">{tab.label}</span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={onOpenProfileDrawer}
        aria-label="Open Profile, Region & Affiliate Settings"
        className="flex flex-col items-center justify-center min-h-[48px] rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
      >
        <SlidersHorizontal className="w-5 h-5 text-slate-500" />
        <span className="text-[11px] tracking-tight mt-0.5 leading-none">Profile</span>
      </button>
    </nav>
  );
}
