'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Check,
  X,
  ClipboardCheck,
  Clock,
  AlertCircle,
  Printer,
  FileText,
  MapPin,
  Calendar,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  useGetPendingReprintApprovalsQuery,
  useApproveReprintRequestMutation,
} from '@/store/services/workflowApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface PendingApprovalItem {
  id: number;
  reprint_request_id: number;
  ticket_id: number;
  trace_no: string;
  reason: string;
  requested_copies: number;
  notes: string | null;
  location: string;
  total_amount: number;
  ticket_date: string;
  ticket_time: string;
  node_id: number;
  node_name: string;
  node_order: number;
  approval_type: 'ALL' | 'ANY';
  workflow_name: string;
  requested_by_name: string;
  created_at: string;
}

const REASON_LABELS: Record<string, string> = {
  damaged: 'Damaged Ticket',
  lost: 'Lost Ticket',
  print_error: 'Print Error',
  customer_request: 'Customer Request',
  faded: 'Faded/Unreadable',
  other: 'Other',
};

export default function ApprovalsPage() {
  const [selectedItem, setSelectedItem] = useState<PendingApprovalItem | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [pendingAction, setPendingAction] = useState<'APPROVE' | 'REJECT' | null>(null);

  const user = useSelector((state: RootState) => state.auth.user);

  // Fetch pending approvals for current user
  const { data: pendingData, isLoading, refetch } = useGetPendingReprintApprovalsQuery(
    { userId: user?.id || 0, limit: 100, offset: 0 },
    { skip: !user?.id }
  );

  const [approveReprint, { isLoading: isApproving }] = useApproveReprintRequestMutation();

  const pendingApprovals = (pendingData?.data || []) as unknown as PendingApprovalItem[];

  const getReasonLabel = (reason: string) => {
    return REASON_LABELS[reason] || reason;
  };

  const openApprovalDialog = (item: PendingApprovalItem, action: 'APPROVE' | 'REJECT') => {
    setSelectedItem(item);
    setPendingAction(action);
    setApprovalComments('');
    setShowApprovalDialog(true);
  };

  const handleApproval = async () => {
    if (!selectedItem || !pendingAction || !user?.id) return;

    try {
      const result = await approveReprint({
        reprintId: selectedItem.reprint_request_id,
        data: {
          user_id: user.id,
          action: pendingAction,
          comments: approvalComments || undefined,
        },
      }).unwrap();

      setShowApprovalDialog(false);
      setSelectedItem(null);
      setPendingAction(null);
      setApprovalComments('');
      refetch();

      // Show result message
      if (result.data.ticket_status === 'APPROVED') {
        alert('Request has been fully approved!');
      } else if (result.data.ticket_status === 'REJECTED') {
        alert('Request has been rejected.');
      } else if (result.data.moved_to_next_node) {
        alert(`Approved! Moved to next stage: ${result.data.next_node?.name}`);
      } else {
        const remaining = result.data.node_status.total_required - result.data.node_status.approved_count;
        alert(`Your approval recorded. Waiting for ${remaining} more approval(s).`);
      }
    } catch (error: any) {
      console.error('Failed to process approval:', error);
      alert(error?.data?.message || 'Failed to process approval. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <ClipboardCheck className="w-8 h-8" />
          My Approvals
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Review and approve requests assigned to you
        </p>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingApprovals.length}</p>
                <p className="text-sm text-slate-500">Pending Approvals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals List */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
          <CardDescription>
            These requests are waiting for your approval at the current workflow stage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
            </div>
          ) : pendingApprovals.length > 0 ? (
            <div className="space-y-4">
              {pendingApprovals.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Request Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="gap-1">
                          <Printer className="w-3 h-3" />
                          Reprint Request
                        </Badge>
                        <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono">
                          {item.trace_no}
                        </code>
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <FileText className="w-4 h-4" />
                          <span>{getReasonLabel(item.reason)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <MapPin className="w-4 h-4" />
                          <span>{item.location || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <Printer className="w-4 h-4" />
                          <span>{item.requested_copies} copies</span>
                        </div>
                      </div>

                      {/* Workflow Info */}
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium">{item.workflow_name}</span>
                        <ChevronRight className="w-3 h-3" />
                        <Badge variant="secondary" className="text-xs">
                          Stage {item.node_order}: {item.node_name}
                        </Badge>
                        <span className="text-slate-400">•</span>
                        <span>{item.approval_type === 'ALL' ? 'All must approve' : 'Any can approve'}</span>
                      </div>

                      {item.total_amount && (
                        <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                          Amount: LKR {item.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      )}

                      {item.notes && (
                        <p className="text-sm text-slate-500 italic">Note: {item.notes}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => openApprovalDialog(item, 'REJECT')}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => openApprovalDialog(item, 'APPROVE')}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <ClipboardCheck className="w-16 h-16 mb-4 text-slate-300" />
              <p className="text-lg font-medium">No pending approvals</p>
              <p className="text-sm mt-1">You&apos;re all caught up! Check back later.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingAction === 'APPROVE' ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <X className="w-5 h-5 text-red-600" />
              )}
              {pendingAction === 'APPROVE' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogDescription>
              {pendingAction === 'APPROVE'
                ? 'Confirm your approval for this request'
                : 'Confirm rejection of this request'}
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Trace No</span>
                  <code className="text-sm font-mono">{selectedItem.trace_no}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Reason</span>
                  <span className="text-sm">{getReasonLabel(selectedItem.reason)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Copies</span>
                  <span className="text-sm font-medium">{selectedItem.requested_copies}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Stage</span>
                  <Badge variant="secondary">{selectedItem.node_name}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approval-comments">Comments {pendingAction === 'REJECT' && <span className="text-red-500">*</span>}</Label>
                <Textarea
                  id="approval-comments"
                  placeholder={pendingAction === 'APPROVE' 
                    ? "Add any comments (optional)..." 
                    : "Please provide a reason for rejection..."
                  }
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApproval}
              disabled={isApproving || (pendingAction === 'REJECT' && !approvalComments)}
              variant={pendingAction === 'REJECT' ? 'destructive' : 'default'}
              className={pendingAction === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {isApproving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : pendingAction === 'APPROVE' ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirm Approval
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Confirm Rejection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
