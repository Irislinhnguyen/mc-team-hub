'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle } from 'lucide-react';

export type SubmissionStatus = 'in_progress' | 'submitted' | 'grading' | 'pending_review' | 'approved' | 'published';

export interface SubmitForReviewButtonProps {
  submissionId: string;
  allEssaysGraded: boolean;
  currentStatus: SubmissionStatus;
  onSubmitted?: () => void;
  userRole?: 'admin' | 'manager' | 'leader' | 'user';
}

export function SubmitForReviewButton({
  submissionId,
  allEssaysGraded,
  currentStatus,
  onSubmitted,
  userRole = 'user',
}: SubmitForReviewButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);

  // Determine button state
  const isSubmitted = currentStatus === 'pending_review' || currentStatus === 'approved' || currentStatus === 'published';
  const canSubmit = currentStatus === 'grading' && allEssaysGraded;
  const isLeader = userRole === 'leader';

  // Don't render button for non-Leader users or if already submitted
  if (!isLeader || isSubmitted) {
    if (isSubmitted) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span>Submitted</span>
          {submittedAt && (
            <span className="text-xs text-gray-500">
              at {new Date(submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      );
    }
    return null;
  }

  // Don't render if not ready to submit
  if (!canSubmit) {
    return null;
  }

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/challenges/submissions/${submissionId}/submit-for-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit for review');
      }

      setSubmittedAt(new Date());
      onSubmitted?.();

      toast({
        title: 'Success',
        description: 'Submission sent to Manager for review',
      });
    } catch (error) {
      console.error('[SubmitForReviewButton] Error submitting:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit for review',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      onClick={handleSubmit}
      disabled={isSubmitting}
      variant="default"
      className="bg-[#1565C0] hover:bg-[#0D47A1] gap-2"
      size="sm"
    >
      {isSubmitting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Submitting...
        </>
      ) : (
        <>
          <CheckCircle className="w-4 h-4" />
          Submit for Review
        </>
      )}
    </Button>
  );
}
