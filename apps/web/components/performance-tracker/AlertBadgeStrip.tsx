import React from 'react';

interface AlertBadge {
  label: string;
  count: number;
  color: string;
  onClick?: () => void;
  active?: boolean;
}

interface AlertBadgeStripProps {
  badges: AlertBadge[];
}

export default function AlertBadgeStrip({ badges }: AlertBadgeStripProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {badges.map((badge, index) => (
        <button
          key={index}
          onClick={badge.onClick}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all
            flex items-center gap-2
            ${badge.active
              ? 'ring-2 ring-offset-2 ring-gray-900'
              : 'hover:shadow-md'
            }
          `}
          style={{
            backgroundColor: badge.color + '20',
            borderLeft: `4px solid ${badge.color}`,
          }}
        >
          <span className="text-sm text-gray-700">{badge.label}</span>
          <span
            className="text-lg font-bold rounded-full px-2 py-0.5 min-w-[2rem] text-center"
            style={{
              backgroundColor: badge.color,
              color: 'white'
            }}
          >
            {badge.count}
          </span>
        </button>
      ))}
    </div>
  );
}
