/**
 * SharePresetModal Component
 *
 * Modal dialog for generating shareable links for filter presets.
 * Users can copy a link to share the preset with anyone.
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link2, Copy, Check } from 'lucide-react';
import { useToast } from '../../../hooks/use-toast';

interface SharePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetId: string;
  presetName: string;
  page: string; // e.g., 'business-health', 'daily-ops'
}

export function SharePresetModal({
  isOpen,
  onClose,
  presetId,
  presetName,
  page,
}: SharePresetModalProps) {
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Generate shareable URL when modal opens
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const url = `${window.location.origin}/performance-tracker/${page}?preset=${presetId}`;
      setShareUrl(url);
      setCopied(false);
    }
  }, [isOpen, presetId, page]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'Share link has been copied to your clipboard.',
      });

      // Reset copied state after 3 seconds
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      toast({
        title: 'Error',
        description: 'Failed to copy link. Please copy it manually.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Share "{presetName}"
          </DialogTitle>
          <DialogDescription>
            Anyone with this link can view and use this filter preset.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Shareable Link Section */}
          <div className="grid gap-2">
            <Label htmlFor="share-url">Shareable Link</Label>
            <div className="flex gap-2">
              <Input
                id="share-url"
                type="text"
                value={shareUrl}
                readOnly
                className="font-mono text-sm"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                onClick={handleCopyLink}
                size="sm"
                className="shrink-0 min-w-[100px]"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Recipients can view the preset and save a copy to their account.
            </p>
          </div>

          {/* Info Section */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> This link will work as long as the preset exists.
              Anyone with the link can view the filters, and logged-in users can save
              a copy to their own account.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
