'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Trophy, Medal, AlertCircle } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  user_name: string;
  user_email?: string;
  team_id?: string;
  score: number;
  max_score: number;
  percentage: number;
  time_spent_seconds: number | null;
  submitted_at: string;
  is_current_user: boolean;
}

interface LeaderboardResponse {
  challenge_id: string;
  challenge_name: string;
  entries: LeaderboardEntry[];
  total_participants: number;
  user_rank?: number;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const challengeId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
    fetchLeaderboard();
  }, [user, challengeId]);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`/api/challenges/${challengeId}/leaderboard`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load leaderboard');
      }
      const data = await res.json();
      setLeaderboard(data);
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load leaderboard');
      setLoading(false);
    }
  };

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Medal className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-700" />;
      default:
        return null;
    }
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-500" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {leaderboard?.challenge_name || 'Challenge'} Leaderboard
        </h1>
        <p className="text-gray-600">
          {leaderboard?.total_participants || 0} participants
        </p>
      </div>

      {/* Your Rank Card */}
      {leaderboard?.user_rank && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Your Rank</p>
                <p className="text-2xl font-bold text-blue-700">#{leaderboard.user_rank}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Position</p>
                <p className="text-lg font-semibold text-gray-900">
                  {leaderboard.user_rank <= 3
                    ? ['🥇 Top 3!', '🥈 Great job!', '🥉 Well done!'][leaderboard.user_rank - 1]
                    : leaderboard.user_rank <= 10
                    ? 'Top 10%'
                    : 'Keep practicing!'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
                <TableHead className="text-right">Time</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard?.entries.map((entry) => (
                <TableRow
                  key={`${entry.user_id}-${entry.rank}`}
                  className={entry.is_current_user ? 'bg-blue-50' : undefined}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getMedalIcon(entry.rank)}
                      {!getMedalIcon(entry.rank) && `#${entry.rank}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{entry.user_name}</p>
                      {entry.team_id && (
                        <p className="text-xs text-gray-500">{entry.team_id}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono font-medium">
                      {entry.score} / {entry.max_score}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={entry.percentage >= 80 ? 'default' : entry.percentage >= 60 ? 'secondary' : 'outline'}
                    >
                      {entry.percentage.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-600">
                    {formatTime(entry.time_spent_seconds)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDate(entry.submitted_at)}
                  </TableCell>
                </TableRow>
              ))}
              {leaderboard?.entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No submissions yet. Be the first to complete the challenge!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Scores are finalized after manual grading of essay questions.</p>
      </div>
    </div>
  );
}
