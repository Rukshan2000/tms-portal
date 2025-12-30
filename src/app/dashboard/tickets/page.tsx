'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ChevronLeft, ChevronRight, Plus, X, Filter, Eye, MapPin, Calendar, Clock, Printer } from 'lucide-react';
import { useGetTicketsQuery, Ticket } from '@/store/services/ticketApi';
import { useCreateReprintRequestMutation } from '@/store/services/reprintRequestApi';
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

// Filter field options
const FILTER_FIELDS = [
  { value: 'trace_no', label: 'Trace No', type: 'string' },
  { value: 'location', label: 'Location', type: 'string' },
  { value: 'terminal_id', label: 'Terminal ID', type: 'string' },
  { value: 'date', label: 'Date', type: 'date' },
  { value: 'no_tickets', label: 'Tickets Count', type: 'number' },
  { value: 'total_amount', label: 'Total Amount', type: 'number' },
  { value: 'ticket_amount_pp', label: 'Amount per Ticket', type: 'number' },
];

// Operators based on field type
const STRING_OPERATORS = [
  { value: 'equals', label: 'is' },
  { value: 'not_equals', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
];

const NUMBER_OPERATORS = [
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '≠' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'greater_equal', label: 'greater or equal' },
  { value: 'less_than', label: 'less than' },
  { value: 'less_equal', label: 'less or equal' },
];

