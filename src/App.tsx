import React, { useState, useEffect, useCallback } from "react";
import { QueueState, Ticket } from "./types.js";
import TicketView from "./components/TicketView.js";
import MonitorView from "./components/MonitorView.js";
import AdminView from "./components/AdminView.js";
import SettingsView from "./components/SettingsView.js";
import { 
  Printer, 
  Tv, 
  UserCheck, 
  Sliders, 
  Volume2, 
  Sparkles,
  Building
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<'ticket' | 'monitor' | 'admin' | 'settings'>('ticket');
  const [queueData, setQueueData] = useState<QueueState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch current queue state from the backend
  const fetchQueueData = useCallback(async () => {
    try {
      const response = await fetch("/api/queue");
      if (!response.ok) {
        throw new Error("Gagal mengambil data antrian dari server.");
      }
      const data: QueueState = await response.json();
      setQueueData(data);
      setErrorMsg(null);
    } catch (e: any) {
      console.error("Fetch state error:", e);
      setErrorMsg("Koneksi server terputus. Silakan periksa apakah server berjalan.");
    }
  }, []);

  // Fetch initial data on mount
  useEffect(() => {
    fetchQueueData();
  }, [fetchQueueData]);

  // Action: Print / Issue a new ticket
  const handleIssueTicket = async (prefix: 'A' | 'B' | 'C', category: string): Promise<Ticket> => {
    const response = await fetch("/api/queue/ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix, category }),
    });

    if (!response.ok) {
      throw new Error("Gagal mencetak tiket.");
    }

    const data = await response.json();
    setQueueData(data.state);
    return data.ticket;
  };

  // Action: Call next waiting ticket for a counter
  const handleCallNext = async (counterId: string, prefixFilter?: string) => {
    const response = await fetch("/api/queue/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counterId, prefixFilter }),
    });

    if (!response.ok) {
      throw new Error("Gagal memanggil antrian berikutnya.");
    }

    const data = await response.json();
    setQueueData(data.state);
  };

  // Action: Call a specific waiting ticket directly
  const handleCallSpecific = async (counterId: string, ticketId: string) => {
    const response = await fetch("/api/queue/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counterId, specificTicketId: ticketId }),
    });

    if (!response.ok) {
      throw new Error("Gagal memanggil antrian spesifik.");
    }

    const data = await response.json();
    setQueueData(data.state);
  };

  // Action: Re-call (repeat) current serving ticket
  const handleRecall = async (counterId: string) => {
    const response = await fetch("/api/queue/recall", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counterId }),
    });

    if (!response.ok) {
      throw new Error("Gagal melakukan panggilan ulang.");
    }

    const data = await response.json();
    setQueueData(data.state);
  };

  // Action: Complete current ticket
  const handleComplete = async (counterId: string) => {
    const response = await fetch("/api/queue/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counterId }),
    });

    if (!response.ok) {
      throw new Error("Gagal memproses status pelayanan selesai.");
    }

    const data = await response.json();
    setQueueData(data);
  };

  // Action: Skip current ticket
  const handleSkip = async (counterId: string) => {
    const response = await fetch("/api/queue/skip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counterId }),
    });

    if (!response.ok) {
      throw new Error("Gagal melempar status lewati antrian.");
    }

    const data = await response.json();
    setQueueData(data);
  };

  // Action: Update Counter params (e.g. Operator Name)
  const handleUpdateCounter = async (counterId: string, updates: { operatorName?: string; name?: string; active?: boolean }) => {
    const response = await fetch("/api/queue/counter/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counterId, ...updates }),
    });

    if (!response.ok) {
      throw new Error("Gagal menyimpan profil loket.");
    }

    const data = await response.json();
    setQueueData(data);
  };

  // Action: Clear/reset all queue data
  const handleResetAll = async () => {
    const response = await fetch("/api/queue/reset", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Gagal melakukan reset antrian.");
    }

    const data = await response.json();
    setQueueData(data);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased font-sans flex flex-col p-4 md:p-6">
      
      {/* Top Stylish Branding Bar */}
      <header className="bg-slate-900/50 border border-slate-800 sticky top-4 z-40 backdrop-blur-md rounded-2xl shadow-2xl max-w-7xl w-full mx-auto p-4 flex flex-col lg:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Building className="w-5.5 h-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-white tracking-tight">
                SISTEM ANTRIAN <span className="text-emerald-400">VOKALIS</span>
              </span>
              <span className="bg-emerald-950 border border-emerald-800/80 text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-mono">
                BENTO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Sistem Antrian & Suara Cantik Komputer Pengunjung</p>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <nav className="flex flex-wrap items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            id="tab-ticket"
            onClick={() => setActiveTab('ticket')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ticket' 
                ? "bg-slate-850 text-white border border-slate-800 shadow-xs text-slate-100" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cetak Tiket</span>
          </button>

          <button
            id="tab-monitor"
            onClick={() => setActiveTab('monitor')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'monitor' 
                ? "bg-slate-850 text-white border border-slate-800 shadow-xs text-slate-100" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Tv className="w-3.5 h-3.5 text-emerald-400" />
            <span>Monitor</span>
          </button>

          <button
            id="tab-admin"
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'admin' 
                ? "bg-slate-850 text-white border border-slate-800 shadow-xs text-slate-100" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Admin Loket</span>
          </button>

          <button
            id="tab-settings"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'settings' 
                ? "bg-slate-850 text-white border border-slate-800 shadow-xs text-slate-100" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pengaturan</span>
          </button>
        </nav>
      </header>

      {/* Connection Failure Error Box */}
      {errorMsg && (
        <div className="bg-red-950/50 text-red-200 border border-red-900 rounded-xl text-xs text-center py-2.5 px-4 max-w-7xl w-full mx-auto flex items-center justify-center gap-2 font-medium mb-4">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          {errorMsg}
          <button 
            onClick={fetchQueueData}
            className="underline ml-2 hover:text-white font-bold cursor-pointer"
          >
            Hubungkan Kembali
          </button>
        </div>
      )}

      {/* Primary Context stage */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-1 md:p-2 pb-12 transition-all">
        {activeTab === 'ticket' && (
          <TicketView 
            queueData={queueData} 
            onIssueTicket={handleIssueTicket} 
          />
        )}

        {activeTab === 'monitor' && (
          <MonitorView 
            queueData={queueData} 
            onRefresh={fetchQueueData} 
          />
        )}

        {activeTab === 'admin' && (
          <AdminView 
            queueData={queueData}
            onRefresh={fetchQueueData}
            onCallNext={handleCallNext}
            onCallSpecific={handleCallSpecific}
            onRecall={handleRecall}
            onComplete={handleComplete}
            onSkip={handleSkip}
            onUpdateCounter={handleUpdateCounter}
            onResetAll={handleResetAll}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            queueData={queueData}
            onIssueTicket={handleIssueTicket}
            onResetAll={handleResetAll}
            onRefresh={fetchQueueData}
          />
        )}
      </main>

      {/* Subtle bottom trademark footer */}
      <footer className="w-full max-w-7xl mx-auto border-t border-slate-900 py-6 text-center text-xs text-slate-500 font-medium">
        <p>&copy; {new Date().getFullYear()} SISTEM ANTRIAN VOKALIS. Crafted in Google AI Studio.</p>
      </footer>

    </div>
  );
}
