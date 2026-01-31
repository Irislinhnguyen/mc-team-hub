'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { Challenge, ChallengeQuestion, ChallengeStatus } from '@/lib/types/challenge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Upload,
  Download,
  Plus,
  FileQuestion,
  AlertCircle,
} from 'lucide-react';
import { QuestionUploadDialog } from '@/components/challenges/QuestionUploadDialog';
import { QuestionFormDialog } from '@/components/challenges/QuestionFormDialog';
import { QuestionListItem } from '@/components/challenges/QuestionListItem';

export default function ChallengeQuestionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const challengeId = params.id as string;

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [questions, setQuestions] = useState<ChallengeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);

  useEffect(() => {
    if (!['admin', 'manager'].includes(user?.role || '')) {
      router.push('/challenges');
      return;
    }
    fetchChallenge();
    fetchQuestions();
  }, [user, challengeId]);

  const fetchChallenge = async () => {
    try {
      const res = await fetch(`/api/challenges/${challengeId}`);
      if (!res.ok) {
        if (res.status === 404) {
          router.push('/admin/challenges');
          return;
        }
        throw new Error('Failed to fetch challenge');
      }
      const data = await res.json();
      setChallenge(data.challenge);
    } catch (err) {
      console.error(err);
      router.push('/admin/challenges');
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/challenges/${challengeId}/questions`);
      if (!res.ok) throw new Error('Failed to fetch questions');
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (err) {
      console.error(err);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (question: ChallengeQuestion) => {
    if (!confirm(`Are you sure you want to delete this question?`)) return;

    try {
      const res = await fetch(`/api/challenges/${challengeId}/questions/${question.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete question');
        return;
      }

      fetchQuestions();
    } catch (err) {
      console.error(err);
      alert('Failed to delete question');
    }
  };

  const handleMoveUp = async (question: ChallengeQuestion) => {
    const currentIndex = questions.findIndex((q) => q.id === question.id);
    if (currentIndex <= 0) return;

    const newQuestions = [...questions];
    [newQuestions[currentIndex - 1], newQuestions[currentIndex]] =
      [newQuestions[currentIndex], newQuestions[currentIndex - 1]];

    await reorderQuestions(newQuestions);
  };

  const handleMoveDown = async (question: ChallengeQuestion) => {
    const currentIndex = questions.findIndex((q) => q.id === question.id);
    if (currentIndex >= questions.length - 1) return;

    const newQuestions = [...questions];
    [newQuestions[currentIndex], newQuestions[currentIndex + 1]] =
      [newQuestions[currentIndex + 1], newQuestions[currentIndex]];

    await reorderQuestions(newQuestions);
  };

  const reorderQuestions = async (newOrder: ChallengeQuestion[]) => {
    try {
      // Update display_order for all questions
      const updates = newOrder.map((q, index) => ({
        id: q.id,
        display_order: index,
      }));

      // In a real implementation, you'd have a bulk reorder endpoint
      // For now, update each question individually
      for (const update of updates) {
        await fetch(`/api/challenges/${challengeId}/questions/${update.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_order: update.display_order }),
        });
      }

      setQuestions(newOrder);
    } catch (err) {
      console.error(err);
      alert('Failed to reorder questions');
      fetchQuestions();
    }
  };

  const handleEditQuestion = (question: ChallengeQuestion) => {
    // For now, we'll just show a message
    // In a full implementation, you'd populate the form with existing data
    alert('Edit functionality coming soon! For now, please delete and recreate the question.');
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-blue-100 text-blue-700',
      open: 'bg-green-100 text-green-700',
      closed: 'bg-amber-100 text-amber-700',
      grading: 'bg-purple-100 text-purple-700',
      completed: 'bg-teal-100 text-teal-700',
    };
    return <Badge className={colors[status] || 'bg-gray-100 text-gray-700'}>{status}</Badge>;
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const isReadOnly = challenge && challenge.status !== 'draft';

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>Challenge not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
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
            <h1 className="text-2xl font-bold text-gray-900">{challenge.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(challenge.status)}
              {isReadOnly && (
                <span className="text-xs text-amber-600">
                  Questions are read-only when challenge is not in draft status
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowUploadDialog(true)}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload CSV
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const res = await fetch(`/api/challenges/${challengeId}/questions/template`);
                if (!res.ok) throw new Error('Failed to download');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${challenge.name.replace(/[^a-z0-9]/gi, '_')}_questions_template.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              } catch (err) {
                console.error(err);
                alert('Failed to download template');
              }
            }}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download Template
          </Button>
          <Button
            onClick={() => setShowFormDialog(true)}
            className="bg-[#1565C0] hover:bg-[#0D47A1] gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </Button>
        </div>
      )}

      {/* Questions Table */}
      <Card className="border-gray-200">
        <CardContent className="p-0">
          {questions.length === 0 ? (
            <div className="text-center py-12">
              <FileQuestion className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 font-medium mb-1">No questions yet</p>
              <p className="text-sm text-gray-500 mb-4">
                {isReadOnly
                  ? 'This challenge does not have any questions.'
                  : 'Upload a CSV file or add questions manually to get started.'}
              </p>
              {!isReadOnly && (
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowUploadDialog(true)}
                    className="gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload CSV
                  </Button>
                  <Button
                    onClick={() => setShowFormDialog(true)}
                    className="bg-[#1565C0] hover:bg-[#0D47A1] gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Question
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-20">#</TableHead>
                  <TableHead className="w-40">Type</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead className="w-24">Points</TableHead>
                  <TableHead className="w-40 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((question, index) => (
                  <QuestionListItem
                    key={question.id}
                    question={question}
                    index={index}
                    totalQuestions={questions.length}
                    onEdit={handleEditQuestion}
                    onDelete={handleDeleteQuestion}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    readOnly={isReadOnly}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {questions.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-sm text-gray-600">Total Questions:</span>
              <span className="ml-2 font-semibold text-gray-900">{questions.length}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Total Points:</span>
              <span className="ml-2 font-semibold text-gray-900">{totalPoints}</span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Average: {(totalPoints / questions.length).toFixed(1)} points per question
          </div>
        </div>
      )}

      {/* Dialogs */}
      <QuestionUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        challengeId={challengeId}
        challengeName={challenge.name}
        onUploadSuccess={fetchQuestions}
      />

      <QuestionFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        challengeId={challengeId}
        challengeName={challenge.name}
        onSaveSuccess={fetchQuestions}
      />
    </div>
  );
}
