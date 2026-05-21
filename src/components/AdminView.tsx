import React, { useState } from "react";
import { QueueState, Counter, Ticket, SERVICE_CATEGORIES } from "../types.js";
import { 
  UserCheck, 
  LogOut, 
  Users, 
  CheckCircle, 
  ChevronsRight, 
  Sparkles, 
  User, 
  Settings, 
  AlertCircle,
  HelpCircle,
  Clock,
  Play,
  RotateCw,
  TrendingUp,
  Award
} from "lucide-react";
import { motion } from "motion/react";

interface AdminViewProps {
  queueData: QueueState | null;
  onRefresh: () => void;
  onCallNext: (counterId: string, prefixFilter?: string) => Promise<void>;
  onCallSpecific: (counterId: string, ticketId: string) => Promise<void>;
  onRecall: (counterId: string) => Promise<void>;
  onComplete: (counterId: string) => Promise<void>;
  onSkip: (counterId: string) => Promise<void>;
  onUpdateCounter: (counterId: string, updates: { operatorName?: string; name?: string; active?: boolean }) => Promise<void>;
  onResetAll: () => Promise<void>;
}

export default function AdminView({
  queueData,
  onRefresh,
  onCallNext,
  onCallSpecific,
  onRecall,
  onComplete,
  onSkip,
  onUpdateCounter,
  onResetAll
}: AdminViewProps) {
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>(null);
  const [operatorNameInput, setOperatorNameInput] = useState<string>("");
  const [prefixFilter, setPrefixFilter] = useState<string>(""); // empty strings represents "ALL"
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const currentCounter = queueData?.counters.find((c) => c.id === selectedCounterId);

  // Filter queue tickets
  const waitingTickets = queueData
    ? [...queueData.tickets]
        .filter((t) => t.status === "waiting")
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  const waitingCountForPrefix = (prefix: string) => 
    waitingTickets.filter((t) => t.prefix === prefix).length;

  // Handle operation with simple loading state to avoid double triggers
  const handleAction = async (actionFn: () => Promise<void>) => {
    try {
      setIsLoading(true);
      await actionFn();
    } catch (e) {
      console.error(e);
      alert("Operasi gagal, silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  // Log in to a counter
  const handleSelectCounter = (counter: Counter) => {
    setSelectedCounterId(counter.id);
    setOperatorNameInput(counter.operatorName || "");
  };

  // Save updated operator name
  const handleSaveOperatorName = () => {
    if (!selectedCounterId) return;
    handleAction(async () => {
      await onUpdateCounter(selectedCounterId, { operatorName: operatorNameInput });
    });
  };

  // Find serving ticket for current counter
  const servingTicket = queueData && currentCounter
    ? queueData.tickets.find((t) => t.id === currentCounter.currentTicketId && t.status === "calling")
    : null;

  // Statistics for this counter's service operations
  const completedCount = queueData && selectedCounterId
    ? queueData.tickets.filter((t) => t.counterId === selectedCounterId && t.status === "completed").length
    : 0;

  const skippedCount = queueData && selectedCounterId
    ? queueData.tickets.filter((t) => t.counterId === selectedCounterId && t.status === "skipped").length
    : 0;

  // 1. SELECT COUNTER VIEW (State: logged out)
  if (!selectedCounterId || !currentCounter) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            Pilih Loket Layanan Kerja Anda
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Silakan pilih nama loket kerja Anda untuk memulai pemanggilan dan pelayanan tiket antrian pengunjung.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {queueData?.counters.map((counter) => {
            const isCounterServing = queueData.tickets.some(
              (t) => t.counterId === counter.id && t.status === "calling"
            );

            return (
              <motion.div
                whileHover={{ y: -2 }}
                key={counter.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between h-48 hover:border-slate-750 transition-all text-left relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="text-xs font-mono font-bold bg-slate-950 border border-slate-850 text-slate-400 px-2.5 py-1 rounded-lg uppercase tracking-wide">
                      {counter.id}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${counter.active ? "bg-emerald-500 animate-pulse bg-emerald-400" : "bg-slate-750"}`}></span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1">{counter.name}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 font-medium mt-1">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Operator:</span>
                    <span className="font-semibold text-slate-200">{counter.operatorName || "Masyarakat Umum"}</span>
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between relative z-10">
                  {isCounterServing ? (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-900/50 px-2 py-1 rounded-md">
                      ⚠️ Sedang Melayani
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-950/60 px-2 py-1 rounded-md border border-slate-850">
                      Loket Standby
                    </span>
                  )}
                  
                  <button
                    onClick={() => handleSelectCounter(counter)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 px-3.5 py-2 rounded-xl cursor-pointer shadow-md transition-colors"
                  >
                    Masuk
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Global Control options */}
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-6 text-center space-y-3 max-w-2xl mx-auto mt-6">
          <div className="inline-flex items-center justify-center p-2.5 bg-red-950/40 text-red-400 rounded-xl border border-red-900/50">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Ingin Mereset Semua Antrian?</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-0.5 leading-relaxed">
              Tindakan ini akan menghapus seluruh data nomor antrian aktif saat ini dan mengosongkan statistik keseluruhan loket.
            </p>
          </div>
          <button
            onClick={() => {
              if (window.confirm("Apakah Anda yakin ingin mengatur ulang (reset) semua antrian hari ini? Tindakan ini tidak dapat dibatalkan.")) {
                handleAction(async () => {
                  await onResetAll();
                  alert("Semua data antrian telah dikosongkan!");
                });
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 font-extrabold text-xs rounded-xl transition-all cursor-pointer uppercase tracking-wider"
          >
            <RotateCw className="w-3.5 h-3.5 text-red-400" />
            Reset Seluruh Antrian
          </button>
        </div>
      </div>
    );
  }

  // 2. COUNTER OPERATOR DASHBOARD VIEW (State: logged in to a counter)
  return (
    <div className="space-y-6">
      
      {/* Active Counter Header bar */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-950 text-emerald-400 border border-slate-800">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Panel Pengendali: {currentCounter.name}
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${currentCounter.active ? "bg-emerald-500" : "bg-slate-650"} animate-pulse bg-emerald-400`} />
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
              <span>Operator Aktif:</span>
              <span className="font-semibold text-slate-100">{currentCounter.operatorName || "Staff Admin"}</span>
            </div>
          </div>
        </div>

        {/* Header Action buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Active status Toggle Switch */}
          <button
            onClick={() => {
              handleAction(async () => {
                await onUpdateCounter(currentCounter.id, { active: !currentCounter.active });
              });
            }}
            className={`px-3 py-1.5 text-xs font-extrabold rounded-xl border transition-all cursor-pointer uppercase tracking-wider ${
              currentCounter.active 
                ? "bg-slate-950 text-emerald-400 border-slate-800 hover:bg-slate-850" 
                : "bg-amber-950/45 text-amber-400 border-amber-900/60 hover:bg-amber-900/60"
            }`}
          >
            Status: {currentCounter.active ? "Buka (Serving)" : "Tutup (Snooze)"}
          </button>

          <button
            onClick={() => setSelectedCounterId(null)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-slate-350 hover:text-white bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl transition-all cursor-pointer uppercase tracking-wider"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Serving Center Control Panel */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Main Panel serving card */}
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] shadow-xl p-6 flex flex-col justify-between flex-1 relative min-h-[350px]">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-500 font-mono flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-450" />
                  Antrian Sedang Dilayani
                </span>

                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-850">
                  ID LOKET: {currentCounter.id}
                </span>
              </div>

              {/* Display Core number */}
              <div className="py-6 flex flex-col items-center justify-center text-center">
                {servingTicket ? (
                  <div className="space-y-3">
                    <div className="text-7xl md:text-[5.5rem] font-black font-mono tracking-tighter text-emerald-400 select-all leading-none my-2 animate-pulse">
                      {servingTicket.formattedNumber}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-955 border border-slate-800 px-3 py-1 rounded-md inline-block font-mono">
                      Kategori: {servingTicket.category}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-14 h-14 rounded-full bg-slate-950 flex items-center justify-center mx-auto text-slate-500 border border-slate-800">
                      <HelpCircle className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Loket Anda Sedang Kosong</p>
                      <p className="text-slate-400 text-xs max-w-xs mx-auto mt-1 leading-relaxed">
                        Anda belum memanggil nomor antrian. Tekan tombol panggil berikutnya di bawah untuk melayani nasabah / pengunjung.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Operator Controls buttons block */}
            <div className="border-t border-slate-800 pt-5 mt-4 space-y-4">
              
              {servingTicket ? (
                /* serving active controls */
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    disabled={isLoading}
                    onClick={() => handleAction(async () => {
                      await onRecall(currentCounter.id);
                    })}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-slate-950 hover:bg-slate-850 text-slate-350 hover:text-white font-bold text-xs rounded-xl cursor-pointer shadow-md border border-slate-800 transition-all uppercase tracking-wider"
                  >
                    <RotateCw className="w-4 h-4" />
                    Panggil Ulang
                  </button>
                  
                  <button
                    disabled={isLoading}
                    onClick={() => handleAction(async () => {
                      await onSkip(currentCounter.id);
                    })}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-amber-950/40 hover:bg-amber-900/60 text-amber-400 font-bold text-xs rounded-xl cursor-pointer shadow-md border border-amber-900/40 transition-all uppercase tracking-wider"
                  >
                    <LogOut className="w-4 h-4 rotate-180" />
                    Lewati (Absen)
                  </button>

                  <button
                    disabled={isLoading}
                    onClick={() => handleAction(async () => {
                      await onComplete(currentCounter.id);
                    })}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer shadow-md transition-all uppercase tracking-wider"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Selesai Layanan
                  </button>
                </div>
              ) : (
                /* call next controls */
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  
                  {/* Category choices */}
                  <div className="w-full sm:w-1/3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono mb-1.5">
                      Kategori Pilihan
                    </label>
                    <select
                      value={prefixFilter}
                      onChange={(e) => setPrefixFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-350 text-xs font-bold py-2.5 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Semua Antrian ({waitingTickets.length})</option>
                      {SERVICE_CATEGORIES.map((cat) => (
                        <option key={cat.prefix} value={cat.prefix}>
                          {cat.prefix} - {cat.name} ({waitingCountForPrefix(cat.prefix)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Calling button */}
                  <button
                    disabled={isLoading}
                    onClick={() => handleAction(async () => {
                      await onCallNext(currentCounter.id, prefixFilter || undefined);
                    })}
                    className="w-full sm:w-2/3 flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 text-slate-950 disabled:bg-slate-800 disabled:text-slate-600 font-extrabold text-xs rounded-xl cursor-pointer shadow-lg shadow-emerald-950/30 transition-all uppercase tracking-wider h-11"
                  >
                    <Play className="w-4 h-4 fill-slate-950 animate-pulse animate-spin" />
                    PANGGIL ANTRIAN BERIKUTNYA
                  </button>

                </div>
              )}

            </div>
          </div>

          {/* Quick Counter configuration Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-5">
            <h3 className="text-[10px] uppercase font-black tracking-widest text-slate-500 font-mono mb-3">
              Perbaharui Profil Operator Loket
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Ketik Nama Operator Baru..."
                  value={operatorNameInput}
                  onChange={(e) => setOperatorNameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs py-2.5 px-4 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold placeholder-slate-650"
                />
              </div>
              <button
                onClick={handleSaveOperatorName}
                className="px-4 py-2.5 bg-slate-800 text-white hover:bg-slate-750 border border-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer uppercase tracking-wider"
              >
                Simpan
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Waiting Queue List (Table of tickets waiting) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] shadow-xl p-5 flex-1 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-xs font-black text-white tracking-widest flex items-center gap-1.5 uppercase">
                <Users className="w-4 h-4 text-slate-500" />
                Daftar Antrian Menunggu
              </h2>
              <span className="font-mono bg-emerald-950 border border-emerald-900/60 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-lg">
                {waitingTickets.length} Orang
              </span>
            </div>

            {/* List with scroll */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[390px] pr-1">
              {waitingTickets.length > 0 ? (
                waitingTickets.map((ticket, index) => {
                  const waitingMinutes = Math.round(
                    (new Date().getTime() - new Date(ticket.createdAt).getTime()) / 60000
                  );

                  return (
                    <div 
                      key={ticket.id}
                      className={`p-3.5 border rounded-2xl flex items-center justify-between transition-colors ${
                        index === 0 
                          ? "bg-slate-950 border-emerald-500/20 shadow-xl" 
                          : "bg-slate-950/40 hover:bg-slate-950 border-slate-850"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-xs text-white bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md">
                          {ticket.formattedNumber}
                        </span>
                        <div>
                          <p className="font-bold text-xs text-slate-200 leading-tight">
                            {ticket.category}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-mono font-semibold uppercase">
                            <Clock className="w-3 h-3" />
                            {waitingMinutes === 0 ? "Baru saja" : `${waitingMinutes} mnt`}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAction(async () => {
                          await onCallSpecific(currentCounter.id, ticket.id);
                        })}
                        className="flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-slate-800 px-2.5 py-1.5 rounded-xl cursor-pointer uppercase tracking-widest transition-colors font-mono"
                      >
                        <Play className="w-2 h-2 fill-emerald-400" />
                        PANGGIL
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-xs text-slate-500 font-medium italic border border-dashed border-slate-800 rounded-xl">
                  Tidak ada antrian yang sedang menunggu.
                </div>
              )}
            </div>
          </div>

          {/* Quick Counter Statistics for this operator account */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Selesai Transaksi</div>
              <div className="text-2xl font-black font-semi text-emerald-450 mt-1.5 flex items-center gap-1">
                <TrendingUp className="w-4.5 h-4.5 text-emerald-400" />
                {completedCount}
              </div>
              <p className="text-[9px] text-slate-500 mt-1">Selesai dari Loket ini</p>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Tiket Dilewati</div>
              <div className="text-2xl font-black font-semi text-amber-450 mt-1.5 flex items-center gap-1">
                <Award className="w-4.5 h-4.5 text-amber-450" />
                {skippedCount}
              </div>
              <p className="text-[9px] text-slate-500 mt-1">Tandai pengunjung absen</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
