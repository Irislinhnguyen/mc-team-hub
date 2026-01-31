'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type {
  QuestionType,
  QuestionOptions,
  CreateQuestionRequest,
  ClozeGap,
  DraggableItem,
  DropZone,
} from '@/lib/types/challenge';

interface QuestionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  challengeName: string;
  onSaveSuccess: () => void;
}

export function QuestionFormDialog({
  open,
  onOpenChange,
  challengeId,
  challengeName,
  onSaveSuccess,
}: QuestionFormDialogProps) {
  const [questionType, setQuestionType] = useState<QuestionType>('essay');
  const [questionText, setQuestionText] = useState('');
  const [points, setPoints] = useState(1);

  // Cloze-specific state
  const [gaps, setGaps] = useState<ClozeGap[]>([]);

  // Drag-drop specific state
  const [items, setItems] = useState<DraggableItem[]>([]);
  const [zones, setZones] = useState<DropZone[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setQuestionType('essay');
      setQuestionText('');
      setPoints(1);
      setGaps([]);
      setItems([]);
      setZones([]);
      setMappings({});
      setError(null);
    }
  }, [open]);

  const buildOptions = (): QuestionOptions => {
    switch (questionType) {
      case 'essay':
        return { type: 'essay' };

      case 'cloze':
        return {
          type: 'cloze',
          gaps: gaps.map((g, idx) => ({
            ...g,
            id: g.id || `gap-${idx + 1}`,
            correct_index: 0,
          })),
        };

      case 'drag_drop':
        return {
          type: 'drag_drop',
          items: items.map((item, idx) => ({
            ...item,
            id: item.id || `item-${idx}`,
          })),
          zones: zones.map((zone, idx) => {
            const mappedItems = Object.entries(mappings)
              .filter(([_, zoneId]) => zoneId === zone.id)
              .map(([itemId, _]) => itemId);
            return {
              ...zone,
              id: zone.id || `zone-${idx}`,
              correct_item_ids: mappedItems,
            };
          }),
          allow_multiple_items_per_zone: false,
        };
    }
  };

  const handleSave = async () => {
    if (!questionText.trim()) {
      setError('Question text is required');
      return;
    }

    if (questionType === 'cloze') {
      const gapMatches = questionText.match(/\{(\d+)\}/g);
      if (!gapMatches || gapMatches.length === 0) {
        setError('Cloze questions must have at least one gap marked as {1}, {2}, etc.');
        return;
      }
      if (gaps.length === 0) {
        setError('Please add choices for at least one gap');
        return;
      }
    }

    if (questionType === 'drag_drop') {
      if (items.length === 0) {
        setError('Please add at least one item');
        return;
      }
      if (zones.length === 0) {
        setError('Please add at least one zone');
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const body: CreateQuestionRequest = {
        question_type: questionType,
        question_text: questionText,
        options: buildOptions(),
        points,
      };

      const res = await fetch(`/api/challenges/${challengeId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save question');
        return;
      }

      onSaveSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save question. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addGap = () => {
    const gapNumber = gaps.length + 1;
    setGaps([
      ...gaps,
      {
        id: `gap-${gapNumber}`,
        choices: ['', ''],
        correct_index: 0,
        shuffle: true,
      },
    ]);
  };

  const updateGap = (index: number, field: keyof ClozeGap, value: any) => {
    const newGaps = [...gaps];
    newGaps[index] = { ...newGaps[index], [field]: value };
    setGaps(newGaps);
  };

  const updateGapChoice = (gapIndex: number, choiceIndex: number, value: string) => {
    const newGaps = [...gaps];
    const newChoices = [...newGaps[gapIndex].choices];
    newChoices[choiceIndex] = value;
    newGaps[gapIndex] = { ...newGaps[gapIndex], choices: newChoices };
    setGaps(newGaps);
  };

  const addGapChoice = (gapIndex: number) => {
    const newGaps = [...gaps];
    newGaps[gapIndex] = {
      ...newGaps[gapIndex],
      choices: [...newGaps[gapIndex].choices, ''],
    };
    setGaps(newGaps);
  };

  const removeGapChoice = (gapIndex: number, choiceIndex: number) => {
    const newGaps = [...gaps];
    const newChoices = newGaps[gapIndex].choices.filter((_, i) => i !== choiceIndex);
    newGaps[gapIndex] = { ...newGaps[gapIndex], choices: newChoices };
    setGaps(newGaps);
  };

  const addItem = () => {
    const itemNumber = items.length + 1;
    setItems([...items, { id: `item-${itemNumber}`, content: '' }]);
  };

  const updateItem = (index: number, content: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], content };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    // Remove mapping for this item
    const newMappings = { ...mappings };
    delete newMappings[items[index].id];
    setMappings(newMappings);
  };

  const addZone = () => {
    const zoneNumber = zones.length + 1;
    setZones([...zones, { id: `zone-${zoneNumber}`, label: '', correct_item_ids: [] }]);
  };

  const updateZone = (index: number, label: string) => {
    const newZones = [...zones];
    newZones[index] = { ...newZones[index], label };
    setZones(newZones);
  };

  const removeZone = (index: number) => {
    const newZones = zones.filter((_, i) => i !== index);
    setZones(newZones);
    // Remove mappings for this zone
    const newMappings = { ...mappings };
    Object.keys(newMappings).forEach((itemId) => {
      if (newMappings[itemId] === zones[index].id) {
        delete newMappings[itemId];
      }
    });
    setMappings(newMappings);
  };

  const updateMapping = (itemId: string, zoneId: string) => {
    setMappings({ ...mappings, [itemId]: zoneId });
  };

  const getQuestionTypeLabel = (type: QuestionType) => {
    switch (type) {
      case 'essay':
        return 'Essay';
      case 'cloze':
        return 'Fill in the Blanks';
      case 'drag_drop':
        return 'Drag & Drop';
    }
  };

  const getQuestionTypeIcon = (type: QuestionType) => {
    switch (type) {
      case 'essay':
        return '📝';
      case 'cloze':
        return '✏️';
      case 'drag_drop':
        return '🎯';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Question</DialogTitle>
          <DialogDescription>
            Create a new question for &quot;{challengeName}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <Label>Question Type</Label>
            <Select
              value={questionType}
              onValueChange={(value) => setQuestionType(value as QuestionType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="essay">📝 Essay</SelectItem>
                <SelectItem value="cloze">✏️ Fill in the Blanks (Cloze)</SelectItem>
                <SelectItem value="drag_drop">🎯 Drag & Drop Matching</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Question Text</Label>
            <Textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder={
                questionType === 'cloze'
                  ? 'Enter question with gaps like: The capital of {1} is Paris.'
                  : questionType === 'drag_drop'
                  ? 'Enter instructions: Match the items to their correct categories.'
                  : 'Enter your question here...'
              }
              rows={3}
            />
            {questionType === 'cloze' && (
              <p className="text-xs text-gray-500 mt-1">
                Use {`{1}`}, {`{2}`}, etc. to mark fill-in-the-blank gaps
              </p>
            )}
          </div>

          {/* Cloze-specific fields */}
          {questionType === 'cloze' && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Answer Choices for Gaps</Label>
                <Button type="button" variant="outline" size="sm" onClick={addGap}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Gap Choices
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Add choices for each gap. The first choice is the correct answer.
              </p>
              {gaps.map((gap, gapIdx) => (
                <div key={gapIdx} className="p-3 bg-white rounded border space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{`{${gapIdx + 1}}`}</Badge>
                    <span className="text-sm font-medium">Gap {gapIdx + 1}</span>
                  </div>
                  {gap.choices.map((choice, choiceIdx) => (
                    <div key={choiceIdx} className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <Input
                        value={choice}
                        onChange={(e) => updateGapChoice(gapIdx, choiceIdx, e.target.value)}
                        placeholder={choiceIdx === 0 ? 'Correct answer' : `Choice ${choiceIdx + 1}`}
                        className="flex-1"
                      />
                      {gap.choices.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeGapChoice(gapIdx, choiceIdx)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addGapChoice(gapIdx)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Choice
                  </Button>
                </div>
              ))}
              {gaps.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No gaps defined. Click &quot;Add Gap Choices&quot; to add answer options.
                </p>
              )}
            </div>
          )}

          {/* Drag-drop specific fields */}
          {questionType === 'drag_drop' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Draggable Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <Input
                        value={item.content}
                        onChange={(e) => updateItem(idx, e.target.value)}
                        placeholder={`Item ${idx + 1}`}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                {items.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-2">No items added</p>
                )}
              </div>

              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Drop Zones</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addZone}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Zone
                  </Button>
                </div>
                <div className="space-y-2">
                  {zones.map((zone, idx) => (
                    <div key={idx} className="p-2 bg-white rounded border space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={zone.label}
                          onChange={(e) => updateZone(idx, e.target.value)}
                          placeholder={`Zone ${idx + 1}`}
                          className="flex-1 text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeZone(idx)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          Maps to:
                        </span>
                        <select
                          value={mappings[items.find((i) => mappings[i.id] === zone.id)?.id || ''] || ''}
                          onChange={(e) => {
                            // Handle mapping - this is simplified
                            // In real implementation, you'd need more sophisticated mapping
                          }}
                          className="text-xs flex-1 border rounded px-1 py-0.5"
                          disabled
                        >
                          <option value="">Select item...</option>
                          {items.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.content || `Item ${items.indexOf(item) + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
                {zones.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-2">No zones added</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Points</Label>
              <Input
                type="number"
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
                min={1}
                max={100}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Label className="text-sm font-medium mb-2 block">Preview</Label>
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{getQuestionTypeIcon(questionType)}</span>
                <Badge variant="outline">{getQuestionTypeLabel(questionType)}</Badge>
                <Badge variant="secondary">{points} pt{points !== 1 ? 's' : ''}</Badge>
              </div>
              <p className="text-gray-700">{questionText || 'Question text will appear here...'}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-[#1565C0] hover:bg-[#0D47A1]"
          >
            {saving ? 'Saving...' : 'Save Question'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
