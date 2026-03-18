'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle } from 'lucide-react';

export type SubmissionStatus = 'in_progress' | 'submitted' | 'grading' | 'pending_review' | 'approved' | 'published';

export interface ApproveButtonProps {
  submissionId: string;
  currentStatus: SubmissionStatus;
  onApproved?: () => void;
  disabled?: boolean;
}

export function ApproveButton({
  submissionId,
  currentStatus,
  onApproved,
  disabled = false,
}: ApproveButtonProps) {
  const [isApproving, setIsApproving] = useState(false);

  // Determine button state
  const canApprove = currentStatus === 'pending_review';
  const isDisabled = disabled || !canApprove || isApproving;

  const handleApprove = async () => {
    if (isApproving || !canApprove) return;

    setIsApproving(true);
    try {
      const response = await fetch(`/api/challenges/submissions/${submissionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve submission');
      }

      onApproved?.();

      toast({
        title: 'Success',
        description: 'Grades approved and ready to publish',
      });
    } catch (error) {
      console.error('[ApproveButton] Error approving:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve submission',
        variant: 'destructive',
      });
    } finally {
      setIsApproving(false);
    }
  };

  // Don't render button if not in pending_review state
  if (!canApprove && !disabled) {
    return null;
  }

  return (
    <Button
      onClick={handleApprove}
      disabled={isDisabled}
      variant="default"
      className="bg-[#10B981] hover:bg-[#059669] gap-2"
      size="sm"
    >
      {isApproving ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Approving...
        </>
      ) : (
        <>
          <CheckCircle className="w-4 h-4" />
          Approve
        </>
      )}
    </Button>
  );
}
