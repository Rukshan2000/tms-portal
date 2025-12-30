'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Check, 
  X, 
  Printer,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter
} from 'lucide-react';
import { 
  useGetReprintRequestsQuery, 
  useUpdateReprintRequestStatusMutation,
  ReprintRequest 
} from '@/store/services/reprintRequestApi';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: XCircle,
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    icon: CheckCircle,
  },
};

const REASON_LABELS: Record<string, string> = {
  damaged: 'Damaged Ticket',
  lost: 'Lost Ticket',
  print_error: 'Print Error',
  customer_request: 'Customer Request',
  faded: 'Faded/Unreadable',
  other: 'Other',
};

export default function ReprintRequestsPage() {
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<ReprintRequest | null>(null);
  const [mobileDisplayCount, setMobileDisplayCount] = useState(10);

  const { data: requestsData, isLoading } = useGetReprintRequestsQuery({
    limit: 500,
    offset: 0,
  });

  const [updateStatus, { isLoading: isUpdating }] = useUpdateReprintRequestStatusMutation();

  const requests = requestsData?.data || [];

  // Filter requests by status
  const filteredRequests = useMemo(() => {
    let result = [...requests];
    
    if (statusFilter !== 'all') {
      result = result.filter(req => req.status === statusFilter);
    }

    // Sort by created_at descending
    return result.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [requests, statusFilter]);

  // Paginate filtered results
  const paginatedRequests = useMemo(() => {
    return filteredRequests.slice(offset, offset + limit);
  }, [filteredRequests, offset, limit]);

  // Mobile requests with "show more"
  const mobileRequests = useMemo(() => {
    return filteredRequests.slice(0, mobileDisplayCount);
  }, [filteredRequests, mobileDisplayCount]);

  const hasMoreMobileRequests = mobileDisplayCount < filteredRequests.length;

  const loadMoreMobile = () => {
    setMobileDisplayCount((prev) => Math.min(prev + 10, filteredRequests.length));
  };

  // Status counts
  const statusCounts = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      completed: requests.filter(r => r.status === 'completed').length,
    };
  }, [requests]);

  const handleStatusUpdate = async (id: number, newStatus: 'approved' | 'rejected' | 'completed') => {
    try {
      await updateStatus({ id, status: newStatus }).unwrap();
      setSelectedRequest(null);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handlePrevious = () => {
    if (offset >= limit) {
      setOffset(offset - limit);
    }
  };

  const handleNext = () => {
    if (offset + limit < filteredRequests.length) {
      setOffset(offset + limit);
    }
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(filteredRequests.length / limit);

  const getReasonLabel = (reason: string) => {
    return REASON_LABELS[reason] || reason;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Reprint Requests
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Manage and process ticket reprint requests
        </p>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => { setStatusFilter('all'); setOffset(0); }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium">All</span>
            </div>
            <p className="text-2xl font-bold mt-1">{statusCounts.all}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => { setStatusFilter('pending'); setOffset(0); }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold mt-1">{statusCounts.pending}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'approved' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => { setStatusFilter('approved'); setOffset(0); }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Approved</span>
            </div>
            <p className="text-2xl font-bold mt-1">{statusCounts.approved}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'rejected' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => { setStatusFilter('rejected'); setOffset(0); }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">Rejected</span>
            </div>
            <p className="text-2xl font-bold mt-1">{statusCounts.rejected}</p>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'completed' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => { setStatusFilter('completed'); setOffset(0); }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Completed</span>
            </div>
            <p className="text-2xl font-bold mt-1">{statusCounts.completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg">
              Reprint Requests
              <span className="text-slate-500 font-normal ml-2">
                ({filteredRequests.length}{statusFilter !== 'all' ? ` ${statusFilter}` : ''})
              </span>
            </CardTitle>
            <div className="hidden md:block text-sm text-slate-500">
              Page {currentPage} of {totalPages || 1}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
            </div>
          ) : filteredRequests.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {mobileRequests.map((request) => {
                  const StatusIcon = STATUS_CONFIG[request.status].icon;
                  return (
                    <div
                      key={request.id}
                      className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <code className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded font-mono truncate">
                              {request.trace_no}
                            </code>
                            <Badge className={STATUS_CONFIG[request.status].color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {STATUS_CONFIG[request.status].label}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                            {getReasonLabel(request.reason)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(request.created_at).toLocaleDateString()} • {request.requested_copies} copies
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-2"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        {request.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleStatusUpdate(request.id, 'approved')}
                              disabled={isUpdating}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleStatusUpdate(request.id, 'rejected')}
                              disabled={isUpdating}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {request.status === 'approved' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleStatusUpdate(request.id, 'completed')}
                            disabled={isUpdating}
                          >
                            <Printer className="w-4 h-4" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Show More Button */}
                {hasMoreMobileRequests && (
                  <div className="pt-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={loadMoreMobile}
                    >
                      Show More ({filteredRequests.length - mobileDisplayCount} remaining)
                    </Button>
                  </div>
                )}

                <p className="text-center text-xs text-slate-500 pt-2">
                  Showing {mobileRequests.length} of {filteredRequests.length} requests
                </p>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                      <TableHead className="font-semibold">ID</TableHead>
                      <TableHead className="font-semibold">Trace No</TableHead>
                      <TableHead className="font-semibold">Reason</TableHead>
                      <TableHead className="font-semibold">Copies</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Requested</TableHead>
                      <TableHead className="font-semibold text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRequests.map((request) => {
                      const StatusIcon = STATUS_CONFIG[request.status].icon;
                      return (
                        <TableRow key={request.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <TableCell className="font-medium">#{request.id}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono">
                              {request.trace_no}
                            </code>
                          </TableCell>
                          <TableCell className="text-sm">{getReasonLabel(request.reason)}</TableCell>
                          <TableCell className="text-sm font-medium">{request.requested_copies}</TableCell>
                          <TableCell>
                            <Badge className={STATUS_CONFIG[request.status].color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {STATUS_CONFIG[request.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {new Date(request.created_at).toLocaleDateString()}{' '}
                            {new Date(request.created_at).toLocaleTimeString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedRequest(request)}
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {request.status === 'pending' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleStatusUpdate(request.id, 'approved')}
                                    disabled={isUpdating}
                                    title="Approve"
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleStatusUpdate(request.id, 'rejected')}
                                    disabled={isUpdating}
                                    title="Reject"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {request.status === 'approved' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStatusUpdate(request.id, 'completed')}
                                  disabled={isUpdating}
                                  title="Mark as Completed"
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Desktop Pagination */}
              <div className="hidden md:flex items-center justify-between mt-6">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Showing {offset + 1} to {Math.min(offset + limit, filteredRequests.length)} of {filteredRequests.length} requests
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={offset === 0 || isLoading}
                    className="gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={offset + limit >= filteredRequests.length || isLoading}
                    className="gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Items per page selector */}
              <div className="hidden md:flex mt-4 items-center gap-2 text-sm">
                <label className="text-slate-600 dark:text-slate-400">Items per page:</label>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setOffset(0);
                  }}
                  className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium">No reprint requests found</p>
                <p className="text-sm mt-1">
                  {statusFilter !== 'all' 
                    ? `No ${statusFilter} requests at the moment` 
                    : 'No reprint requests have been submitted yet'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Detail Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Reprint Request Details
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Request ID</span>
                <span className="font-semibold">#{selectedRequest.id}</span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Trace Number</p>
                <code className="text-sm font-mono font-semibold">{selectedRequest.trace_no}</code>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <Badge className={STATUS_CONFIG[selectedRequest.status].color}>
                  {STATUS_CONFIG[selectedRequest.status].label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Reason</p>
                  <p className="text-sm font-medium">{getReasonLabel(selectedRequest.reason)}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Copies Requested</p>
                  <p className="text-lg font-bold">{selectedRequest.requested_copies}</p>
                </div>
              </div>

              {selectedRequest.notes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Notes</p>
                  <p className="text-sm">{selectedRequest.notes}</p>
                </div>
              )}

              {selectedRequest.location && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Ticket Location</p>
                  <p className="text-sm font-medium">{selectedRequest.location}</p>
                </div>
              )}

              {selectedRequest.total_amount && (
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-xs text-green-600 dark:text-green-400 mb-1">Ticket Amount</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    LKR {selectedRequest.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Requested At</p>
                <p className="text-sm font-medium">
                  {new Date(selectedRequest.created_at).toLocaleDateString()}{' '}
                  {new Date(selectedRequest.created_at).toLocaleTimeString()}
                </p>
              </div>

              {selectedRequest.approved_at && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">
                    {selectedRequest.status === 'rejected' ? 'Rejected' : 'Approved'} At
                  </p>
                  <p className="text-sm font-medium">
                    {new Date(selectedRequest.approved_at).toLocaleDateString()}{' '}
                    {new Date(selectedRequest.approved_at).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Close
            </Button>
            {selectedRequest?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleStatusUpdate(selectedRequest.id, 'rejected')}
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                  Reject
                </Button>
                <Button
                  onClick={() => handleStatusUpdate(selectedRequest.id, 'approved')}
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Approve
                </Button>
              </>
            )}
            {selectedRequest?.status === 'approved' && (
              <Button
                onClick={() => handleStatusUpdate(selectedRequest.id, 'completed')}
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Printer className="w-4 h-4 mr-2" />}
                Mark Completed
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
