/**
 * FilterPresetManager Component
 *
 * Main component for managing filter presets. Provides:
 * - Dropdown to select and load saved presets
 * - Save button to create new presets
 * - Actions menu for each preset (edit, share, delete, set as default)
 * - Visual indicators for unsaved changes and default presets
 */

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '../../../src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '../../../src/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../../../src/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { SavePresetModal } from './SavePresetModal';
import { SharePresetModal } from './SharePresetModal';
import { useFilterPresets, useFilterChangesDetection } from '../../../lib/hooks/useFilterPresets';
import { AnalyticsPage } from '../../../lib/types/filterPreset';
import { SimplifiedFilter } from '../../../lib/types/performanceTracker';

type CrossFilter = any; // TODO: Define proper CrossFilter type
import {
  Bookmark,
  Save,
  ChevronDown,
  Star,
  StarOff,
  Edit,
  Share2,
  Trash2,
  MoreVertical,
  X,
  RotateCcw,
} from 'lucide-react';
import { useToast } from '../../../hooks/use-toast';

interface FilterPresetManagerProps {
  page: AnalyticsPage;
  currentFilters: Record<string, any>;
  currentCrossFilters: CrossFilter[];
  currentSimplifiedFilter?: SimplifiedFilter; // ✨ NEW: Simplified filters support (Looker Studio-style)
  advancedFilterNames?: string[]; // Names of advanced filters currently loaded
  onLoadPreset: (filters: Record<string, any>, crossFilters: CrossFilter[], simplifiedFilter?: SimplifiedFilter, advancedFilterNames?: string[]) => void;
  presetIdFromUrl?: string;  // ✨ Load preset from URL
  suggestedName?: string; // ✨ NEW: Auto-generated name for save modal
  suggestedDescription?: string; // ✨ NEW: Auto-generated description for save modal
}