const DATE_OPERATORS = [
  { value: 'equals', label: 'is' },
  { value: 'not_equals', label: 'is not' },
  { value: 'before', label: 'before' },
  { value: 'after', label: 'after' },
];

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export default function TicketsPage() {
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [mobileDisplayCount, setMobileDisplayCount] = useState(10);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [showFilterBuilder, setShowFilterBuilder] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [reprintTicket, setReprintTicket] = useState<Ticket | null>(null);
  const [reprintReason, setReprintReason] = useState('');
  const [reprintCopies, setReprintCopies] = useState(1);
  const [reprintNotes, setReprintNotes] = useState('');

  // New filter state
  const [newFilterField, setNewFilterField] = useState('');
  const [newFilterOperator, setNewFilterOperator] = useState('');
  const [newFilterValue, setNewFilterValue] = useState('');

  const { data: ticketsData, isLoading } = useGetTicketsQuery({
    limit: 500, // Fetch more for client-side filtering
    offset: 0,
  });

  const [requestReprint, { isLoading: isReprintLoading }] = useCreateReprintRequestMutation();

  const tickets = useMemo(() => ticketsData?.data || [], [ticketsData?.data]);

  // Get operators based on field type
  const getOperatorsForField = (fieldValue: string) => {
    const field = FILTER_FIELDS.find((f) => f.value === fieldValue);
    if (!field) return STRING_OPERATORS;
    
    switch (field.type) {
      case 'number':
        return NUMBER_OPERATORS;
      case 'date':
        return DATE_OPERATORS;
      default:
        return STRING_OPERATORS;
    }
  };

  // Apply filter condition to ticket
  const applyFilter = (ticket: Ticket, filter: FilterCondition): boolean => {
    const field = FILTER_FIELDS.find((f) => f.value === filter.field);
    if (!field) return true;

    const ticketValue = ticket[filter.field as keyof Ticket];
    const filterValue = filter.value;

    if (ticketValue === undefined || ticketValue === null) return false;

    // String operations
    if (field.type === 'string') {
      const strValue = String(ticketValue).toLowerCase();
      const strFilter = filterValue.toLowerCase();

      switch (filter.operator) {
        case 'equals':
          return strValue === strFilter;
        case 'not_equals':
          return strValue !== strFilter;
        case 'contains':
          return strValue.includes(strFilter);
        case 'not_contains':
          return !strValue.includes(strFilter);
        case 'starts_with':
          return strValue.startsWith(strFilter);
        case 'ends_with':
          return strValue.endsWith(strFilter);
        default:
          return true;
      }
    }

    // Number operations
    if (field.type === 'number') {
      const numValue = Number(ticketValue);
      const numFilter = Number(filterValue);

      if (isNaN(numFilter)) return true;

      switch (filter.operator) {
        case 'equals':
          return numValue === numFilter;
        case 'not_equals':
          return numValue !== numFilter;
        case 'greater_than':
          return numValue > numFilter;
        case 'greater_equal':
          return numValue >= numFilter;
        case 'less_than':
          return numValue < numFilter;
        case 'less_equal':
          return numValue <= numFilter;
        default:
          return true;
      }
    }

    // Date operations
    if (field.type === 'date') {
      const dateValue = new Date(String(ticketValue)).getTime();
      const dateFilter = new Date(filterValue).getTime();

      if (isNaN(dateFilter)) return true;

      switch (filter.operator) {
        case 'equals':
          return String(ticketValue) === filterValue;
        case 'not_equals':
          return String(ticketValue) !== filterValue;
        case 'before':
          return dateValue < dateFilter;
        case 'after':
          return dateValue > dateFilter;
        default:
          return true;
      }
    }

    return true;
  };

  // Filter and sort tickets
  const filteredTickets = useMemo(() => {
    let result = [...tickets];

    // Apply all filters
    if (filters.length > 0) {
      result = result.filter((ticket) =>
        filters.every((filter) => applyFilter(ticket, filter))
      );
    }

    // Sort by created_at in descending order
    return result.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [tickets, filters]);

  // Paginate filtered results
  const paginatedTickets = useMemo(() => {
    return filteredTickets.slice(offset, offset + limit);
  }, [filteredTickets, offset, limit]);

  // Mobile tickets with "show more"
  const mobileTickets = useMemo(() => {
    return filteredTickets.slice(0, mobileDisplayCount);
  }, [filteredTickets, mobileDisplayCount]);

  const hasMoreMobileTickets = mobileDisplayCount < filteredTickets.length;

  const loadMoreMobile = () => {
    setMobileDisplayCount((prev) => Math.min(prev + 10, filteredTickets.length));
  };

  const addFilter = () => {
    if (!newFilterField || !newFilterOperator || !newFilterValue) return;

    const newFilter: FilterCondition = {
      id: Date.now().toString(),
      field: newFilterField,
      operator: newFilterOperator,
      value: newFilterValue,
    };

    setFilters([...filters, newFilter]);
    setNewFilterField('');
    setNewFilterOperator('');
    setNewFilterValue('');
    setOffset(0); // Reset to first page when adding filter
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter((f) => f.id !== id));
    setOffset(0); // Reset to first page when removing filter
  };

  const clearAllFilters = () => {
    setFilters([]);
    setOffset(0);
    setMobileDisplayCount(10);
  };

  const getFieldLabel = (fieldValue: string) => {
    return FILTER_FIELDS.find((f) => f.value === fieldValue)?.label || fieldValue;
  };

  const getOperatorLabel = (fieldValue: string, operatorValue: string) => {
    const operators = getOperatorsForField(fieldValue);
    return operators.find((o) => o.value === operatorValue)?.label || operatorValue;
  };

  const handlePrevious = () => {
    if (offset >= limit) {
      setOffset(offset - limit);
    }
  };

  const handleNext = () => {
    if (offset + limit < filteredTickets.length) {
      setOffset(offset + limit);
    }
  };

  const handleReprintSubmit = async () => {
    if (!reprintTicket || !reprintReason) return;

    try {
      await requestReprint({
        ticket_id: reprintTicket.id,
        trace_no: reprintTicket.trace_no,
        reason: reprintReason,
        requested_copies: reprintCopies,
        notes: reprintNotes || undefined,
      }).unwrap();
      
      // Reset form and close dialog
      setReprintTicket(null);
      setReprintReason('');
      setReprintCopies(1);
      setReprintNotes('');
      alert('Reprint request submitted successfully!');
    } catch (error) {
      console.error('Failed to submit reprint request:', error);
      alert('Failed to submit reprint request. Please try again.');
    }
  };

  const openReprintDialog = (ticket: Ticket) => {
    setReprintTicket(ticket);
    setReprintReason('');
    setReprintCopies(1);
    setReprintNotes('');
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(filteredTickets.length / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Tickets Management
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          View and manage all scanned tickets
        </p>
      </div>

      {/* Filter Builder */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
            <div className="flex items-center gap-2">
              {filters.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  Clear all
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilterBuilder(!showFilterBuilder)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active Filters */}
          {filters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <Badge
                  key={filter.id}
                  variant="secondary"
                  className="px-3 py-1.5 text-sm bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                >
                  <span className="font-medium">{getFieldLabel(filter.field)}</span>
                  <span className="mx-1.5 text-blue-500">{getOperatorLabel(filter.field, filter.operator)}</span>
                  <span className="font-semibold">&quot;{filter.value}&quot;</span>
                  <button
                    onClick={() => removeFilter(filter.id)}
                    className="ml-2 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Filter Builder */}
          {showFilterBuilder && (
            <div className="flex flex-wrap items-end gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              {/* Field Select */}
              <div className="space-y-1.5 min-w-[180px]">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Field
                </label>
                <Select value={newFilterField} onValueChange={(val) => {
                  setNewFilterField(val);
                  setNewFilterOperator('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {FILTER_FIELDS.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Operator Select */}
              <div className="space-y-1.5 min-w-[150px]">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Operator
                </label>
                <Select
                  value={newFilterOperator}
                  onValueChange={setNewFilterOperator}
                  disabled={!newFilterField}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {getOperatorsForField(newFilterField).map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Value Input */}
              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Value
                </label>
                <Input
                  placeholder="Enter value..."
                  type={
                    FILTER_FIELDS.find((f) => f.value === newFilterField)?.type === 'date'
                      ? 'date'
                      : FILTER_FIELDS.find((f) => f.value === newFilterField)?.type === 'number'
                      ? 'number'
                      : 'text'
                  }
                  value={newFilterValue}
                  onChange={(e) => setNewFilterValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addFilter();
                    }
                  }}
                  disabled={!newFilterOperator}
                />
              </div>

              {/* Add Button */}
              <Button
                onClick={addFilter}
                disabled={!newFilterField || !newFilterOperator || !newFilterValue}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>

              {/* Cancel Button */}
              <Button
                variant="ghost"
                onClick={() => {
                  setShowFilterBuilder(false);
                  setNewFilterField('');
                  setNewFilterOperator('');
                  setNewFilterValue('');
                }}
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Filter Summary */}
          {filters.length === 0 && !showFilterBuilder && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No filters applied. Click &quot;Add filter&quot; to filter tickets.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg">
              All Tickets 
              <span className="text-slate-500 font-normal ml-2">
                ({filteredTickets.length}{filters.length > 0 ? ' filtered' : ''})
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
          ) : filteredTickets.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {mobileTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded font-mono truncate">
                            {ticket.trace_no}
                          </code>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 mb-1">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{ticket.location}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {ticket.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {ticket.time}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-bold text-green-600 dark:text-green-400">
                          LKR {ticket.total_amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {ticket.no_tickets} tickets
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => openReprintDialog(ticket)}
                      >
                        <Printer className="w-4 h-4" />
                        Reprint
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Show More Button */}
                {hasMoreMobileTickets && (
                  <div className="pt-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={loadMoreMobile}
                    >
                      Show More ({filteredTickets.length - mobileDisplayCount} remaining)
                    </Button>
                  </div>
                )}

                {/* Mobile count info */}
                <p className="text-center text-xs text-slate-500 pt-2">
                  Showing {mobileTickets.length} of {filteredTickets.length} tickets
                </p>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                      <TableHead className="font-semibold">Trace No</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Time</TableHead>
                      <TableHead className="font-semibold">Terminal ID</TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold text-right">Tickets</TableHead>
                      <TableHead className="font-semibold text-right">Total Amount (LKR)</TableHead>
                      <TableHead className="font-semibold text-right">Amount per Ticket</TableHead>
                      <TableHead className="font-semibold">Created At</TableHead>
                      <TableHead className="font-semibold text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTickets.map((ticket) => (
                      <TableRow key={ticket.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <TableCell>
                          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono">
                            {ticket.trace_no}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm">{ticket.date}</TableCell>
                        <TableCell className="text-sm">{ticket.time}</TableCell>
                        <TableCell className="text-sm font-medium">{ticket.terminal_id}</TableCell>
                        <TableCell className="text-sm">{ticket.location}</TableCell>
                        <TableCell className="text-right font-medium">{ticket.no_tickets}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                          LKR {ticket.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          LKR {ticket.ticket_amount_pp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {new Date(ticket.created_at).toLocaleDateString()} {new Date(ticket.created_at).toLocaleTimeString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedTicket(ticket)}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openReprintDialog(ticket)}
                              title="Request Reprint"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Desktop Pagination */}
              <div className="hidden md:flex items-center justify-between mt-6">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Showing {offset + 1} to {Math.min(offset + limit, filteredTickets.length)} of {filteredTickets.length} tickets
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
                    disabled={offset + limit >= filteredTickets.length || isLoading}
                    className="gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Items per page selector - Desktop only */}
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
              {filters.length > 0 ? (
                <div className="text-center">
                  <p className="text-lg font-medium">No tickets match your filters</p>
                  <p className="text-sm mt-1">Try adjusting or removing some filters</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4" 
                    onClick={clearAllFilters}
                  >
                    Clear all filters
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-lg font-medium">No tickets available</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Ticket Details
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Trace Number</p>
                <code className="text-sm font-mono font-semibold">{selectedTicket.trace_no}</code>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Date</p>
                  <p className="text-sm font-medium">{selectedTicket.date}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Time</p>
                  <p className="text-sm font-medium">{selectedTicket.time}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Location</p>
                <p className="text-sm font-medium">{selectedTicket.location}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Terminal ID</p>
                <p className="text-sm font-medium">{selectedTicket.terminal_id}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Number of Tickets</p>
                  <p className="text-lg font-bold">{selectedTicket.no_tickets}</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-xs text-green-600 dark:text-green-400 mb-1">Total Amount</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    LKR {selectedTicket.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Amount per Ticket</p>
                <p className="text-sm font-medium">
                  LKR {selectedTicket.ticket_amount_pp.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Created At</p>
                <p className="text-sm font-medium">
                  {new Date(selectedTicket.created_at).toLocaleDateString()}{' '}
                  {new Date(selectedTicket.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reprint Request Modal */}
      <Dialog open={!!reprintTicket} onOpenChange={() => setReprintTicket(null)}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Request Reprint
            </DialogTitle>
          </DialogHeader>
          {reprintTicket && (
            <div className="space-y-4">
              {/* Ticket Info Summary */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Trace Number</p>
                    <code className="text-sm font-mono font-semibold">{reprintTicket.trace_no}</code>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-1">Total Amount</p>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400">
                      LKR {reprintTicket.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500">
                    {reprintTicket.location} • {reprintTicket.date} at {reprintTicket.time}
                  </p>
                </div>
              </div>

              {/* Reprint Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Reprint <span className="text-red-500">*</span></Label>
                  <Select value={reprintReason} onValueChange={setReprintReason}>
                    <SelectTrigger id="reason">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="damaged">Damaged Ticket</SelectItem>
                      <SelectItem value="lost">Lost Ticket</SelectItem>
                      <SelectItem value="print_error">Print Error</SelectItem>
                      <SelectItem value="customer_request">Customer Request</SelectItem>
                      <SelectItem value="faded">Faded/Unreadable</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="copies">Number of Copies</Label>
                  <Select value={reprintCopies.toString()} onValueChange={(val) => setReprintCopies(Number(val))}>
                    <SelectTrigger id="copies">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Enter any additional details about the reprint request..."
                    value={reprintNotes}
                    onChange={(e) => setReprintNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setReprintTicket(null)}
              disabled={isReprintLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReprintSubmit}
              disabled={!reprintReason || isReprintLoading}
              className="gap-2"
            >
              {isReprintLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
