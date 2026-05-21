/**
 * Convert numerical value to Indonesian spelling words
 * to guarantee perfect speech synthesis on all OS platforms.
 */
export function terbilang(n: number): string {
  if (n === 0) return "nol";
  
  const numWords = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  
  if (n < 12) {
    return numWords[n];
  } else if (n < 20) {
    return numWords[n - 10] + " belas";
  } else if (n < 100) {
    const pulu = Math.floor(n / 10);
    const sisa = n % 10;
    return numWords[pulu] + " puluh " + (sisa > 0 ? numWords[sisa] : "");
  } else if (n < 200) {
    return "seratus " + (n - 100 > 0 ? terbilang(n - 100) : "");
  } else if (n < 1000) {
    const ratus = Math.floor(n / 100);
    const sisa = n % 100;
    return numWords[ratus] + " ratus " + (sisa > 0 ? terbilang(sisa) : "");
  }
  return n.toString();
}

/**
 * Procedural synthesiser for a professional chimer sound.
 * Plays a major-chord roll (C5 -> E5 -> G5 -> C6).
 * No external file dependencies, highly reliable, loads instantly.
 */
export async function playQueueChime(): Promise<void> {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  const audioCtx = new AudioContextClass();
  
  // Resume AudioContext if suspended by browser autoplay policy
  if (audioCtx.state === "suspended") {
    try {
      await audioCtx.resume();
    } catch (e) {
      console.warn("Failed to resume AudioContext chime:", e);
    }
  }

  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (harmonious chord)
  const duration = 0.18;
  const delay = 0.14;

  for (let i = 0; i < notes.length; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(notes[i], audioCtx.currentTime + i * delay);
    
    // Smooth ramp in and out to prevent clipping noise
    gain.gain.setValueAtTime(0, audioCtx.currentTime + i * delay);
    gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + i * delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * delay + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(audioCtx.currentTime + i * delay);
    osc.stop(audioCtx.currentTime + i * delay + duration + 0.2);
  }

  return new Promise((resolve) => setTimeout(resolve, 800));
}

/**
 * Text-to-speech announcement for queue numbers in Indonesian phrasing.
 */
export function speakIndonesianQueueNumber(prefix: string, number: number, counterName: string): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }

    // Cancel any ongoing or stuck speech queued in the browser (CRITICAL to prevent speech synthesis hang)
    window.speechSynthesis.cancel();

    // Standardize letter pronuncation in Indonesian phonetics
    let letterSound = prefix;
    if (prefix === "A") letterSound = "A";
    else if (prefix === "B") letterSound = "Bé";
    else if (prefix === "C") letterSound = "Cé";

    const spelling = terbilang(number);
    
    // Build counter name pronunciation (e.g., Loket 1 -> Loket satu)
    let counterPronounce = counterName;
    const match = counterName.match(/(\d+)/);
    if (match) {
      const numVal = parseInt(match[1], 10);
      counterPronounce = counterName.replace(match[1], terbilang(numVal));
    }

    // Polite instruction phrasing
    const message = `Nomor antrian, ${letterSound}, ${spelling}. Silakan menuju ke, ${counterPronounce}.`;
    
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "id-ID";
    utterance.rate = 0.85; // Slightly slower, highly clear and professional pronunciation
    utterance.pitch = 1.0;

    const speak = () => {
      // Try to explicitly bind an Indonesian voice if available
      const voices = window.speechSynthesis.getVoices();
      const indonesianVoice = voices.find(
        (v) => v.lang.toLowerCase().startsWith("id") || v.lang.toLowerCase().includes("id")
      );
      if (indonesianVoice) {
        utterance.voice = indonesianVoice;
      }

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn("Speech synthesis warning:", e);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    };

    // If voices are already loaded, speak immediately
    if (window.speechSynthesis.getVoices().length > 0) {
      speak();
    } else {
      // Otherwise, wait for voices asynchronously
      const handleVoicesChanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        speak();
      };
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
      
      // Fallback if voiceschanged never fires (e.g., cached voices or no voice dynamic updates)
      setTimeout(() => {
        if (window.speechSynthesis.onvoiceschanged === handleVoicesChanged) {
          window.speechSynthesis.onvoiceschanged = null;
          speak();
        }
      }, 300);
    }
    
    // Auto fallback resolve in case it gets blocked
    setTimeout(() => {
      resolve();
    }, 7000);
  });
}
