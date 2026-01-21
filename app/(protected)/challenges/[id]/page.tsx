'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { Challenge, ChallengeQuestion, ChallengeSubmission } from '@/lib/types/challenge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Clock, AlertCircle, Save, CheckCircle2 } from 'lucide-react';
import { DragDropQuestion } from '@/components/challenges/DragDropQuestion';

const AUTO_SAVE_INTERVAL = 15000; // Auto-save every 15 seconds

export default function TakeChallengePage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const challengeId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [submission, setSubmission] = useState<ChallengeSubmission | null>(null);
  const [questions, setQuestions] = useState<ChallengeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
    startChallenge();

    return () => {
      isMountedRef.current = false;
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [user, challengeId]);

  // Timer countdown
  useEffect(() => {
    if (!submission || timeLeft <= 0) return;

    const timer = setInterval(() => {
      if (isMountedRef.current) {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit(); // Auto-submit on timeout
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [submission, timeLeft]);

  // Auto-save functionality
  useEffect(() => {
    if (!submission || submitting) return;

    const scheduleAutoSave = () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        if (isMountedRef.current && !submitting) {
          saveAnswers(true); // true = silent save
        }
        scheduleAutoSave();
      }, AUTO_SAVE_INTERVAL);
    };

    scheduleAutoSave();

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [submission, answers, submitting]);

  const startChallenge = async () => {
    try {
      const challengeRes = await fetch(`/api/challenges/${challengeId}`);
      if (!challengeRes.ok) throw new Error('Failed to load challenge');
      const challengeData = await challengeRes.json();
      const challenge = challengeData.challenge;

      if (challenge.status !== 'open') {
        setError('This challenge is not currently open');
        setLoading(false);
        setStarting(false);
        return;
      }

      const now = new Date();
      const openDate = new Date(challenge.open_date);
      const closeDate = new Date(challenge.close_date);

      if (now < openDate) {
        setError(`This challenge opens on ${openDate.toLocaleString()}`);
        setLoading(false);
        setStarting(false);
        return;
      }

      if (now > closeDate) {
        setError('This challenge has closed');
        setLoading(false);
        setStarting(false);
        return;
      }

      const startRes = await fetch(`/api/challenges/${challengeId}/submissions`, {
        method: 'POST',
      });

      if (!startRes.ok) {
        const data = await startRes.json();
        setError(data.error || 'Failed to start challenge');
        setLoading(false);
        setStarting(false);
        return;
      }

      const startData = await startRes.json();
      const newSubmission = startData.submission;

      const questionsRes = await fetch(`/api/challenges/${challengeId}/questions`);
      if (!questionsRes.ok) throw new Error('Failed to load questions');

      const questionsData = await questionsRes.json();

      setChallenge(challenge);
      setSubmission(newSubmission);
      setQuestions(questionsData.questions || []);

      const durationSeconds = challenge.duration_minutes * 60;
      setTimeLeft(durationSeconds);

      setLoading(false);
      setStarting(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to start challenge');
      setLoading(false);
      setStarting(false);
    }
  };

  // Save answers (auto-save or manual)
  const saveAnswers = async (silent = false) => {
    if (!submission) return;

    if (!silent) setSaving(true);

    try {
      const answerArray = Object.entries(answers).map(([questionId, value]) => {
        const question = questions.find((q) => q.id === questionId);
        if (!question) return null;

        switch (question.question_type) {
          case 'essay':
            return { question_id: questionId, answer_text: value || '' };
          case 'cloze':
            return { question_id: questionId, answer_data: value || {} };
          case 'drag_drop':
            return { question_id: questionId, answer_data: value || {} };
          default:
            return { question_id: questionId };
        }
      }).filter(Boolean);

      if (answerArray.length === 0) {
        if (!silent) setSaving(false);
        return;
      }

      const res = await fetch(
        `/api/challenges/${challengeId}/submissions/${submission.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers: answerArray,
            submit: false, // Just save, don't submit
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        console.error('Save error:', data.error);
        return;
      }

      setLastSaved(new Date());

      if (!silent) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Auto-save error:', err);
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!submission) return;

    setSubmitting(true);
    setError(null);

    try {
      const answerArray = questions.map((q) => {
        const answer = answers[q.id];

        switch (q.question_type) {
          case 'essay':
            return { question_id: q.id, answer_text: answer || '' };
          case 'cloze':
            return { question_id: q.id, answer_data: answer || {} };
          case 'drag_drop':
            return { question_id: q.id, answer_data: answer || {} };
          default:
            return { question_id: q.id };
        }
      });

      const res = await fetch(
        `/api/challenges/${challengeId}/submissions/${submission.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answers: answerArray,
            submit: true,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }

      const data = await res.json();

      if (data.needs_manual_grading) {
        router.push('/challenges?submitted=true');
      } else {
        router.push(`/challenges/${challengeId}/leaderboard`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to submit challenge');
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQuestion = (question: ChallengeQuestion, index: number) => {
    return (
      <Card key={question.id} className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">
              {index + 1}
            </span>
            <span className="text-sm text-gray-500">
              {question.question_type === 'essay' && 'Essay'}
              {question.question_type === 'cloze' && 'Fill in the Blanks'}
              {question.question_type === 'drag_drop' && 'Drag and Drop'}
            </span>
            <Badge variant="outline" className="ml-auto">
              {question.points} pt{question.points > 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 whitespace-pre-wrap">{question.question_text}</p>

          {question.question_type === 'essay' && (
            <Textarea
              placeholder="Enter your answer here..."
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              rows={6}
              className="w-full"
            />
          )}

          {question.question_type === 'cloze' && (
            <ClozeQuestionRenderer
              question={question}
              value={answers[question.id] || {}}
              onChange={(value) => handleAnswerChange(question.id, value)}
            />
          )}

          {question.question_type === 'drag_drop' && (
            <DragDropQuestion
              question={question}
              value={answers[question.id] || {}}
              onChange={(value) => handleAnswerChange(question.id, value)}
            />
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading || starting) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error && !challenge) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).filter((key) => {
    const answer = answers[key];
    if (typeof answer === 'string') return answer.trim().length > 0;
    if (typeof answer === 'object') return Object.keys(answer).length > 0;
    return false;
  }).length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-4">
          {lastSaved && (
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Saved {lastSaved.toLocaleTimeString()}
            </div>
          )}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono ${timeLeft < 300 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Challenge Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{challenge?.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">{challenge?.description}</p>
          <div className="flex gap-4 mt-4 text-sm text-gray-500">
            <span>{questions.length} questions</span>
            <span>•</span>
            <span>{challenge?.duration_minutes} minutes</span>
            <span>•</span>
            <span>{challenge?.max_attempts} attempt(s)</span>
          </div>
        </CardContent>
      </Card>

      {/* Auto-save indicator */}
      {saveSuccess && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">Progress saved automatically</AlertDescription>
        </Alert>
      )}

      {/* Questions */}
      {questions.map((q, i) => renderQuestion(q, i))}

      {/* Submit */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                {answeredCount} of {questions.length} questions answered
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveAnswers(false)}
                disabled={saving || submitting}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Progress'}
              </Button>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#1565C0] hover:bg-[#0D47A1]"
            >
              {submitting ? 'Submitting...' : 'Submit Challenge'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Cloze Question Renderer Component
function ClozeQuestionRenderer({
  question,
  value,
  onChange,
}: {
  question: ChallengeQuestion;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
}) {
  const options = question.options as any;

  if (!options || !options.gaps) {
    return <p className="text-sm text-gray-500">Invalid cloze question format</p>;
  }

  const parts = question.question_text.split(/(\{\d+\})/);

  return (
    <div className="space-y-4">
      <p className="whitespace-pre-wrap">
        {parts.map((part, index) => {
          const gapMatch = part.match(/\{(\d+)\}/);
          if (gapMatch) {
            const gapId = `gap-${gapMatch[1]}`;
            const gap = options.gaps.find((g: any) => g.id === gapId);

            if (!gap) {
              return <span key={index} className="text-red-500">[Unknown Gap]</span>;
            }

            return (
              <Select
                key={index}
                value={value[gapId] || ''}
                onValueChange={(selectedValue) => {
                  onChange({
                    ...value,
                    [gapId]: selectedValue,
                  });
                }}
              >
                <SelectTrigger className="inline-flex w-40 mx-1">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {gap.choices.map((choice: string, i: number) => (
                    <SelectItem key={i} value={choice}>
                      {choice}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }

          return <span key={index}>{part}</span>;
        })}
      </p>
    </div>
  );
}
