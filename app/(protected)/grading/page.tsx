'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, FileText, Users } from 'lucide-react';

interface GradingQueueItem {
  id: string;
  answer_id: string;
  challenge_id: string;
  question_id: string;
  submission_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  team_id: string | null;
  question_text: string;
  question_type: string;
  answer_text: string | null;
  current_score: number | null;
  max_score: number;
  graded_by: string | null;
  graded_at: string | null;
}

interface GradingQueueResponse {
  grading_queue: GradingQueueItem[];
  pending_count: number;
}

export default function GradingPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<GradingQueueItem[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<string>('all');
  const [grading, setGrading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Current grading state
  const [currentAnswer, setCurrentAnswer] = useState<GradingQueueItem | null>(null);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');

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

    fetchGradingQueue();
  }, [user]);

  const fetchGradingQueue = async (challengeId?: string) => {
    try {
      const url = challengeId && challengeId !== 'all'
        ? `/api/challenges/${challengeId}/grading`
        : '/api/challenges'; // For now, we'll need to get challenges first

      // Get list of challenges first
      const challengesRes = await fetch('/api/challenges?status=closed,grading,completed');
      if (!challengesRes.ok) throw new Error('Failed to load challenges');

      const challengesData = await challengesRes.json();
      const challenges = challengesData.challenges || [];

      // Get grading queue for each challenge
      const allQueue: GradingQueueItem[] = [];
      for (const challenge of challenges) {
        if (challengeId && challengeId !== 'all' && challenge.id !== challengeId) continue;

        const queueRes = await fetch(`/api/challenges/${challenge.id}/grading`);
        if (queueRes.ok) {
          const queueData: GradingQueueResponse = await queueRes.json();
          allQueue.push(...queueData.grading_queue);
        }
      }

      setQueue(allQueue);
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load grading queue');
      setLoading(false);
    }
  };

  const handleStartGrading = (item: GradingQueueItem) => {
    setCurrentAnswer(item);
    setScore(item.current_score || 0);
    setFeedback('');
    setGrading(item.answer_id);
  };

  const handleSubmitGrade = async () => {
    if (!currentAnswer) return;

    setGrading('submitting');
    setError(null);

    try {
      const res = await fetch(`/api/challenges/${currentAnswer.challenge_id}/grading`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grades: [
            {
              answer_id: currentAnswer.answer_id,
              score: score,
              feedback: feedback,
            },
          ],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit grade');
      }

      setSuccess('Grade submitted successfully!');
      setCurrentAnswer(null);
      setGrading(null);

      // Refresh queue
      setTimeout(() => {
        setSuccess(null);
        fetchGradingQueue(selectedChallenge);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to submit grade');
      setGrading(null);
    }
  };

  const handleCancelGrading = () => {
    setCurrentAnswer(null);
    setScore(0);
    setFeedback('');
    setGrading(null);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Grading Queue</h1>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (currentAnswer) {
    // Grading Mode
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={handleCancelGrading} className="mb-4">
          ← Back to Queue
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Grade Essay Answer</CardTitle>
            <CardDescription>
              {currentAnswer.user_name} • {currentAnswer.team_id || 'No team'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question */}
            <div>
              <Label>Question</Label>
              <div className="mt-2 p-4 bg-gray-50 rounded border border-gray-200">
                <p className="whitespace-pre-wrap">{currentAnswer.question_text}</p>
              </div>
              <p className="text-sm text-gray-500 mt-1">Max points: {currentAnswer.max_score}</p>
            </div>

            {/* Student Answer */}
            <div>
              <Label>Student Answer</Label>
              <div className="mt-2 p-4 bg-blue-50 rounded border border-blue-200">
                <p className="whitespace-pre-wrap">{currentAnswer.answer_text || '(No answer provided)'}</p>
              </div>
            </div>

            {/* Grading */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="score">Score (0 - {currentAnswer.max_score})</Label>
                <Input
                  id="score"
                  type="number"
                  min={0}
                  max={currentAnswer.max_score}
                  step={0.5}
                  value={score}
                  onChange={(e) => setScore(parseFloat(e.target.value) || 0)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="feedback">Feedback (optional)</Label>
                <Input
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Brief feedback..."
                  className="mt-2"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">{success}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelGrading}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitGrade}
                disabled={grading === 'submitting'}
                className="bg-[#1565C0] hover:bg-[#0D47A1]"
              >
                {grading === 'submitting' ? 'Submitting...' : 'Submit Grade'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Queue View
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grading Queue</h1>
          <p className="text-gray-600">Grade essay answers from your team members</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {queue.length} pending
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {queue.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-600">No pending essay answers to grade.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {queue.map((item) => (
            <Card key={item.answer_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{item.user_name}</span>
                      {item.team_id && (
                        <Badge variant="outline" className="text-xs">
                          {item.team_id}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {item.question_text}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Max points: {item.max_score}</span>
                      <span>•</span>
                      <span>Current grade: {item.current_score ?? 'Not graded'}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleStartGrading(item)}
                    className="bg-[#1565C0] hover:bg-[#0D47A1]"
                  >
                    Grade
                  </Button>
                </div>

                {/* Answer Preview */}
                <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {item.answer_text || '(No answer provided)'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
