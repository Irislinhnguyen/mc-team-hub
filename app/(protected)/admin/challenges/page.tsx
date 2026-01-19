'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { Challenge, ChallengeStatus } from '@/lib/types/challenge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Users,
  FileQuestion,
  Calendar,
  Clock,
  Trophy,
  Settings
} from 'lucide-react';

export default function AdminChallengesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    open_date: '',
    close_date: '',
    duration_minutes: 30,
    max_attempts: 1,
    status: 'draft' as ChallengeStatus,
  });

  useEffect(() => {
    if (!['admin', 'manager'].includes(user?.role || '')) {
      router.push('/challenges');
      return;
    }
    fetchChallenges();
  }, [user]);

  const fetchChallenges = async () => {
    try {
      const res = await fetch('/api/challenges?status=draft,scheduled,open,closed,grading,completed');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setChallenges(data.challenges || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to create');

      setShowCreateDialog(false);
      resetForm();
      fetchChallenges();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async () => {
    if (!editingChallenge) return;

    try {
      const res = await fetch(`/api/challenges/${editingChallenge.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to update');

      setEditingChallenge(null);
      resetForm();
      fetchChallenges();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this challenge?')) return;

    try {
      const res = await fetch(`/api/challenges/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
        return;
      }
      fetchChallenges();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      open_date: '',
      close_date: '',
      duration_minutes: 30,
      max_attempts: 1,
      status: 'draft',
    });
  };

  const openEditDialog = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setFormData({
      name: challenge.name,
      description: challenge.description || '',
      open_date: challenge.open_date.slice(0, 16),
      close_date: challenge.close_date.slice(0, 16),
      duration_minutes: challenge.duration_minutes,
      max_attempts: challenge.max_attempts,
      status: challenge.status,
    });
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Challenge Management</h1>
          <p className="text-gray-600">Create and manage monthly challenges</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-[#1565C0] hover:bg-[#0D47A1]">
          <Plus className="w-4 h-4 mr-2" />
          New Challenge
        </Button>
      </div>

      <Card className="border-gray-200">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Open Date</TableHead>
                <TableHead>Close Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Submissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challenges.map((challenge) => (
                <TableRow key={challenge.id}>
                  <TableCell className="font-medium">{challenge.name}</TableCell>
                  <TableCell>{getStatusBadge(challenge.status)}</TableCell>
                  <TableCell>{formatDate(challenge.open_date)}</TableCell>
                  <TableCell>{formatDate(challenge.close_date)}</TableCell>
                  <TableCell>{challenge.duration_minutes} min</TableCell>
                  <TableCell>{challenge.question_count || 0}</TableCell>
                  <TableCell>{challenge.submission_count || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/admin/challenges/${challenge.id}`)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/challenges/${challenge.id}/leaderboard`)}
                      >
                        <Trophy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(challenge)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(challenge.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {challenges.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No challenges yet. Create your first challenge!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateDialog || !!editingChallenge}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingChallenge(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingChallenge ? 'Edit Challenge' : 'Create New Challenge'}
            </DialogTitle>
            <DialogDescription>
              Fill in the details below to {editingChallenge ? 'update' : 'create'} a challenge.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="January 2025 Challenge"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Challenge description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Open Date</Label>
                <Input
                  type="datetime-local"
                  value={formData.open_date}
                  onChange={(e) => setFormData({ ...formData, open_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Close Date</Label>
                <Input
                  type="datetime-local"
                  value={formData.close_date}
                  onChange={(e) => setFormData({ ...formData, close_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                  min={1}
                />
              </div>
              <div>
                <Label>Max Attempts</Label>
                <Input
                  type="number"
                  value={formData.max_attempts}
                  onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) })}
                  min={1}
                />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as ChallengeStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="status-draft" value="draft">Draft</SelectItem>
                  <SelectItem key="status-scheduled" value="scheduled">Scheduled</SelectItem>
                  <SelectItem key="status-open" value="open">Open</SelectItem>
                  <SelectItem key="status-closed" value="closed">Closed</SelectItem>
                  <SelectItem key="status-completed" value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setEditingChallenge(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={editingChallenge ? handleUpdate : handleCreate} className="bg-[#1565C0] hover:bg-[#0D47A1]">
              {editingChallenge ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
