import React, { useState } from "react";
import { QueueState, Ticket, SERVICE_CATEGORIES } from "../types.js";
import { 
  Printer, 
  Ticket as TicketIcon, 
  FileText, 
  Headphones, 
  CreditCard,
  Clock,
  Sparkles,
  CheckCheck,
  Building,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TicketViewProps {
  queueData: QueueState | null;
  onIssueTicket: (prefix: 'A' | 'B' | 'C', category: string) => Promise<Ticket>;
}

export default function TicketView({ queueData, onIssueTicket }: TicketViewProps) {
  const [issuedTicket, setIssuedTicket] = useState<Ticket | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Helper to get waiting count for each category today
  const getWaitingCount = (prefix: "A" | "B" | "C") => {
    if (!queueData) return 0;
    return queueData.tickets.filter((t) => t.prefix === prefix && t.status === "waiting").length;
  };

  // Helper to query estimated waiting time (1 ticket servetime approx 3 minutes)
  const getEstimatedWaitTime = (prefix: "A" | "B" | "C") => {
    const count = getWaitingCount(prefix);
    if (count === 0) return "Tanpa Antrian";
    return `± ${count * 3} Menit`;
  };

  // Issue ticket command
  const handlePrint = async (prefix: "A" | "B" | "C", category: string) => {
    try {
      setIsPrinting(true);
      
      // Simulated ticket printer mechanical sound cue (synthesized oscillator)
      playPrintBeep();

      const newTicket = await onIssueTicket(prefix, category);
      
      // Delay to show cool "printing..." animation
      setTimeout(() => {
        setIssuedTicket(newTicket);
        setIsPrinting(false);
      }, 1500);

    } catch (e) {
      console.error(e);
      alert("Gagal cetak tiket, periksa sambungan server.");
      setIsPrinting(false);
    }
  };

  // Procedural synthesizer for a short, crisp physical ticket printing sound
  const playPrintBeep = () => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth"; // Gives a slightly buzzier/mechanical printing vibe
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  };

  // Export ticket slip as clear text (.TXT) file with aesthetic ASCII boundaries
  const exportTicketAsFile = (ticket: Ticket) => {
    const frontWaitingCount = queueData 
      ? queueData.tickets.filter((t) => t.prefix === ticket.prefix && t.status === "waiting").length - 1 
      : 0;
    const waitingText = frontWaitingCount > 0 ? `${frontWaitingCount} Orang` : "0 Orang (Giliran Anda Berikutnya)";
    
    const timeFormatted = new Date(ticket.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const dateFormatted = new Date(ticket.createdAt).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const fileContent = `========================================
         KANTOR PELAYANAN UTAMA         
      JL. BALAI RAYA NO. 12 JAKARTA      
========================================
             TIKET ANTRIAN              
----------------------------------------
Kategori      : ${ticket.category}
Nomor Antrian : ${ticket.formattedNumber}
Sisa Antrian  : ${waitingText}
Waktu Cetak   : ${dateFormatted}, ${timeFormatted} WIB
----------------------------------------
  Terima kasih telah mengantri dengan  
  tertib. Mohon perhatikan layar monitor
  dan suara panggilan utama.
========================================`;

    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tiket_antrian_${ticket.formattedNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper to return icons based on categories
  const getCategoryIcon = (prefix: "A" | "B" | "C") => {
    switch (prefix) {
      case "A":
        return <FileText className="w-6 h-6 text-blue-450" />;
      case "B":
        return <Headphones className="w-6 h-6 text-amber-450" />;
      case "C":
        return <CreditCard className="w-6 h-6 text-emerald-450" />;
    }
  };

  // Helper to return colors for borders/effects based on categories
  const getCategoryBgColor = (prefix: "A" | "B" | "C") => {
    switch (prefix) {
      case "A": return "bg-blue-950/40 text-blue-300 hover:border-blue-800/80";
      case "B": return "bg-amber-950/40 text-amber-300 hover:border-amber-800/80";
      case "C": return "bg-emerald-950/40 text-emerald-300 hover:border-emerald-800/80";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title greeting message */}
      <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl text-center max-w-2xl mx-auto space-y-2.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
        <div className="inline-flex items-center justify-center p-3.5 bg-slate-950 text-emerald-400 rounded-2xl mb-2 border border-slate-800">
          <Building className="w-6 h-6 animate-pulse" />
        </div>
        <h1 className="text-xl font-black text-white tracking-tight">
          Sistem Pendaftaran Tiket Mandiri
        </h1>
        <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
          Silakan tentukan jenis kategori pelayanan yang Anda butuhkan di bawah ini. Tombol akan mencetak slip antrian dengan kode unik Anda.
        </p>
      </div>

      {/* Grid of categories cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
        {SERVICE_CATEGORIES.map((cat) => {
          const waitingCount = getWaitingCount(cat.prefix);
          const estTime = getEstimatedWaitTime(cat.prefix);

          return (
            <motion.div
              key={cat.prefix}
              whileHover={{ y: -4 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 transition-all text-left flex flex-col justify-between hover:border-slate-700/80 shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              
              <div className="relative z-10">
                {/* Header prefix circle */}
                <div className="flex items-center justify-between mb-5">
                  <div className={`p-3 rounded-xl ${
                    cat.prefix === "A" ? "bg-blue-950/60 text-blue-400 border border-blue-900/40" : cat.prefix === "B" ? "bg-amber-950/60 text-amber-400 border border-amber-900/40" : "bg-emerald-950/60 text-emerald-400 border border-emerald-900/40"
                  }`}>
                    {getCategoryIcon(cat.prefix)}
                  </div>
                  <span className="font-mono text-2xl font-black text-slate-700 bg-slate-950 rounded-lg px-2.5 py-0.5 uppercase border border-slate-900/60">
                    {cat.prefix}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-1.5 flex items-center gap-1.5">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
                  {cat.description}
                </p>
              </div>

              {/* Stats below */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono relative z-10">
                <div>
                  <p className="text-slate-500 text-[10px] uppercase font-semibold">Sedang Antri</p>
                  <p className="font-bold text-slate-200">{waitingCount} Orang</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 text-[10px] uppercase font-semibold">Estimasi Tunggu</p>
                  <p className="font-bold text-slate-200 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-450 inline" />
                    {estTime}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <button
                disabled={isPrinting}
                onClick={() => handlePrint(cat.prefix, cat.name)}
                className={`w-full mt-5 relative z-10 flex items-center justify-center gap-2 px-5 py-3 font-extrabold text-xs rounded-xl cursor-pointer transition-all border ${
                  cat.prefix === "A" 
                    ? "bg-blue-600/95 hover:bg-blue-500 text-white border-blue-500/30 font-bold shadow-lg shadow-blue-950/30" 
                    : cat.prefix === "B" 
                    ? "bg-amber-600/95 hover:bg-amber-500 text-white border-amber-500/30 font-bold shadow-lg shadow-amber-950/30" 
                    : "bg-emerald-600/95 hover:bg-emerald-500 text-white border-emerald-500/30 font-bold shadow-lg shadow-emerald-950/30"
                } disabled:bg-slate-800 disabled:text-slate-600 disabled:border-slate-850 disabled:shadow-none disabled:cursor-not-allowed`}
              >
                <Printer className="w-4 h-4" />
                {isPrinting ? "Mencetak..." : "Ambil Nomor Antrian"}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Printing Machine Overlay loader */}
      <AnimatePresence>
        {isPrinting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center"
          >
            <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-800 text-center space-y-4 max-w-xs w-full relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
              <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-emerald-400 animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="font-bold text-white text-sm">Menghubungi Printer...</p>
                <p className="text-slate-400 text-xs font-mono">Sedang memproses & memotong kertas...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thermal printed receipt simulation Pop-up/Modal */}
      <AnimatePresence>
        {issuedTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden flex flex-col items-center border border-slate-100"
            >
              {/* Receipt cut notch pattern decorations */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle,transparent_20%,white_20%,white_40%,transparent_40%,transparent_60%,white_60%,white_80%,transparent_80%)] bg-[length:16px_4px] bg-slate-200"></div>

              {/* Success stamp */}
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-4 border border-emerald-100 animate-[bounce_1s_ease-in-out_1]">
                <CheckCheck className="w-6 h-6" />
              </div>

              <div className="text-center w-full border-b border-dashed border-gray-200 pb-4 mb-4">
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-widest text-slate-400 leading-tight">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  KANTOR PELAYANAN UTAMA
                </span>
                <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase">
                  JL. BALAI RAYA NO. 12 JAKARTA
                </p>
              </div>

              {/* Receipt details */}
              <div className="text-center w-full space-y-1 mb-4">
                <p className="text-xs font-bold text-slate-900">TIKET ANTRIAN</p>
                <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 font-sans border border-slate-200">
                  {issuedTicket.category}
                </span>

                {/* Big number */}
                <h2 className="text-6xl font-black font-mono tracking-tighter text-slate-900 py-4 select-all">
                  {issuedTicket.formattedNumber}
                </h2>

                <div className="bg-slate-50 border border-gray-100 rounded-xl p-3 text-xs font-mono text-slate-600 flex justify-between items-center text-left">
                  <div>
                    <p className="text-slate-400">Depan Anda</p>
                    <p className="font-bold text-slate-800 text-sm">
                      {queueData ? queueData.tickets.filter((t) => t.prefix === issuedTicket.prefix && t.status === "waiting").length - 1 : 0} Orang
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400">Jam Cetak</p>
                    <p className="font-bold text-slate-800">
                      {new Date(issuedTicket.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center pb-5 border-b border-dashed border-gray-200 w-full mb-5">
                <p className="text-[10px] font-semibold text-slate-400 leading-relaxed italic max-w-[240px] mx-auto">
                  "Terima kasih telah mengantri dengan tertib. Mohon perhatikan layar monitor dan suara panggilan utama."
                </p>
              </div>

              {/* Action buttons on thermal slip */}
              <div className="w-full space-y-2">
                <button
                  onClick={() => exportTicketAsFile(issuedTicket)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 cursor-pointer transition-all uppercase tracking-wider"
                >
                  <Download className="w-4 h-4 animate-pulse" />
                  Download Slip (.TXT)
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="py-2.5 bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-150 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Cetak Fisik
                  </button>
                  <button
                    onClick={() => setIssuedTicket(null)}
                    className="py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Tutup Tiket
                  </button>
                </div>
              </div>

              {/* Thermal receipt cut notch pattern bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[radial-gradient(circle,transparent_20%,white_20%,white_40%,transparent_40%,transparent_60%,white_60%,white_80%,transparent_80%)] bg-[length:16px_4px] bg-slate-200 rotate-180"></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
