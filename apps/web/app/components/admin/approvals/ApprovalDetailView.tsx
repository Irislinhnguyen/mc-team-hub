'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { ApproveButton } from './ApproveButton';
import { ChevronLeft, ChevronRight, Loader2, User, Users, Clock, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export type SubmissionStatus = 'in_progress' | 'submitted' | 'grading' | 'pending_review' | 'approved' | 'published';

export interface ApprovalDetailViewProps {
  submissionId: string;
  onClose?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface SubmissionDetails {
  id: string;
  challenge_id: string;
  challenge_name: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_team_id: string | null;
  status: SubmissionStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  graded_by: string | null;
  graded_at: string | null;
}

interface Answer {
  id: string;
  question_id: string;
  question_text: string;
  question_type: string;
  user_answer: string;
  auto_score: number | null;
  auto_score_max: number | null;
  manual_score: number | null;
  manual_score_max: number | null;
  manual_feedback: string | null;
  is_auto_graded: boolean;
  grading_modified_by: string | null;
  grading_modified_at: string | null;
}

interface ApprovalHistory {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  from_status: string;
  to_status: string;
  notes: string | null;
  created_at: string;
}

export function ApprovalDetailView({
  submissionId,
  onClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}: ApprovalDetailViewProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submission, setSubmission] = useState<SubmissionDetails | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([]);
  const [editedAnswers, setEditedAnswers] = useState<Record<string, { score: number; feedback: string }>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissionDetails();
  }, [submissionId]);

  const fetchSubmissionDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      setEditedAnswers({});

      // Fetch submission details
      const submissionRes = await fetch(`/api/challenges/submissions/${submissionId}`);
      if (!submissionRes.ok) {
        throw new Error('Failed to load submission details');
      }
      const submissionData = await submissionRes.json();
      setSubmission(submissionData.submission);

      // Fetch answers
      const answersRes = await fetch(`/api/challenges/submissions/${submissionId}/answers`);
      if (!answersRes.ok) {
        throw new Error('Failed to load answers');
      }
      const answersData = await answersRes.json();
      setAnswers(answersData.answers || []);

      // Fetch approval history
      const historyRes = await fetch(`/api/approvals/submission/${submissionId}`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setApprovalHistory(historyData.approvals || []);
      }
    } catch (err: any) {
      console.error('Error fetching submission details:', err);
      setError(err.message || 'Failed to load submission details');
      toast({
        title: 'Error',
        description: err.message || 'Failed to load submission details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (answerId: string, field: 'score' | 'feedback', value: string | number) => {
    setEditedAnswers((prev) => ({
      ...prev,
      [answerId]: {
        ...prev[answerId],
        [field]: value,
      },
    }));
  };

  const handleSaveGrades = async () => {
    if (Object.keys(editedAnswers).length === 0) {
      toast({
        title: 'No changes',
        description: 'There are no grade changes to save',
      });
      return;
    }

    try {
      setSaving(true);
      const answersArray = Object.entries(editedAnswers).map(([answerId, data]) => ({
        answerId,
        score: data.score,
        feedback: data.feedback,
      }));

      const res = await fetch(`/api/challenges/submissions/${submissionId}/grades`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers: answersArray }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save grades');
      }

      toast({
        title: 'Success',
        description: 'Grades saved successfully',
      });

      // Clear edits and refresh
      setEditedAnswers({});
      await fetchSubmissionDetails();
    } catch (err: any) {
      console.error('Error saving grades:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to save grades',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApproved = () => {
    toast({
      title: 'Approved',
      description: 'Grades approved and ready to publish',
    });
    // Refresh to show updated status
    fetchSubmissionDetails();
    // Optionally close or move to next
    if (hasNext) {
      onNext?.();
    } else {
      onClose?.();
    }
  };

  const getTotalScore = () => {
    let score = 0;
    let maxScore = 0;
    answers.forEach((answer) => {
      const scoreValue = answer.auto_score ?? answer.manual_score ?? 0;
      const maxScoreValue = answer.auto_score_max ?? answer.manual_score_max ?? 0;
      score += scoreValue;
      maxScore += maxScoreValue;
    });
    return { score, maxScore };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">{error || 'Submission not found'}</p>
      </div>
    );
  }

  const { score: totalScore, maxScore: totalMaxScore } = getTotalScore();
  const hasChanges = Object.keys(editedAnswers).length > 0;

  return (
    <div className="space-y-6">
      {/* Top bar with navigation and actions */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={!hasPrevious}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={!hasNext}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveGrades}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          )}
          <ApproveButton
            submissionId={submissionId}
            currentStatus={submission.status}
            onApproved={handleApproved}
          />
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Student Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Student Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{submission.user_name}</p>
                <p className="text-xs text-gray-500">{submission.user_email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Team</p>
                <p className="font-medium">{submission.user_team_id || 'Unassigned'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Submitted</p>
                <p className="font-medium">
                  {submission.submitted_at
                    ? formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })
                    : 'Not submitted'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leader/Grading Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Grading Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Challenge</p>
              <p className="font-medium">{submission.challenge_name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <Badge
                className={
                  submission.status === 'pending_review'
                    ? 'bg-amber-100 text-amber-700'
                    : submission.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-700'
                }
              >
                {submission.status === 'pending_review'
                  ? 'Pending Review'
                  : submission.status === 'approved'
                  ? 'Approved'
                  : submission.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Score</p>
              <p className="font-medium">
                {totalScore} / {totalMaxScore}
              </p>
            </div>
          </div>

          {/* Approval History */}
          {approvalHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Approval History</p>
              <div className="space-y-2">
                {approvalHistory.map((approval) => (
                  <div key={approval.id} className="text-sm">
                    <span className="font-medium">{approval.user_name}</span> (
                    {approval.user_role}) {approval.action === 'submitted_for_review' ? 'submitted for review' : 'approved'}{' '}
                    <span className="text-gray-500">
                      {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Answers List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Answers</h3>
        {answers.length === 0 ? (
          <Card>
            <CardContent className="py-6">
              <p className="text-center text-gray-500">No answers found</p>
            </CardContent>
          </Card>
        ) : (
          answers.map((answer, index) => {
            const isEdited = editedAnswers[answer.id];
            const currentScore = isEdited?.score ?? answer.manual_score ?? answer.auto_score ?? 0;
            const currentFeedback = isEdited?.feedback ?? answer.manual_feedback ?? '';

            return (
              <Card key={answer.id} className={isEdited ? 'border-blue-300 bg-blue-50/30' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">Question {index + 1}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{answer.question_text}</p>
                    </div>
                    <Badge variant={answer.is_auto_graded ? 'secondary' : 'default'}>
                      {answer.is_auto_graded ? 'Auto-graded' : 'Manual grading'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Student Answer */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Student Answer:</p>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                      {answer.user_answer || 'No answer provided'}
                    </p>
                  </div>

                  {/* Score Display (for auto-graded) */}
                  {answer.is_auto_graded && answer.auto_score !== null && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Auto Score:</p>
                      <p className="text-sm">
                        {answer.auto_score} / {answer.auto_score_max || 0}
                      </p>
                    </div>
                  )}

                  {/* Manual Score (editable) */}
                  {!answer.is_auto_graded && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Manual Score:</p>
                      <Input
                        type="number"
                        value={currentScore}
                        onChange={(e) => handleGradeChange(answer.id, 'score', parseFloat(e.target.value) || 0)}
                        className="w-24"
                        min={0}
                        max={answer.manual_score_max || 10}
                      />
                      <p className="text-xs text-gray-500 mt-1">Max: {answer.manual_score_max || 10}</p>
                    </div>
                  )}

                  {/* Feedback (editable) */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Feedback:</p>
                    <Textarea
                      value={currentFeedback}
                      onChange={(e) => handleGradeChange(answer.id, 'feedback', e.target.value)}
                      placeholder="Add feedback for the student..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  {/* Last Modified */}
                  {answer.grading_modified_by && (
                    <p className="text-xs text-gray-500">
                      Last modified by {answer.grading_modified_by} at{' '}
                      {answer.grading_modified_at
                        ? formatDistanceToNow(new Date(answer.grading_modified_at), { addSuffix: true })
                        : 'unknown'}
                    </p>
                  )}

                  {/* Edit indicator */}
                  {isEdited && (
                    <div className="flex items-center gap-2 text-blue-600 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>Unsaved changes</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
