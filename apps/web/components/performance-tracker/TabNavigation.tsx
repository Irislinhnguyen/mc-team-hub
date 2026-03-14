import React from 'react';

interface Tab {
  id: string;
  label: string;
  count?: number;
  color?: string; // Tier-specific color for active tab underline
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="border-b mb-8 ml-6" style={{ borderColor: '#e5e7eb' }}>
      <nav className="flex gap-6 -mb-px" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                px-2 py-3 font-medium text-sm transition-all
                border-b-2 whitespace-nowrap
                ${isActive
                  ? 'text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }
              `}
              style={isActive && tab.color ? {
                borderBottomColor: tab.color,
                borderBottomWidth: '3px'
              } : undefined}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 text-gray-500">
                  ({tab.count})
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
