'use client';

import { useState, useCallback } from 'react';
import { ChallengeQuestion } from '@/lib/types/challenge';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Check } from 'lucide-react';

interface DragDropQuestionProps {
  question: ChallengeQuestion;
  value?: Record<string, string>; // zone_id -> item_id
  onChange: (value: Record<string, string>) => void;
  readOnly?: boolean;
  showResult?: boolean;
}

interface DragDropOptions {
  type: 'drag_drop';
  items: Array<{
    id: string;
    content: string;
    image_url?: string;
  }>;
  dropZones: Array<{
    id: string;
    label?: string;
    correct_item_ids: string[];
    image_url?: string;
  }>;
  allow_multiple_items_per_zone?: boolean;
}

interface DragItem {
  id: string;
  content: string;
  zoneId: string | null;
}

export function DragDropQuestion({
  question,
  value = {},
  onChange,
  readOnly = false,
  showResult = false,
}: DragDropQuestionProps) {
  const options = question.options as DragDropOptions;

  // State for drag items
  const [items, setItems] = useState<DragItem[]>(() => {
    // Initialize items from value or put all items in "unplaced" state
    const placedZones = new Set(Object.keys(value));
    const placedItemIds = new Set(Object.values(value).filter(Boolean));

    const initialItems: DragItem[] = options.items.map((item) => ({
      id: item.id,
      content: item.content,
      zoneId: value[Object.keys(value).find((zoneId) => value[zoneId] === item.id)] || null,
    }));

    return initialItems;
  });

  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // Get items for each zone
  const getZoneItems = (zoneId: string | null) => {
    return items.filter((item) => item.zoneId === zoneId);
  };

  // Handle drag start
  const handleDragStart = useCallback((itemId: string) => {
    if (readOnly) return;
    setDraggedItem(itemId);
  }, [readOnly]);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
  }, [readOnly]);

  // Handle drop on zone
  const handleDropOnZone = useCallback(
    (zoneId: string | null, e: React.DragEvent) => {
      if (readOnly || !draggedItem) return;

      e.preventDefault();
      setItems((prev) => {
        const newItems = [...prev];
        const itemIndex = newItems.findIndex((item) => item.id === draggedItem);

        if (itemIndex >= 0) {
          // If dropping on same zone, do nothing
          if (newItems[itemIndex].zoneId === zoneId) return prev;

          // Update item's zone
          newItems[itemIndex] = { ...newItems[itemIndex], zoneId };
        }

        return newItems;
      });

      setDraggedItem(null);
    },
    [draggedItem, readOnly]
  );

  // Sync with parent
  const syncWithParent = useCallback(() => {
    const zoneMap: Record<string, string> = {};
    items.forEach((item) => {
      if (item.zoneId) {
        zoneMap[item.zoneId] = item.id;
      }
    });
    onChange(zoneMap);
  }, [items, onChange]);

  // Update parent when items change
  useState(() => {
    syncWithParent();
  });

  // Check if answer is correct (for showing results)
  const isCorrect = useCallback(
    (zoneId: string, itemId: string) => {
      const zone = options.dropZones.find((z) => z.id === zoneId);
      return zone?.correct_item_ids.includes(itemId) || false;
    },
    [options.dropZones]
  );

  return (
    <div className="space-y-4">
      {/* Unplaced Items */}
      {!readOnly && (
        <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 min-h-[80px]">
          <p className="text-sm text-gray-500 mb-3">Drag items from here:</p>
          <div className="flex flex-wrap gap-2">
            {getZoneItems(null).map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(item.id)}
                className="cursor-move"
              >
                <DraggableItem content={item.content} isDragging={draggedItem === item.id} />
              </div>
            ))}
            {getZoneItems(null).length === 0 && (
              <p className="text-sm text-gray-400 italic">All items have been placed</p>
            )}
          </div>
        </div>
      )}

      {/* Drop Zones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.dropZones.map((zone) => {
          const zoneItems = getZoneItems(zone.id);
          const itemCount = zoneItems.length;

          return (
            <div
              key={zone.id}
              onDrop={(e) => handleDropOnZone(zone.id, e)}
              onDragOver={handleDragOver}
              className={`
                relative p-4 rounded-lg border-2 transition-all min-h-[120px]
                ${readOnly ? 'border-gray-300 bg-gray-50' : 'border-dashed border-blue-300 bg-blue-50/30'}
                ${draggedItem ? 'border-blue-400 bg-blue-100/50' : ''}
              `}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-700">{zone.label || `Zone ${zone.id}`}</span>
                <Badge variant="outline" className="text-xs">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {zoneItems.map((item) => (
                  <div
                    key={item.id}
                    draggable={!readOnly}
                    onDragStart={() => handleDragStart(item.id)}
                    onDrop={(e) => {
                      e.stopPropagation();
                      handleDropOnZone(null, e);
                    }}
                    onDragOver={handleDragOver}
                    className="cursor-move"
                  >
                    <DraggableItem
                      content={item.content}
                      isDragging={draggedItem === item.id}
                      isCorrect={showResult ? isCorrect(zone.id, item.id) : undefined}
                      showResult={showResult}
                    />
                  </div>
                ))}
                {itemCount === 0 && (
                  <p className="text-sm text-gray-400 italic w-full text-center py-4">
                    {readOnly ? 'No items placed' : 'Drop items here'}
                  </p>
                )}
              </div>

              {showResult && itemCount > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  {zoneItems.every((item) => isCorrect(zone.id, item.id)) ? (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      All correct!
                    </p>
                  ) : (
                    <p className="text-sm text-amber-600">
                      {zoneItems.filter((item) => isCorrect(zone.id, item.id)).length} / {itemCount} correct
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {readOnly && (
        <div className="flex justify-center gap-2 mt-4">
          {getZoneItems(null).map((item) => (
            <div
              key={item.id}
              className="p-2 bg-gray-100 rounded text-sm text-gray-600"
            >
              {item.content}
            </div>
          ))}
          {getZoneItems(null).length === 0 && (
            <p className="text-sm text-gray-500">All items have been placed</p>
          )}
        </div>
      )}
    </div>
  );
}

// Draggable Item Component
function DraggableItem({
  content,
  isDragging = false,
  isCorrect,
  showResult = false,
}: {
  content: string;
  isDragging?: boolean;
  isCorrect?: boolean;
  showResult?: boolean;
}) {
  return (
    <div
      className={`
        px-4 py-2 rounded-lg shadow-sm border-2 transition-all
        flex items-center gap-2
        ${isDragging ? 'opacity-50 scale-105' : 'opacity-100'}
        ${
          showResult
            ? isCorrect === true
              ? 'border-green-500 bg-green-50'
              : isCorrect === false
              ? 'border-red-500 bg-red-50'
              : 'border-gray-300 bg-white'
            : 'border-blue-300 bg-white hover:border-blue-400 hover:shadow-md'
        }
      `}
    >
      <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <span className="text-sm font-medium">{content}</span>
      {showResult && isCorrect === true && <Check className="w-4 h-4 text-green-600" />}
    </div>
  );
}
