'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { Challenge, ChallengeStatus } from '@/lib/types/challenge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Clock, Calendar, FileText, Lock, CheckCircle2, XCircle } from 'lucide-react';

export default function ChallengesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [myAttempts, setMyAttempts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
      return;
    }
    if (user) {
      fetchChallenges();
      fetchMyAttempts();
    }
  }, [user, authLoading]);

  const fetchChallenges = async () => {
    try {
      const res = await fetch('/api/challenges?status=open,closed,grading,completed');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setChallenges(data.challenges || []);
    } catch (err) {
      console.error(err);
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAttempts = async () => {
    try {
      // Get all submissions for current user
      const allChallengesRes = await fetch('/api/challenges?status=open,closed,grading,completed');
      if (!allChallengesRes.ok) return;

      const allChallengesData = await allChallengesRes.json();
      const challengeIds = allChallengesData.challenges?.map((c: Challenge) => c.id) || [];

      // For each challenge, get attempt count
      const attemptsMap = new Map<string, number>();
      for (const challengeId of challengeIds) {
        try {
          const res = await fetch(`/api/challenges/${challengeId}/submissions`);
          if (res.ok) {
            const data = await res.json();
            const userSubmissions = data.submissions?.filter((s: any) => s.user_id === user?.sub) || [];
            attemptsMap.set(challengeId, userSubmissions.length);
          }
        } catch (e) {
          // Skip failed requests
        }
      }

      setMyAttempts(attemptsMap);
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: ChallengeStatus, canTake: boolean, attemptsUsed: number, maxAttempts: number) => {
    if (!canTake) {
      if (status === 'completed') {
        return <Badge className="bg-teal-100 text-teal-700"><Lock className="w-3 h-3 mr-1" /> Completed</Badge>;
      }
      if (attemptsUsed >= maxAttempts) {
        return <Badge className="bg-gray-100 text-gray-700"><Lock className="w-3 h-3 mr-1" /> No attempts left</Badge>;
      }
      return <Badge className="bg-gray-100 text-gray-700"><Lock className="w-3 h-3 mr-1" /> Closed</Badge>;
    }

    switch (status) {
      case 'open':
        return <Badge className="bg-green-100 text-green-700">Open Now</Badge>;
      case 'closed':
      case 'grading':
        return <Badge className="bg-amber-100 text-amber-700">In Grading</Badge>;
      case 'completed':
        return <Badge className="bg-teal-100 text-teal-700"><CheckCircle2 className="w-3 h-3 mr-1" /> Results Published</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">{status}</Badge>;
    }
  };

  const canTakeChallenge = (challenge: Challenge): boolean => {
    const now = new Date();
    const openDate = new Date(challenge.open_date);
    const closeDate = new Date(challenge.close_date);
    const attempts = myAttempts.get(challenge.id) || 0;

    return now >= openDate && now <= closeDate && attempts < challenge.max_attempts;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading || authLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Monthly Challenges</h1>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Monthly Challenges</h1>
        <p className="text-gray-600">Test your knowledge and compete on the leaderboard</p>
      </div>

      {challenges.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges available</h3>
            <p className="text-gray-600">Check back later for new monthly challenges!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {challenges.map((challenge) => {
            const canTake = canTakeChallenge(challenge);
            const attempts = myAttempts.get(challenge.id) || 0;
            const hasResults = challenge.status === 'completed' && attempts > 0;

            return (
              <Card key={challenge.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {challenge.name}
                        {getStatusBadge(challenge.status, canTake, attempts, challenge.max_attempts)}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {challenge.description || 'No description provided'}
                      </CardDescription>
                    </div>
                    <Trophy className="w-8 h-8 text-amber-500" />
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Opens: {formatDate(challenge.open_date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Duration: {challenge.duration_minutes} minutes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      <span>
                        {challenge.question_count || 0} questions • {attempts}/{challenge.max_attempts} attempts
                      </span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {challenge.status === 'open' && new Date() < new Date(challenge.close_date) && (
                      <span>Closes: {formatDate(challenge.close_date)}</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {hasResults && (
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/challenges/${challenge.id}/leaderboard`)}
                      >
                        <Trophy className="w-4 h-4 mr-2" />
                        View Results
                      </Button>
                    )}

                    {canTake ? (
                      <Button
                        className="bg-[#1565C0] hover:bg-[#0D47A1]"
                        onClick={() => router.push(`/challenges/${challenge.id}`)}
                      >
                        {attempts > 0 ? 'Retake Challenge' : 'Start Challenge'}
                      </Button>
                    ) : (
                      <Button variant="outline" disabled>
                        <Lock className="w-4 h-4 mr-2" />
                        {attempts >= challenge.max_attempts ? 'No attempts left' : 'Not available'}
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
