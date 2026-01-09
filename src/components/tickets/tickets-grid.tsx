'use client';

import { useState } from 'react';
import { Ticket } from '@/store/services/ticketApi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ImageOff } from 'lucide-react';

interface TicketsGridProps {
  tickets: Ticket[];
  onViewTicket: (ticket: Ticket) => void;
  onReprintTicket: (ticket: Ticket) => void;
}

export function TicketsGrid({ tickets, onViewTicket, onReprintTicket }: TicketsGridProps) {
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  const handleImageError = (ticketId: number) => {
    setFailedImages(prev => new Set(prev).add(ticketId));
  };

  if (tickets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-slate-500">
          <p className="text-lg font-medium">No tickets available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {tickets.map((ticket) => (
        <Card
          key={ticket.id}
          className="p-4 border-slate-200 dark:border-slate-700 hover:shadow-lg dark:hover:shadow-slate-900/50 transition-shadow flex flex-col h-full"
        >
          {/* Header with Trace No */}
          {ticket.trace_no && (
            <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
              <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono truncate block">
                {ticket.trace_no}
              </code>
            </div>
          )}

          {/* Ticket Image - Vertical orientation */}
          {ticket.ticket_img_path && !failedImages.has(ticket.id) ? (
            <div className="mb-4 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-[3/4] flex items-center justify-center">
              <img
                src={ticket.ticket_img_path}
                alt={`Ticket ${ticket.trace_no}`}
                className="w-full h-full object-contain"
                loading="lazy"
                onError={() => handleImageError(ticket.id)}
              />
            </div>
          ) : ticket.ticket_img_path ? (
            <div className="mb-4 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-[3/4] flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <ImageOff className="w-8 h-8" />
                <span className="text-xs">Image unavailable</span>
              </div>
            </div>
          ) : null}

          {/* Created Date */}
          {ticket.created_at && (
            <div className="mb-3 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
