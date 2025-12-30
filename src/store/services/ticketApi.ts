import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '..';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Ticket interface matching the API spec
export interface Ticket {
  id: number;
  date: string;
  time: string;
  terminal_id: string;
  location: string;
  trace_no: string;
  no_tickets: number;
  total_amount: number;
  ticket_amount_pp: number;
  scanned_data: string;
  created_at: string;
  updated_at: string;
}

// Request interfaces
export interface CreateTicketRequest {
  date: string;
  time: string;
  terminal_id: string;
  location: string;
  no_tickets: number;
  total_amount: number;
  ticket_amount_pp: number;
  scanned_data: string;
}

export interface UpdateTicketRequest {
  date?: string;
  time?: string;
  terminal_id?: string;
  location?: string;
  no_tickets?: number;
  total_amount?: number;
  ticket_amount_pp?: number;
  scanned_data?: string;
}

// Response interfaces
export interface GetTicketsResponse {
  success: boolean;
  data: Ticket[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface GetTicketResponse {
  success: boolean;
  data: Ticket;
}

export interface GetTicketCountResponse {
  success: boolean;
  data: {
    count: number;
  };
}

export interface GetTicketByTraceResponse {
  success: boolean;
  data: Ticket;
}

export interface CreateTicketResponse {
  success: boolean;
  data: Ticket;
}

export interface UpdateTicketResponse {
  success: boolean;
  data: Ticket;
}

export interface DeleteTicketResponse {
  success: boolean;
  message: string;
}

export interface SearchTicketsByDateRangeResponse {
  success: boolean;
  data: Ticket[];
  pagination?: {
    limit?: number;
    offset?: number;
    total?: number;
  };
}

export interface ReprintRequest {
  ticket_id: number;
  trace_no: string;
  reason: string;
  requested_copies?: number;
  notes?: string;
}

export interface ReprintResponse {
  success: boolean;
  message: string;
  data?: {
    request_id: string;
    status: string;
  };
}

// Helper function to normalize ticket data
const normalizeTicket = (ticket: any): Ticket => ({
  ...ticket,
  total_amount: typeof ticket.total_amount === 'string' ? parseFloat(ticket.total_amount) : ticket.total_amount,
  ticket_amount_pp: typeof ticket.ticket_amount_pp === 'string' ? parseFloat(ticket.ticket_amount_pp) : ticket.ticket_amount_pp,
  no_tickets: typeof ticket.no_tickets === 'string' ? parseInt(ticket.no_tickets, 10) : ticket.no_tickets,
});

const normalizeTickets = (tickets: any[]): Ticket[] =>
  tickets.map(normalizeTicket);

export const ticketApi = createApi({
  reducerPath: 'ticketApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const tokens = (getState() as RootState).auth.tokens;
      if (tokens?.accessToken) {
        headers.set('authorization', `Bearer ${tokens.accessToken}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Ticket'],
  endpoints: (builder) => ({
    // Get all tickets with pagination
    getTickets: builder.query<GetTicketsResponse, { limit?: number; offset?: number }>({
      query: ({ limit = 10, offset = 0 }) => `/ocr/tickets?limit=${limit}&offset=${offset}`,
      transformResponse: (response: GetTicketsResponse) => ({
        ...response,
        data: normalizeTickets(response.data),
      }),
      providesTags: ['Ticket'],
    }),

    // Get ticket count
    getTicketCount: builder.query<GetTicketCountResponse, void>({
      query: () => '/ocr/tickets/count',
      providesTags: ['Ticket'],
    }),

    // Get ticket by ID
    getTicketById: builder.query<GetTicketResponse, number>({
      query: (ticketId) => `/ocr/tickets/${ticketId}`,
      transformResponse: (response: GetTicketResponse) => ({
        ...response,
        data: normalizeTicket(response.data),
      }),
      providesTags: (result, error, id) => [{ type: 'Ticket', id }],
    }),

    // Get ticket by trace number
    getTicketByTraceNo: builder.query<GetTicketByTraceResponse, string>({
      query: (traceNo) => `/ocr/tickets/trace/${traceNo}`,
      transformResponse: (response: GetTicketByTraceResponse) => ({
        ...response,
        data: normalizeTicket(response.data),
      }),
      providesTags: (result, error, traceNo) => [{ type: 'Ticket', id: traceNo }],
    }),

    // Search tickets by date range
    searchTicketsByDateRange: builder.query<
      SearchTicketsByDateRangeResponse,
      { startDate: string; endDate: string }
    >({
      query: ({ startDate, endDate }) =>
        `/ocr/tickets/search/date-range?startDate=${startDate}&endDate=${endDate}`,
      transformResponse: (response: SearchTicketsByDateRangeResponse) => ({
        ...response,
        data: normalizeTickets(response.data),
      }),
      providesTags: ['Ticket'],
    }),

    // Create ticket
    createTicket: builder.mutation<CreateTicketResponse, CreateTicketRequest>({
      query: (ticketData) => ({
        url: '/ocr/tickets',
        method: 'POST',
        body: ticketData,
      }),
      transformResponse: (response: CreateTicketResponse) => ({
        ...response,
        data: normalizeTicket(response.data),
      }),
      invalidatesTags: ['Ticket'],
    }),

    // Create ticket with image
    createTicketWithImage: builder.mutation<
      CreateTicketResponse,
      { image: File; data: CreateTicketRequest }
    >({
      query: ({ image, data }) => {
        const formData = new FormData();
        formData.append('image', image);
        formData.append('data', JSON.stringify(data));
        return {
          url: '/ocr/tickets/with-image',
          method: 'POST',
          body: formData,
        };
      },
      transformResponse: (response: CreateTicketResponse) => ({
        ...response,
        data: normalizeTicket(response.data),
      }),
      invalidatesTags: ['Ticket'],
    }),

    // Update ticket
    updateTicket: builder.mutation<
      UpdateTicketResponse,
      { ticketId: number; data: UpdateTicketRequest }
    >({
      query: ({ ticketId, data }) => ({
        url: `/ocr/tickets/${ticketId}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: UpdateTicketResponse) => ({
        ...response,
        data: normalizeTicket(response.data),
      }),
      invalidatesTags: (result, error, { ticketId }) => [
        { type: 'Ticket', id: ticketId },
        'Ticket',
      ],
    }),

    // Delete ticket
    deleteTicket: builder.mutation<DeleteTicketResponse, number>({
      query: (ticketId) => ({
        url: `/ocr/tickets/${ticketId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Ticket'],
    }),

    // Request reprint
    requestReprint: builder.mutation<ReprintResponse, ReprintRequest>({
      query: (reprintData) => ({
        url: '/ocr/tickets/reprint',
        method: 'POST',
        body: reprintData,
      }),
    }),
  }),
});

export const {
  useGetTicketsQuery,
  useGetTicketCountQuery,
  useGetTicketByIdQuery,
  useGetTicketByTraceNoQuery,
  useSearchTicketsByDateRangeQuery,
  useCreateTicketMutation,
  useCreateTicketWithImageMutation,
  useUpdateTicketMutation,
  useDeleteTicketMutation,
  useRequestReprintMutation,
} = ticketApi;
