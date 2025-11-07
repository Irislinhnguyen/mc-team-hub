/**
 * SavePresetModal Component
 *
 * Modal dialog for saving current filter configuration as a named preset.
 * Allows users to provide a name, description, and mark as default.
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../src/components/ui/input';
import { Label } from '../../../src/components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Checkbox } from '../../../components/ui/checkbox';
import { FilterPreset } from '../../../lib/types/filterPreset';

interface SavePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string, isDefault: boolean) => Promise<void>;
  existingPresets: FilterPreset[];
  currentPreset?: FilterPreset | null; // If editing existing preset
  mode: 'create' | 'update';
  suggestedName?: string; // ✨ NEW: Auto-generated name suggestion
  suggestedDescription?: string; // ✨ NEW: Auto-generated description suggestion
}

export function SavePresetModal({
  isOpen,
  onClose,
  onSave,
  existingPresets,
  currentPreset,
  mode,
  suggestedName,
  suggestedDescription,
}: SavePresetModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'update' && currentPreset) {
        setName(currentPreset.name);
        setDescription(currentPreset.description || '');
        setIsDefault(currentPreset.is_default);
      } else {
        // ✨ Use suggested values for new presets
        setName(suggestedName || '');
        setDescription(suggestedDescription || '');
        setIsDefault(false);
      }
      setError(null);
    }
  }, [isOpen, mode, currentPreset, suggestedName, suggestedDescription]);

  const validateName = (value: string): string | null => {
    if (!value.trim()) {
      return 'Name is required';
    }
    if (value.length > 100) {
      return 'Name must be 100 characters or less';
    }
    // Check for duplicate names (excluding current preset if updating)
    const duplicate = existingPresets.find(
      (p) =>
        p.name.toLowerCase() === value.trim().toLowerCase() &&
        (mode === 'create' || p.id !== currentPreset?.id)
    );
    if (duplicate) {
      return 'A preset with this name already exists';
    }
    return null;
  };

  const handleSave = async () => {
    // Validate
    const validationError = validateName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(name.trim(), description.trim(), isDefault);
      onClose();
    } catch (err) {
      console.error('Error saving preset:', err);
      setError(err instanceof Error ? err.message : 'Failed to save preset');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (error) {
      // Clear error when user starts typing
      setError(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Save Filter Preset' : 'Update Filter Preset'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Save your current filter configuration for quick access later.'
              : 'Update the name, description, or default setting for this preset.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name Input */}
          <div className="grid gap-2">
            <Label htmlFor="preset-name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="preset-name"
              placeholder="e.g., Weekly APP_GV Report"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={isSaving}
              maxLength={100}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <p className="text-xs text-gray-500">{name.length}/100 characters</p>
          </div>

          {/* Description Input */}
          <div className="grid gap-2">
            <Label htmlFor="preset-description">Description (optional)</Label>
            <Textarea
              id="preset-description"
              placeholder="Describe what this filter preset is for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              rows={3}
              className="resize-none"
            />
            {mode === 'create' && suggestedDescription && (
              <p className="text-xs text-blue-600 italic">
                💡 Auto-generated based on your current settings
              </p>
            )}
          </div>

          {/* Default Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="preset-default"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked as boolean)}
              disabled={isSaving}
            />
            <Label
              htmlFor="preset-default"
              className="text-sm font-normal cursor-pointer"
            >
              Set as default (auto-apply when page loads)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? 'Saving...' : mode === 'create' ? 'Save Preset' : 'Update Preset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
