import React, { useEffect, useState, useRef } from "react";
import { QueueState, CallEvent } from "../types.js";
import { playQueueChime, speakIndonesianQueueNumber } from "../utils/audio.js";
import { 
  Volume2, 
  VolumeX, 
  Tv, 
  History, 
  Radio, 
  User, 
  Users, 
  Sparkles,
  Megaphone,
  BellRing
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MonitorViewProps {
  queueData: QueueState | null;
  onRefresh: () => void;
}

export default function MonitorView({ queueData, onRefresh }: MonitorViewProps) {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeCall, setActiveCall] = useState<CallEvent | null>(null);
  const [showCallOverlay, setShowCallOverlay] = useState<boolean>(false);
  
  const lastPlayedId = useRef<string | null>(null);
  const lastSpokenId = useRef<string | null>(null);

  // Automatically poll the backend for queue updates
  useEffect(() => {
    const timer = setInterval(() => {
      onRefresh();
    }, 1500);
    return () => clearInterval(timer);
  }, [onRefresh]);

  // Sync active event for visual overlay
  useEffect(() => {
    if (!queueData || !queueData.activeCallEvent) return;

    const event = queueData.activeCallEvent;

    // Check if this is a brand new call event we haven't processed visually yet
    if (lastPlayedId.current !== event.id) {
      lastPlayedId.current = event.id;
      setActiveCall(event);
      setShowCallOverlay(true);
    }
  }, [queueData]);

  // Sync speech call separately when activeCall is present and sound is enabled
  useEffect(() => {
    if (!soundEnabled || !activeCall) return;

    if (lastSpokenId.current !== activeCall.id) {
      lastSpokenId.current = activeCall.id;
      (async () => {
        try {
          await playQueueChime();
          await speakIndonesianQueueNumber(activeCall.prefix, activeCall.number, activeCall.counterName);
        } catch (e) {
          console.error("Audio playback error:", e);
        }
      })();
    }
  }, [soundEnabled, activeCall]);

  // Distinct effect to handle dynamic auto-dismiss callback for overlay
  useEffect(() => {
    if (showCallOverlay) {
       const dismissTimer = setTimeout(() => {
        setShowCallOverlay(false);
      }, 8000);
      return () => clearTimeout(dismissTimer);
    }
  }, [showCallOverlay]);

  // Unlock browser audio/speech policies on first click/interaction anywhere on the screen
  useEffect(() => {
    const handleFirstInteraction = () => {
      if ("speechSynthesis" in window) {
        try {
          const u = new SpeechSynthesisUtterance("");
          window.speechSynthesis.speak(u);
        } catch (e) {
          console.warn("Failed to trigger dummy speech unlock:", e);
        }
      }
      
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        try {
          const dummyCtx = new AudioCtxClass();
          if (dummyCtx.state === "suspended") {
            dummyCtx.resume();
          }
        } catch (e) {
          console.warn("Failed to trigger AudioContext unlock:", e);
        }
      }
      
      // Cleanup listener after first interaction
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };

    window.addEventListener("click", handleFirstInteraction);
    window.addEventListener("touchstart", handleFirstInteraction);
    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, []);

  // Derive historical data from tickets: tickets with status 'calling', 'completed', or 'skipped'
  const callingOrServedTickets = queueData
    ? [...queueData.tickets]
        .filter((t) => t.status !== "waiting" && t.calledAt)
        .sort((a, b) => new Date(b.calledAt!).getTime() - new Date(a.calledAt!).getTime())
        .slice(0, 5)
    : [];

  // General statistics
  const totalAntrian = queueData ? queueData.tickets.length : 0;
  const sisaAntrian = queueData ? queueData.tickets.filter((t) => t.status === "waiting").length : 0;
  const sudahDilayani = queueData ? queueData.tickets.filter((t) => t.status === "completed").length : 0;

  // Formatting date/time for real-time display
  const [currentTime, setCurrentTime] = useState<string>("");
  useEffect(() => {
    const updateTime = () => {
      const localeOption: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      setCurrentTime(new Date().toLocaleDateString("id-ID", localeOption));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Sound System Bar & Clock */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-slate-900 border border-slate-800 p-5 rounded-3xl gap-4 shadow-xl transition-all">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-950 text-emerald-400 border border-slate-800">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Layar Monitor Pengendali Utama
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-emerald-950 text-emerald-400 border border-emerald-800/50 uppercase tracking-widest">
                Sinkron Live
              </span>
            </h1>
            <p className="text-xs text-emerald-400 font-mono mt-0.5">{currentTime}</p>
          </div>
        </div>

        {/* Sound Toggle Button with Floating Warning */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {!soundEnabled && (
            <span className="text-[10px] text-amber-400 bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-900/50 animate-pulse font-semibold">
              ⚠️ AKTIFKAN SUARA UNTUK MEMUTAR PANGGILAN!
            </span>
          )}
          <button
            id="toggle-speaker-btn"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              // Trigger a dummy silent call on first interaction to unlock speechSynthesis policy
              if (!soundEnabled && "speechSynthesis" in window) {
                const u = new SpeechSynthesisUtterance("");
                window.speechSynthesis.speak(u);
              }
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer uppercase tracking-wider ${
              soundEnabled
                ? "bg-slate-800 text-emerald-400 border border-slate-700/60 hover:bg-slate-750"
                : "bg-red-950/80 text-white border border-red-700 hover:bg-red-900"
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4.5 h-4.5" />
                <span>Suara Aktif (id-ID)</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4.5 h-4.5" />
                <span>Aktifkan Suara</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Big Screen Display of the Current Served Number */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Main Display Screen Card */}
          <div className="bg-slate-900 text-white rounded-[2rem] p-8 shadow-2xl border border-slate-800 relative overflow-hidden flex-1 flex flex-col justify-between min-h-[380px]">
            
            {/* Background design accents */}
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-slate-950 rounded-full blur-3xl opacity-40"></div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-emerald-950/20 rounded-full blur-3xl opacity-20"></div>

            {/* Header Details */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-5 z-10">
              <div className="flex items-center gap-2">
                <Tv className="w-5 h-5 text-emerald-400" />
                <span className="text-xs uppercase font-extrabold text-slate-400 tracking-widest font-mono">
                  Sedang Dipanggil • Now Serving
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1 rounded-full text-[10px] font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                ONLINE
              </div>
            </div>

            {/* Primary Queue Display */}
            <div className="my-auto py-6 flex flex-col items-center justify-center text-center z-10">
              {callingOrServedTickets.length > 0 && callingOrServedTickets[0].status === "calling" ? (
                <div className="space-y-4">
                  <motion.div
                    key={callingOrServedTickets[0].id}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ 
                      scale: [1, 1.05, 1],
                      filter: [
                        "drop-shadow(0 0 0px rgba(52,211,153,0))", 
                        "drop-shadow(0 0 25px rgba(16,185,129,0.55))", 
                        "drop-shadow(0 0 0px rgba(52,211,153,0))"
                      ]
                    }}
                    transition={{
                      scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
                      filter: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
                      opacity: { duration: 0.3 }
                    }}
                    className="text-8xl md:text-[9rem] font-black font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-emerald-100 to-slate-350 select-all leading-none py-2"
                  >
                    {callingOrServedTickets[0].formattedNumber}
                  </motion.div>
                  
                  <div className="inline-flex items-center gap-2.5 bg-slate-950 text-emerald-400 px-5 py-3 rounded-2xl border border-slate-800">
                    <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      MENURUT KE LOKET:
                    </span>
                    <strong className="text-lg text-white font-black px-1 animate-pulse tracking-wide">
                      {queueData?.counters.find(c => c.id === callingOrServedTickets[0].counterId)?.name || "LOKET"}
                    </strong>
                  </div>

                  <p className="text-xs font-medium text-slate-400">
                    Kategori: <span className="text-white bg-slate-950 px-2.5 py-1 rounded-lg text-xs border border-slate-800 font-mono font-bold uppercase">{callingOrServedTickets[0].category}</span>
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-slate-950 flex items-center justify-center mx-auto text-slate-600 border border-slate-800">
                    <BellRing className="w-7 h-7" />
                  </div>
                  <p className="text-slate-350 text-base font-semibold">Antrian belum dipanggil</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Operator loket akan memanggil nomor antrian di layar admin untuk memperbaharui tampilan monitor utama.
                  </p>
                </div>
              )}
            </div>

            {/* Static Running Text Accent */}
            <div className="border-t border-slate-800 pt-5 flex items-center justify-between text-xs text-slate-500 z-10 font-mono">
              <span className="truncate max-w-[80%]">
                Silakan mengantri secara tertib dan perhatikan nomor panggilan.
              </span>
              <span className="text-emerald-500 bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-900/50 text-[10px] uppercase font-bold tracking-widest">SISTEM AKTIF</span>
            </div>
          </div>

          {/* Core Analytics Cards on Visitors View */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Tiket</div>
              <div className="text-3xl font-black font-semi text-white mt-1.5">{totalAntrian}</div>
              <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Dicetak hari ini</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sisa Antrian</div>
              <div className="text-3xl font-black font-semi text-amber-500 mt-1.5">{sisaAntrian}</div>
              <p className="text-[10px] text-slate-550 mt-1 uppercase font-semibold">Menunggu dilayani</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Selesai Dilayani</div>
              <div className="text-3xl font-black font-semi text-emerald-500 mt-1.5">{sudahDilayani}</div>
              <p className="text-[10px] text-slate-550 mt-1 uppercase font-semibold">Selesai transaksi</p>
            </div>
          </div>
        </div>

        {/* Right Column: Other Counters Servings & Calling History */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* State of All Active Counters */}
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] shadow-xl p-5 flex flex-col gap-4">
            <h2 className="text-xs font-black text-white tracking-widest flex items-center justify-between border-b border-slate-800 pb-3">
              <span>STATUS PER LOKET</span>
              <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded-md border border-emerald-800/80 uppercase tracking-widest">
                MONITOR
              </span>
            </h2>

            <div className="space-y-3">
              {queueData?.counters.filter(c => c.active).map((counter) => {
                const servingTicket = queueData.tickets.find(
                  (t) => t.id === counter.currentTicketId && t.status === "calling"
                );

                return (
                  <div 
                    key={counter.id} 
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      servingTicket 
                        ? "bg-slate-950 border-emerald-500/20 shadow-sm shadow-emerald-950/30" 
                        : "bg-slate-950/30 border-slate-850 opacity-60"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-200">{counter.name}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-1 font-sans">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate max-w-[120px] font-semibold">{counter.operatorName || "General Staff"}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      {servingTicket ? (
                        <div className="inline-flex items-center justify-center bg-emerald-500 text-slate-950 font-mono font-black text-sm px-3 py-1.5 rounded-xl shadow-md">
                          {servingTicket.formattedNumber}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-900/65 px-2.5 py-1.5 rounded-xl border border-slate-850">
                          Istirahat
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* History of Called Tickets */}
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] shadow-xl p-5 flex-1 flex flex-col gap-4">
            <h2 className="text-xs font-black text-white tracking-widest flex items-center gap-2 border-b border-slate-800 pb-3 uppercase">
              <History className="w-4 h-4 text-emerald-400" />
              <span>Panggilan Terakhir</span>
            </h2>

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[280px]">
              {callingOrServedTickets.slice(1).length > 0 ? (
                callingOrServedTickets.slice(1).map((ticket) => {
                  const targetCounter = queueData?.counters.find(c => c.id === ticket.counterId);
                  const formattedTime = ticket.calledAt 
                     ? new Date(ticket.calledAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) 
                     : "";

                  return (
                    <div 
                      key={ticket.id} 
                      className="flex items-center justify-between p-3.5 bg-slate-950/80 hover:bg-slate-950 rounded-2xl border border-slate-850 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-extrabold text-xs text-white bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
                          {ticket.formattedNumber}
                        </span>
                        <div>
                          <p className="font-bold text-slate-200">{targetCounter?.name || "Loket"}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-semibold uppercase">{ticket.category}</p>
                        </div>
                      </div>
                      <span className="font-mono text-slate-500 text-[10px] font-bold">{formattedTime}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-xs text-slate-500 font-medium italic">
                  Belum ada riwayat panggilan sebelumnya.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Floating Modal Overlay with Loud Flashing calling animation when calling is initiated */}
      <AnimatePresence>
        {showCallOverlay && activeCall && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md"
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              exit={{ y: -50 }}
              className="bg-slate-900 text-slate-105 rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl border border-slate-800 text-center relative overflow-hidden"
            >
              {/* Pulsing indicator background dots */}
              <div className="absolute inset-0 bg-emerald-500/5 -z-10 animate-pulse"></div>
              
              <div className="inline-flex items-center justify-center p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-400 rounded-3xl mb-4 animate-bounce">
                <Megaphone className="w-8 h-8 animate-pulse" />
              </div>

              <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 font-mono">
                PANGGILAN AKTIF • CALLING NOW
              </p>

              <motion.h3 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ 
                  scale: [1, 1.08, 1],
                  filter: [
                    "drop-shadow(0 0 0px rgba(52,211,153,0))", 
                    "drop-shadow(0 0 35px rgba(52,211,153,0.75))", 
                    "drop-shadow(0 0 0px rgba(52,211,153,0))"
                  ],
                  opacity: 1
                }}
                transition={{
                  scale: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
                  filter: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
                  opacity: { duration: 0.3 }
                }}
                className="text-7xl md:text-[6.5rem] font-black font-mono text-emerald-400 my-6 tracking-tighter"
              >
                {activeCall.formattedNumber}
              </motion.h3>

              <div className="space-y-3 mb-6">
                <p className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">
                  Silakan Menuju Ke:
                </p>
                <p className="text-4xl font-black text-emerald-400 tracking-wide uppercase leading-tight">
                  {activeCall.counterName}
                </p>
                <span className="inline-block px-3 py-1 bg-slate-950 border border-slate-800 text-slate-400 text-xs font-semibold rounded-lg font-mono">
                  {queueData?.tickets.find(t => t.id === activeCall.ticketId)?.category}
                </span>
              </div>

              <div className="w-full bg-slate-950 border border-slate-850 h-2.5 rounded-full overflow-hidden p-0.5">
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 7.5, ease: "linear" }}
                  className="bg-emerald-400 h-full rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                />
              </div>

              <button
                onClick={() => setShowCallOverlay(false)}
                className="mt-6 text-[10px] text-slate-550 hover:text-slate-200 font-extrabold uppercase tracking-widest underline cursor-pointer"
              >
                Tutup Monitor Notifikasi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Marquee Footer Display */}
      <div className="bg-slate-900 text-slate-400 py-3.5 px-6 rounded-2xl overflow-hidden shadow-xs relative text-xs border border-slate-850 font-medium">
        <div className="flex select-none pointer-events-none whitespace-nowrap gap-8 animate-marquee uppercase tracking-wider font-semibold">
          <span>📢 Selamat Datang di Sistem Antrian Suara Pintar.</span>
          <span>Budayakan mengantri secara tertib dan simpan barang berharga Anda dengan aman.</span>
          <span>Silakan ambil tiket pelayanan Anda sesuai dengan jenis layanan yang dituju.</span>
          <span>Layanan kami 100% bebas biaya dan aman dari tindakan calo.</span>
        </div>
      </div>
    </div>
  );
}
