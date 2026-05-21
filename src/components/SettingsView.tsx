import React, { useState } from "react";
import { QueueState } from "../types.js";
import { 
  RotateCcw, 
  PlusCircle, 
  Radio, 
  Trash2, 
  Sliders, 
  Database,
  CheckCircle,
  HelpCircle,
  ListOrdered
} from "lucide-react";

interface SettingsViewProps {
  queueData: QueueState | null;
  onIssueTicket: (prefix: 'A' | 'B' | 'C', category: string) => Promise<any>;
  onResetAll: () => Promise<void>;
  onRefresh: () => void;
}

export default function SettingsView({ queueData, onIssueTicket, onResetAll, onRefresh }: SettingsViewProps) {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 2500);
  };

  // Populate mock data with different timestamps so sorting is reliable
  const handlePopulateMockData = async () => {
    try {
      const mocks = [
        { prefix: "A" as const, name: "Layanan Umum" },
        { prefix: "A" as const, name: "Layanan Umum" },
        { prefix: "B" as const, name: "Customer Service" },
        { prefix: "C" as const, name: "Layanan Kasir" },
        { prefix: "B" as const, name: "Customer Service" },
        { prefix: "A" as const, name: "Layanan Umum" },
      ];

      for (const m of mocks) {
        await onIssueTicket(m.prefix, m.name);
        // Wait minor delay to avoid identical timestamps
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      onRefresh();
      showNotification("Berhasil memasukkan 6 antrian simulasi!");
    } catch (e) {
      console.error(e);
      alert("Gagal melakukan simulasi pengisian data.");
    }
  };

  const handleClearQueues = async () => {
    if (window.confirm("Apakah Anda yakin ingin mengosongkan semua data antrian?")) {
      await onResetAll();
      showNotification("Data antrian telah dikosongkan!");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Alert Notification */}
      {successMsg && (
        <div className="bg-slate-900 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 animate-pulse" />
          {successMsg}
        </div>
      )}

      {/* Main Configurations control */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-xl p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 rounded-xl bg-slate-950 text-emerald-400 border border-slate-800">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Pusat Pengaturan Sistem Antrian
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Kelola parameter database, jalankan pengisian data contoh, atau reset pencatatan harian loket.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Simulation controller card */}
          <div className="border border-slate-800 rounded-3xl p-5 bg-slate-950/40 space-y-4">
            <h3 className="text-xs font-black text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              Generator Simulasi Antrian
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Berguna untuk keperluan demonstrasi atau uji coba fitur suara panggilan tanpa harus mencetak tiket satu per satu. Tombol di bawah akan otomatis menambahkan 6 nomor antrian acak (A7, B1, C2...) ke database Anda seolah dicetak oleh pengunjung.
            </p>
            <button
              onClick={handlePopulateMockData}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 text-emerald-400 border border-slate-700/60 hover:bg-slate-750 font-bold text-xs rounded-xl cursor-pointer shadow-md transition-all uppercase tracking-wider"
            >
              Masukkan 6 Antrian Contoh
            </button>
          </div>

          {/* Database purger card */}
          <div className="border border-slate-800 rounded-3xl p-5 bg-slate-950/40 space-y-4">
            <h3 className="text-xs font-black text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
              <Trash2 className="w-4 h-4 text-red-400" />
              Kosongkan Semua Log Antrian
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Gunakan fungsi reset untuk mengembalikan antrian ke nomor awal (A-001) dan membebaskan semua status counter yang bertugas. Cocok dilakukan setiap kali loket layanan tutup atau memulai shift pagi hari baru.
            </p>
            <button
              onClick={handleClearQueues}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-200 font-bold text-xs rounded-xl cursor-pointer transition-colors uppercase tracking-wider"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-400" />
              Setel Ulang Ke Nol (Reset)
            </button>
          </div>

        </div>
      </div>

      {/* Info Stats Monitor card */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 shadow-xl space-y-4">
        <h3 className="text-xs font-black text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
          <Database className="w-4 h-4 text-emerald-400" />
          Status Database In-Memory Server
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-850">
            <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Total Tiket</span>
            <span className="text-xl font-bold text-white mt-1.5 block">
              {queueData?.tickets.length || 0}
            </span>
          </div>
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-850">
            <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Status Menunggu</span>
            <span className="text-xl font-bold text-amber-500 mt-1.5 block">
              {queueData?.tickets.filter(t => t.status === "waiting").length || 0}
            </span>
          </div>
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-850">
            <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Status Melayani</span>
            <span className="text-xl font-bold text-emerald-400 mt-1.5 block">
              {queueData?.tickets.filter(t => t.status === "calling").length || 0}
            </span>
          </div>
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-850">
            <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Status Selesai</span>
            <span className="text-xl font-bold text-slate-200 mt-1.5 block">
              {queueData?.tickets.filter(t => t.status === "completed").length || 0}
            </span>
          </div>
        </div>

        <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 text-[11px] text-slate-350 rounded-xl flex items-start gap-2.5 shadow-md">
          <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          <p className="leading-relaxed font-sans">
            <strong>Tips Operasi Multi-Screen:</strong> Anda dapat membuka halaman ini di beberapa tab browser terpisah secara bersamaan (misalnya tab pertama membuka Monitor, tab kedua membuka Admin Loket, dan tab ketiga membuka Ambil Tiket). Layanan backend Express akan memastikan sinkronisasi data antar tab terjadi secara instan dan suara panggilan akan diputar serempak di monitor!
          </p>
        </div>
      </div>

    </div>
  );
}
