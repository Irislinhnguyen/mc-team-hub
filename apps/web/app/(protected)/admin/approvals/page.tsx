'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { AdminHeader } from '@/app/components/admin/AdminHeader';
import { ApprovalQueueTable, ApprovalDetailView, PendingSubmission } from '@/app/components/admin/approvals';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Filter } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type SubmissionStatus = 'in_progress' | 'submitted' | 'grading' | 'pending_review' | 'approved' | 'published';

export const dynamic = 'force-dynamic';

interface Filters {
  challengeId: string;
  teamId: string;
  leaderId: string;
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [filters, setFilters] = useState<Filters>({
    challengeId: '',
    teamId: '',
    leaderId: '',
  });
  const [error, setError] = useState<string | null>(null);

  // Filter options (in real implementation, these would come from APIs)
  const [challenges] = useState<Array<{ id: string; name: string }>>([]);
  const [teams] = useState<Array<{ id: string; name: string }>>([]);
  const [leaders] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }

    // Only Admin/Manager can access approvals
    if (!['admin', 'manager'].includes(user.role)) {
      router.push('/');
      return;
    }

    fetchPendingSubmissions();
  }, [user, filters]);

  const fetchPendingSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (filters.challengeId) queryParams.append('challengeId', filters.challengeId);
      if (filters.teamId) queryParams.append('teamId', filters.teamId);
      if (filters.leaderId) queryParams.append('leaderId', filters.leaderId);

      const res = await fetch(`/api/approvals/pending?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to load pending submissions');
      }

      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch (err: any) {
      console.error('Error fetching pending submissions:', err);
      setError(err.message || 'Failed to load pending submissions');
      toast({
        title: 'Error',
        description: err.message || 'Failed to load pending submissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (submissionId: string) => {
    const index = submissions.findIndex((s) => s.id === submissionId);
    setCurrentIndex(index);
    setSelectedSubmissionId(submissionId);
  };

  const handleNext = () => {
    if (currentIndex < submissions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setSelectedSubmissionId(submissions[nextIndex].id);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setSelectedSubmissionId(submissions[prevIndex].id);
    }
  };

  const handleClose = () => {
    setSelectedSubmissionId(null);
    setCurrentIndex(-1);
    // Refresh the list
    fetchPendingSubmissions();
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    // Reset selection when filters change
    setSelectedSubmissionId(null);
    setCurrentIndex(-1);
  };

  const handleClearFilters = () => {
    setFilters({
      challengeId: '',
      teamId: '',
      leaderId: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <AdminHeader
        title="Approvals"
        description="Review and approve graded submissions from Leaders"
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-500" />
            <h3 className="font-medium text-sm">Filters</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="ml-auto">
                Clear all
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Challenge Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Challenge</label>
              <Select
                value={filters.challengeId}
                onValueChange={(value) => handleFilterChange('challengeId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All challenges" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All challenges</SelectItem>
                  {challenges.map((challenge) => (
                    <SelectItem key={challenge.id} value={challenge.id}>
                      {challenge.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Team</label>
              <Select
                value={filters.teamId}
                onValueChange={(value) => handleFilterChange('teamId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Leader Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Leader</label>
              <Select
                value={filters.leaderId}
                onValueChange={(value) => handleFilterChange('leaderId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All leaders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All leaders</SelectItem>
                  {leaders.map((leader) => (
                    <SelectItem key={leader.id} value={leader.id}>
                      {leader.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* List View */}
      {!loading && !error && !selectedSubmissionId && (
        <ApprovalQueueTable
          submissions={submissions}
          loading={loading}
          onRowClick={handleRowClick}
          filters={hasActiveFilters ? filters : undefined}
        />
      )}

      {/* Detail View */}
      {!loading && !error && selectedSubmissionId && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to list
          </Button>
          <ApprovalDetailView
            submissionId={selectedSubmissionId}
            onClose={handleClose}
            onNext={handleNext}
            onPrevious={handlePrevious}
            hasNext={currentIndex < submissions.length - 1}
            hasPrevious={currentIndex > 0}
          />
        </div>
      )}
    </div>
  );
}
