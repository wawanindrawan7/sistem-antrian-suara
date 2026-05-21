export interface Ticket {
  id: string;
  number: number;
  prefix: 'A' | 'B' | 'C';
  formattedNumber: string; // e.g., "A-005"
  category: string; // "Layanan Umum", "Customer Service", "Kasir"
  status: 'waiting' | 'calling' | 'completed' | 'skipped';
  counterId: string | null;
  createdAt: string;
  calledAt: string | null;
}

export interface Counter {
  id: string; // e.g., "L1", "L2", "L3"
  name: string; // e.g., "Loket 1"
  currentTicketId: string | null;
  active: boolean;
  operatorName: string;
}

export interface QueueState {
  tickets: Ticket[];
  counters: Counter[];
  activeCallEvent: CallEvent | null;
  lastReset: string;
}

export interface CallEvent {
  id: string; // Unique event generation
  ticketId: string;
  prefix: string;
  number: number;
  formattedNumber: string;
  counterId: string;
  counterName: string;
  timestamp: number;
  voiceText: string;
}

export interface ServiceCategory {
  prefix: 'A' | 'B' | 'C';
  name: string;
  description: string;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { prefix: 'A', name: 'Layanan Umum', description: 'Pengurusan administrasi umum & berkas' },
  { prefix: 'B', name: 'Customer Service', description: 'Pelayanan informasi dan pengaduan' },
  { prefix: 'C', name: 'Layanan Kasir', description: 'Transaksi pembayaran & administrasi keuangan' },
];
