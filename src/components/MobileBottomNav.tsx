import { CalendarDays, CheckSquare, FlaskConical, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import type { ActiveTab } from './SidebarNav';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenProfileDrawer: () => void;
}

const TABS: Array<{ id: ActiveTab; label: string; icon: typeof CheckSquare }> = [
  { id: 'overview', label: 'Today', icon: CheckSquare },
  { id: 'weekly', label: 'Next Week', icon: CalendarDays },
  { id: 'grocery', label: 'Grocery List', icon: ShoppingBag },
  { id: 'labs', label: 'Lab Tests AI', icon: FlaskConical },
];

export function MobileBottomNav({
  activeTab,
  onSelectTab,
  onOpenProfileDrawer,
}: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 items-center px-1"
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
              active ? 'text-teal-700 font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? 'text-teal-700' : 'text-slate-500'}`} />
            <span className="text-[11px] tracking-tight mt-0.5 leading-none whitespace-nowrap">
              {tab.label}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={onOpenProfileDrawer}
        aria-label="Open Food Index, Profile and Settings"
        className={`flex flex-col items-center justify-center min-h-[48px] rounded-lg transition-colors ${
          activeTab === 'foods' ? 'text-teal-700 font-semibold' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <SlidersHorizontal
          className={`w-5 h-5 ${activeTab === 'foods' ? 'text-teal-700' : 'text-slate-500'}`}
        />
        <span className="text-[11px] tracking-tight mt-0.5 leading-none whitespace-nowrap">
          More
        </span>
      </button>
    </nav>
  );
}
