'use client';

import { Badge } from '@/components/ui/badge';
import { AdminTable, Column } from '@/app/components/admin/AdminTable';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export type SubmissionStatus = 'in_progress' | 'submitted' | 'grading' | 'pending_review' | 'approved' | 'published';

export interface PendingSubmission {
  id: string;
  challenge_id: string;
  challenge_name: string;
  user_id: string;
  user_name: string;
  user_email: string;
  team_id: string | null;
  status: SubmissionStatus;
  final_score?: number;
  final_score_max?: number;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalQueueTableProps {
  submissions: PendingSubmission[];
  loading?: boolean;
  onRowClick: (submissionId: string) => void;
  filters?: {
    challengeId?: string;
    teamId?: string;
    leaderId?: string;
  };
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const variants: Record<SubmissionStatus, { label: string; className: string }> = {
    in_progress: { label: 'In Progress', className: 'bg-gray-100 text-gray-700' },
    submitted: { label: 'Submitted', className: 'bg-gray-100 text-gray-700' },
    grading: { label: 'Graded', className: 'bg-gray-100 text-gray-700' },
    pending_review: { label: 'Pending Review', className: 'bg-amber-100 text-amber-700' },
    approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700' },
    published: { label: 'Published', className: 'bg-blue-100 text-blue-700' },
  };

  const variant = variants[status] || variants.pending_review;

  return (
    <Badge className={variant.className}>
      {variant.label}
    </Badge>
  );
}

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'N/A';
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return 'Invalid date';
  }
}

export function ApprovalQueueTable({
  submissions,
  loading = false,
  onRowClick,
  filters,
}: ApprovalQueueTableProps) {
  // Define table columns
  const columns: Column<PendingSubmission>[] = [
    {
      key: 'challenge',
      header: 'Challenge',
      render: (row) => (
        <div className="font-medium text-gray-900">{row.challenge_name}</div>
      ),
    },
    {
      key: 'student',
      header: 'Student',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.user_name}</div>
          <div className="text-xs text-gray-500">{row.user_email}</div>
        </div>
      ),
    },
    {
      key: 'team',
      header: 'Team',
      render: (row) => (
        <div className="text-gray-600">{row.team_id || 'Unassigned'}</div>
      ),
    },
    {
      key: 'submitted',
      header: 'Submitted',
      render: (row) => (
        <div className="text-sm text-gray-600 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTimeAgo(row.submitted_at)}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  // Empty state
  if (!loading && submissions.length === 0) {
    return (
      <div className="text-center py-12 px-6 bg-white rounded-lg border border-gray-200">
        <div className="text-gray-500 mb-2">No submissions pending review</div>
        <div className="text-sm text-gray-400">
          All submissions have been reviewed. Check back later when Leaders submit new grades.
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-12 px-6 bg-white rounded-lg border border-gray-200">
        <div className="text-gray-500">Loading approvals...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <AdminTable
        data={submissions}
        columns={columns}
        onRowClick={(row) => onRowClick(row.id)}
      />
    </div>
  );
}