export function FilterPresetManager({
  page,
  currentFilters,
  currentCrossFilters,
  advancedFilterNames,
  currentSimplifiedFilter,
  onLoadPreset,
  presetIdFromUrl,
  suggestedName,
  suggestedDescription,
}: FilterPresetManagerProps) {
  const {
    ownPresets,
    sharedPresets,
    allPresets,
    defaultPreset,
    isLoading,
    createPreset,
    updatePreset,
    deletePreset,
    setDefaultPreset,
    unsetDefaultPreset,
    sharePreset,
    unsharePreset,
    getShares,
    refetch,
  } = useFilterPresets({
    page,
    skipInitialFetch: !!presetIdFromUrl,  // ✨ Skip preset list fetch if loading from URL
    filterType: 'standard'  // Only fetch standard presets (not advanced filters)
  });

  const [loadedPreset, setLoadedPreset] = useState<typeof allPresets[0] | null>(null);
  const [presetLoadingFromUrl, setPresetLoadingFromUrl] = useState(!!presetIdFromUrl);  // ✨ NEW: Track URL preset loading
  const hasUnsavedChanges = useFilterChangesDetection(
    currentFilters,
    currentCrossFilters,
    loadedPreset
  );

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [saveMode, setSaveMode] = useState<'create' | 'update'>('create');
  const [presetToDelete, setPresetToDelete] = useState<string | null>(null);
  const [sharePresetId, setSharePresetId] = useState<string>('');
  const [sharePresetName, setSharePresetName] = useState<string>('');
  const [presetToEdit, setPresetToEdit] = useState<typeof allPresets[0] | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [mainDropdownOpen, setMainDropdownOpen] = useState(false);

  const { toast } = useToast();

  // Close dropdown on scroll
  useEffect(() => {
    const handleScroll = () => {
      setMainDropdownOpen(false);
      setOpenActionMenuId(null);
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  // ✨ NEW: Load shared preset from URL parameter (NO BLOCKING - runs immediately!)
  useEffect(() => {
    if (!presetIdFromUrl || loadedPreset) return;
    // ❌ REMOVED: isLoading check - don't wait for preset list!

    // Fetch preset directly from API (don't wait for ownPresets to load)
    const loadSharedPreset = async () => {
      try {
        setPresetLoadingFromUrl(true);
        console.log('[FilterPresetManager] Loading preset from URL:', presetIdFromUrl);

        const response = await fetch(`/api/filter-presets/${presetIdFromUrl}`);
        if (!response.ok) {
          throw new Error('Failed to load preset');
        }

        const preset = await response.json();
        console.log('[FilterPresetManager] Loaded preset:', preset.name);

        // Check if user owns this preset (after fetching ownPresets later)
        // For now, treat as shared preset
        const sharedPresetObj = {
          id: preset.id,
          name: `${preset.name} *`,  // Add asterisk to indicate it's from a link
          description: preset.description,
          page: preset.page,
          filters: preset.filters,
          cross_filters: preset.cross_filters || [],
          is_default: false,
          is_shared: true,  // This flag triggers "Save Copy" button
          owner: preset.owner,
          user_id: preset.user_id || '',
          filter_type: preset.filter_type || 'standard',
          created_at: preset.created_at || new Date().toISOString(),
          updated_at: preset.updated_at || new Date().toISOString(),
          simplified_filter: preset.simplified_filter || null,
          advanced_filter_names: preset.advanced_filter_names || [],
        };

        setLoadedPreset(sharedPresetObj as any);
        onLoadPreset(preset.filters, preset.cross_filters || [], preset.simplified_filter, preset.advanced_filter_names || []);

        toast({
          title: 'Shared preset loaded',
          description: `Viewing "${preset.name}" from ${preset.owner?.email || 'another user'}`,
        });
      } catch (error) {
        console.error('[FilterPresetManager] Error loading shared preset:', error);
        toast({
          title: 'Error',
          description: 'Failed to load shared preset',
          variant: 'destructive',
        });
      } finally {
        setPresetLoadingFromUrl(false);
      }
    };

    loadSharedPreset();
  }, [presetIdFromUrl, loadedPreset, onLoadPreset, toast]);

  // ✨ Check if loaded URL preset is actually owned by user (after preset list loads)
  useEffect(() => {
    if (!loadedPreset || !loadedPreset.is_shared || isLoading) return;

    const ownedPreset = ownPresets.find(p => p.id === loadedPreset.id);
    if (ownedPreset) {
      // User actually owns this - update to remove "Save Copy" button
      console.log('[FilterPresetManager] URL preset is owned by user, updating:', ownedPreset.name);
      setLoadedPreset(ownedPreset);

      toast({
        title: 'Your preset loaded',
        description: `Applied your preset: "${ownedPreset.name}"`,
      });
    }
  }, [ownPresets, loadedPreset, isLoading, toast]);

  // Auto-load default preset on mount (only if no URL preset)
  // Use ref pattern to avoid infinite loop from unstable onLoadPreset callback
  const onLoadPresetRef = useRef(onLoadPreset);
  onLoadPresetRef.current = onLoadPreset;

  useEffect(() => {
    if (!loadedPreset && !presetIdFromUrl && defaultPreset && !isLoading) {
      console.log('[FilterPresetManager] Auto-loading default preset:', defaultPreset.name);
      setLoadedPreset(defaultPreset);
      onLoadPresetRef.current(defaultPreset.filters, defaultPreset.cross_filters, defaultPreset.simplified_filter);
    }
  }, [defaultPreset, loadedPreset, presetIdFromUrl, isLoading]);

  // Check if user owns the currently loaded preset
  const canEditLoadedPreset = useMemo(() => {
    if (!loadedPreset) return false;
    return ownPresets.some((p) => p.id === loadedPreset.id) ||
      (sharedPresets.some((p) => p.id === loadedPreset.id && p.share_permission === 'edit'));
  }, [loadedPreset, ownPresets, sharedPresets]);

  // Handle loading a preset
  const handleLoadPreset = (presetId: string) => {
    const preset = allPresets.find((p) => p.id === presetId);
    if (!preset) return;

    setLoadedPreset(preset);
    onLoadPreset(preset.filters, preset.cross_filters, preset.simplified_filter, preset.advanced_filter_names || []);

    toast({
      title: 'Preset loaded',
      description: `Applied filter preset: "${preset.name}"`,
    });
  };

  // Handle saving new preset
  const handleSaveNew = async (name: string, description: string, isDefault: boolean) => {
    const newPreset = await createPreset({
      name,
      description,
      page,
      filters: currentFilters,
      cross_filters: currentCrossFilters,
      simplified_filter: currentSimplifiedFilter,
      advanced_filter_names: advancedFilterNames || [],
      is_default: isDefault,
    });

    setLoadedPreset(newPreset);

    toast({
      title: 'Preset saved',
      description: `Filter preset "${name}" has been saved.`,
    });
  };

  // Handle updating existing preset
  const handleUpdate = async (name: string, description: string, isDefault: boolean) => {
    const presetId = presetToEdit?.id || loadedPreset?.id;
    if (!presetId) return;

    const updated = await updatePreset(presetId, {
      name,
      description,
      filters: presetToEdit ? presetToEdit.filters : currentFilters,
      cross_filters: presetToEdit ? presetToEdit.cross_filters : currentCrossFilters,
      simplified_filter: presetToEdit ? presetToEdit.simplified_filter : currentSimplifiedFilter,
      advanced_filter_names: advancedFilterNames || [],
      is_default: isDefault,
    });

    if (loadedPreset?.id === presetId) {
      setLoadedPreset(updated);
    }

    toast({
      title: 'Preset updated',
      description: `Filter preset "${name}" has been updated.`,
    });

    setPresetToEdit(null);
  };

  // Handle deleting a preset
  const handleDelete = async (presetId: string) => {
    try {
      await deletePreset(presetId);

      // Clear loaded preset if it was deleted
      if (loadedPreset?.id === presetId) {
        setLoadedPreset(null);
      }

      toast({
        title: 'Preset deleted',
        description: 'Filter preset has been deleted.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete preset',
        variant: 'destructive',
      });
    } finally {
      setPresetToDelete(null);
    }
  };

  // Handle toggling default status
  const handleToggleDefault = async (presetId: string, currentDefault: boolean) => {
    try {
      if (currentDefault) {
        await unsetDefaultPreset();
        toast({
          title: 'Default removed',
          description: 'This preset is no longer the default.',
        });
      } else {
        await setDefaultPreset(presetId);
        toast({
          title: 'Default set',
          description: 'This preset will now load automatically.',
        });
      }
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update default',
        variant: 'destructive',
      });
    }
  };

  const openShareModal = (presetId: string, presetName: string) => {
    setSharePresetId(presetId);
    setSharePresetName(presetName);
    setIsShareModalOpen(true);
  };

  return (
    <div className="space-y-2">
      {/* ✨ Loading Indicator for URL Preset */}
      {presetLoadingFromUrl && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span>Loading preset...</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Preset Selector Dropdown */}
        <DropdownMenu modal={false} open={mainDropdownOpen} onOpenChange={setMainDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={`flex-1 justify-between transition-colors border-gray-300 ${
              loadedPreset
                ? 'font-semibold text-blue-600 hover:bg-blue-50'
                : 'font-normal hover:bg-gray-50'
            }`}
            style={{
              backgroundColor: loadedPreset ? '#eff6ff' : '#ffffff',
              color: loadedPreset ? '#2563eb' : '#1f2937',
            }}
          >
            <span className="flex items-center gap-1.5 truncate text-sm">
              <Bookmark className="h-4 w-4 shrink-0" />
              {loadedPreset ? (
                <>
                  <span className="truncate">{loadedPreset.name}</span>
                  {hasUnsavedChanges && <span className="text-orange-500 shrink-0">*</span>}
                  {loadedPreset.is_default && <Star className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400" />}
                </>
              ) : (
                'Select a filter preset...'
              )}
            </span>
            <ChevronDown className="h-4 w-4 ml-2 shrink-0 text-gray-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          {isLoading ? (
            <DropdownMenuItem disabled>Loading presets...</DropdownMenuItem>
          ) : allPresets.length === 0 ? (
            <DropdownMenuItem disabled>No saved presets yet</DropdownMenuItem>
          ) : (
            <>
              {ownPresets.length > 0 && (
                <>
                  <DropdownMenuLabel>My Presets</DropdownMenuLabel>
                  {ownPresets.map((preset) => {
                    const isActive = loadedPreset?.id === preset.id;
                    return (
                    <DropdownMenuGroup key={preset.id}>
                      <div className={`flex items-center justify-between px-2 py-1.5 text-sm cursor-pointer rounded-sm ${
                        isActive ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                      }`}>
                        <span
                          className="flex items-center gap-2 flex-1 min-w-0"
                          onClick={() => handleLoadPreset(preset.id)}
                        >
                          {preset.is_default && <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-400 text-yellow-400" />}
                          <span className={`truncate ${isActive ? 'font-semibold text-blue-600' : ''}`}>
                            {preset.name}
                          </span>
                        </span>
                        <Popover
                          open={openActionMenuId === preset.id}
                          onOpenChange={(open) => setOpenActionMenuId(open ? preset.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 shrink-0 hover:bg-gray-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4 text-gray-500" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-48 p-1">
                            <div className="flex flex-col gap-0.5">
                              <button
                                className="flex items-center w-full px-2 py-1.5 text-sm hover:bg-gray-100 rounded-sm text-left"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPresetToEdit(preset);
                                  setSaveMode('update');
                                  setIsSaveModalOpen(true);
                                  setOpenActionMenuId(null);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </button>
                              <button
                                className="flex items-center w-full px-2 py-1.5 text-sm hover:bg-gray-100 rounded-sm text-left"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleDefault(preset.id, preset.is_default);
                                  setOpenActionMenuId(null);
                                }}
                              >
                                {preset.is_default ? (
                                  <>
                                    <StarOff className="h-4 w-4 mr-2" />
                                    Remove default
                                  </>
                                ) : (
                                  <>
                                    <Star className="h-4 w-4 mr-2" />
                                    Set as default
                                  </>
                                )}
                              </button>
                              <button
                                className="flex items-center w-full px-2 py-1.5 text-sm hover:bg-gray-100 rounded-sm text-left"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openShareModal(preset.id, preset.name);
                                  setOpenActionMenuId(null);
                                }}
                              >
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </button>
                              <div className="h-px bg-gray-200 my-0.5" />
                              <button
                                className="flex items-center w-full px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-sm text-left"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPresetToDelete(preset.id);
                                  setOpenActionMenuId(null);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </DropdownMenuGroup>
                  );
                  })}
                </>
              )}

              {sharedPresets.length > 0 && (
                <>
                  {ownPresets.length > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel>Shared with me</DropdownMenuLabel>
                  {sharedPresets.map((preset) => {
                    const isActive = loadedPreset?.id === preset.id;
                    return (
                    <DropdownMenuItem
                      key={preset.id}
                      onClick={() => handleLoadPreset(preset.id)}
                      className={`flex items-center justify-between cursor-pointer ${
                        isActive ? 'bg-blue-50 hover:bg-blue-100' : ''
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Share2 className={`h-3 w-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={isActive ? 'font-semibold text-blue-600' : ''}>
                          {preset.name}
                        </span>
                      </span>
                      <span className="text-xs text-gray-500">{preset.owner_email}</span>
                    </DropdownMenuItem>
                  )})}
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Actions Dropdown */}
      {loadedPreset ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="whitespace-nowrap shrink-0 border-gray-300 hover:bg-gray-50"
              style={{
                backgroundColor: '#ffffff',
                color: '#1f2937',
              }}
            >
              Actions
              <ChevronDown className="h-3.5 w-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {hasUnsavedChanges && (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    setSaveMode('create');
                    setIsSaveModalOpen(true);
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as new preset
                </DropdownMenuItem>
                {canEditLoadedPreset && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSaveMode('update');
                      setIsSaveModalOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Update "{loadedPreset.name.length > 20 ? loadedPreset.name.substring(0, 20) + '...' : loadedPreset.name}"
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    onLoadPreset(loadedPreset.filters, loadedPreset.cross_filters, loadedPreset.simplified_filter, loadedPreset.advanced_filter_names || []);
                    toast({
                      title: 'Changes discarded',
                      description: 'Filters reset to saved preset.',
                    });
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Discard changes
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              onClick={() => {
                setLoadedPreset(null);
                toast({
                  title: 'Preset cleared',
                  description: 'No preset is currently active.',
                });
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Clear preset
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSaveMode('create');
            setIsSaveModalOpen(true);
          }}
          className="whitespace-nowrap shrink-0 border-gray-300 hover:bg-gray-50"
          style={{
            backgroundColor: '#ffffff',
            color: '#1f2937',
          }}
        >
          <Save className="h-4 w-4 mr-1" />
          Save As
        </Button>
      )}

      {/* Save Copy button for shared presets */}
      {loadedPreset?.is_shared && (
        <Button
          variant="default"
          size="sm"
          onClick={async () => {
            try {
              // Remove asterisk from name
              const cleanName = loadedPreset.name.replace(' *', '');

              const newPreset = await createPreset({
                name: `${cleanName} (Copy)`,
                description: loadedPreset.description || '',
                page,
                filters: loadedPreset.filters,
                cross_filters: loadedPreset.cross_filters || [],
                simplified_filter: loadedPreset.simplified_filter,
                is_default: false,
              });

              toast({
                title: 'Preset saved!',
                description: `"${newPreset.name}" has been saved to your presets.`,
              });

              // Auto-load the newly saved preset
              setLoadedPreset(newPreset);
              refetch();
            } catch (error) {
              console.error('Error saving copy:', error);
              toast({
                title: 'Error',
                description: 'Failed to save preset copy.',
                variant: 'destructive',
              });
            }
          }}
          className="whitespace-nowrap shrink-0 bg-blue-600 hover:bg-blue-700"
        >
          <Save className="h-4 w-4 mr-1" />
          Save Copy
        </Button>
      )}

      {/* Save/Update Modal */}
      <SavePresetModal
        isOpen={isSaveModalOpen}
        onClose={() => {
          setIsSaveModalOpen(false);
          setPresetToEdit(null);
        }}
        onSave={saveMode === 'create' ? handleSaveNew : handleUpdate}
        existingPresets={ownPresets}
        currentPreset={saveMode === 'update' ? (presetToEdit || loadedPreset) : null}
        mode={saveMode}
        suggestedName={suggestedName}
        suggestedDescription={suggestedDescription}
      />

      {/* Share Modal */}
      <SharePresetModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        presetId={sharePresetId}
        presetName={sharePresetName}
        page={page}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!presetToDelete} onOpenChange={() => setPresetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Filter Preset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this filter preset. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => presetToDelete && handleDelete(presetToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
