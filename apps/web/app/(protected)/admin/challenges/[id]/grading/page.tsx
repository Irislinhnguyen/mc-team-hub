'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, Users, FileText, Clock } from 'lucide-react';
import { SubmitForReviewButton } from '@/app/components/admin/approvals';
import { toast } from '@/hooks/use-toast';

type SubmissionStatus = 'in_progress' | 'submitted' | 'grading' | 'pending_review' | 'approved' | 'published';

interface Submission {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_team_id: string | null;
  status: SubmissionStatus;
  final_score: number | null;
  final_score_max: number | null;
  submitted_at: string | null;
  graded_by: string | null;
  graded_at: string | null;
  answers: Array<{
    id: string;
    question_id: string;
    is_auto_graded: boolean;
    auto_score: number | null;
    manual_score: number | null;
  }>;
}

interface GradingPageProps {}

export default function GradingPage({}: GradingPageProps) {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const challengeId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [challenge, setChallenge] = useState<any>(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }

    // Only leaders, admins, and managers can access
    if (!['admin', 'manager', 'leader'].includes(user.role)) {
      router.push('/');
      return;
    }

    fetchChallenge();
    fetchSubmissions();
  }, [user, challengeId]);

  const fetchChallenge = async () => {
    try {
      const res = await fetch(`/api/challenges/${challengeId}`);
      if (!res.ok) throw new Error('Failed to load challenge');
      const data = await res.json();
      setChallenge(data.challenge);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/challenges/${challengeId}/submissions`);
      if (!res.ok) throw new Error('Failed to load submissions');
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    const readyToSubmit = submissions.filter(
      (s) => s.status === 'grading' && allEssaysGraded(s)
    );

    if (readyToSubmit.length === 0) {
      toast({
        title: 'No submissions ready',
        description: 'All submissions have already been submitted or need more grading.',
        variant: 'destructive',
      });
      return;
    }

    setBulkSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const submission of readyToSubmit) {
        try {
          const res = await fetch(`/api/challenges/submissions/${submission.id}/submit-for-review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });

          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          console.error(`Failed to submit submission ${submission.id}:`, err);
          errorCount++;
        }
      }

      // Refresh submissions after bulk submit
      await fetchSubmissions();

      toast({
        title: 'Bulk submit complete',
        description: `Sent ${successCount} submissions to Manager for review${errorCount > 0 ? ` (${errorCount} failed)` : ''}`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to submit submissions',
        variant: 'destructive',
      });
    } finally {
      setBulkSubmitting(false);
    }
  };

  const allEssaysGraded = (submission: Submission): boolean => {
    if (!submission.answers || submission.answers.length === 0) return false;

    // Check if all essay questions (is_auto_graded = false) have manual_score
    const essayAnswers = submission.answers.filter((a) => !a.is_auto_graded);
    return essayAnswers.every((a) => a.manual_score !== null);
  };

  const getStatusBadge = (status: SubmissionStatus) => {
    const colors: Record<SubmissionStatus, string> = {
      in_progress: 'bg-gray-100 text-gray-700',
      submitted: 'bg-blue-100 text-blue-700',
      grading: 'bg-purple-100 text-purple-700',
      pending_review: 'bg-amber-100 text-amber-700',
      approved: 'bg-emerald-100 text-emerald-700',
      published: 'bg-green-100 text-green-700',
    };
    const labels: Record<SubmissionStatus, string> = {
      in_progress: 'In Progress',
      submitted: 'Submitted',
      grading: 'Grading',
      pending_review: 'Pending Review',
      approved: 'Approved',
      published: 'Published',
    };
    return <Badge className={colors[status]}>{labels[status]}</Badge>;
  };

  const isLeader = user?.role === 'leader';
  const canBulkSubmit = submissions.some(
    (s) => s.status === 'grading' && allEssaysGraded(s)
  );

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {challenge?.name || 'Challenge'} Grading
            </h1>
            <p className="text-gray-600">
              {submissions.length} {submissions.length === 1 ? 'submission' : 'submissions'}
            </p>
          </div>
        </div>

        {/* Bulk submit button for Leaders */}
        {isLeader && canBulkSubmit && (
          <Button
            onClick={handleBulkSubmit}
            disabled={bulkSubmitting}
            className="bg-[#1565C0] hover:bg-[#0D47A1] gap-2"
          >
            {bulkSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Submit All for Review
              </>
            )}
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Submissions Grid */}
      {submissions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
            <p className="text-gray-600">When users submit this challenge, they will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {submissions.map((submission) => {
            const isReadyToSubmit = submission.status === 'grading' && allEssaysGraded(submission);
            const gradedCount = submission.answers.filter((a) => a.manual_score !== null).length;
            const totalEssayCount = submission.answers.filter((a) => !a.is_auto_graded).length;

            return (
              <Card key={submission.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* User info */}
                      <div className="flex items-center gap-3 mb-3">
                        <Users className="w-4 h-4 text-gray-400" />
                        <div>
                          <span className="font-medium">{submission.user_name}</span>
                          <span className="text-gray-500 text-sm ml-2">({submission.user_email})</span>
                        </div>
                        {submission.user_team_id && (
                          <Badge variant="outline" className="text-xs">
                            {submission.user_team_id}
                          </Badge>
                        )}
                      </div>

                      {/* Status and grading info */}
                      <div className="flex items-center gap-4 mb-3">
                        {getStatusBadge(submission.status)}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FileText className="w-4 h-4" />
                          <span>
                            {gradedCount}/{totalEssayCount} essays graded
                          </span>
                        </div>
                        {submission.submitted_at && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>
                              Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Score */}
                      {submission.final_score !== null && (
                        <div className="text-sm text-gray-600">
                          Score: {submission.final_score}
                          {submission.final_score_max && ` / ${submission.final_score_max}`}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {isLeader && (
                        <SubmitForReviewButton
                          submissionId={submission.id}
                          allEssaysGraded={allEssaysGraded(submission)}
                          currentStatus={submission.status}
                          onSubmitted={fetchSubmissions}
                          userRole={user?.role}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
