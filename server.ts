import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Ticket, Counter, QueueState, CallEvent } from "./src/types.js";

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

// Standard initial counters
const INITIAL_COUNTERS: Counter[] = [
  { id: "L1", name: "Loket 1", currentTicketId: null, active: true, operatorName: "Budi Santoso" },
  { id: "L2", name: "Loket 2", currentTicketId: null, active: true, operatorName: "Dewi Lestari" },
  { id: "L3", name: "Loket 3", currentTicketId: null, active: true, operatorName: "Ahmad Fauzi" },
  { id: "L4", name: "Loket 4", currentTicketId: null, active: true, operatorName: "Siti Rahma" },
];

// Server state (In-memory)
let state: QueueState = {
  tickets: [],
  counters: INITIAL_COUNTERS,
  activeCallEvent: null,
  lastReset: new Date().toISOString(),
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse json bodies
  app.use(express.json());

  // API Endpoints
  
  // 1. Get current queue state
  app.get("/api/queue", (req, res) => {
    res.json(state);
  });

  // 2. Issue a new ticket
  app.post("/api/queue/ticket", (req, res) => {
    const { prefix, category } = req.body;
    if (!prefix || !["A", "B", "C"].includes(prefix)) {
      return res.status(400).json({ error: "Prefix must be A, B, or C" });
    }

    const todayTickets = state.tickets.filter((t) => t.prefix === prefix);
    const nextNumber = todayTickets.length > 0 
      ? Math.max(...todayTickets.map((t) => t.number)) + 1 
      : 1;

    const formattedNumber = `${prefix}-${nextNumber.toString().padStart(3, "0")}`;

    const newTicket: Ticket = {
      id: generateId(),
      number: nextNumber,
      prefix: prefix as "A" | "B" | "C",
      formattedNumber,
      category: category || (prefix === "A" ? "Layanan Umum" : prefix === "B" ? "Customer Service" : "Layanan Kasir"),
      status: "waiting",
      counterId: null,
      createdAt: new Date().toISOString(),
      calledAt: null,
    };

    state.tickets.push(newTicket);
    res.status(201).json({ ticket: newTicket, state });
  });

  // 3. Call a ticket (Operator calls next/specific ticket)
  app.post("/api/queue/call", (req, res) => {
    const { counterId, prefixFilter, specificTicketId } = req.body;
    
    // Find counter
    const counterIndex = state.counters.findIndex((c) => c.id === counterId);
    if (counterIndex === -1) {
      return res.status(404).json({ error: "Counter not found" });
    }
    const counter = state.counters[counterIndex];

    // Complete any currently active ticket on this counter first
    if (counter.currentTicketId) {
      const activeTicket = state.tickets.find((t) => t.id === counter.currentTicketId);
      if (activeTicket && activeTicket.status === "calling") {
        activeTicket.status = "completed";
      }
    }

    let ticketToCall: Ticket | undefined;

    if (specificTicketId) {
      // Operator calls a specific ticket (e.g. recall, re-routing, or manually selected)
      ticketToCall = state.tickets.find((t) => t.id === specificTicketId);
    } else {
      // Find oldest ticket with status = 'waiting' that matches premium filters if any
      let candidates = state.tickets.filter((t) => t.status === "waiting");
      if (prefixFilter && ["A", "B", "C"].includes(prefixFilter)) {
        candidates = candidates.filter((t) => t.prefix === prefixFilter);
      }
      
      // Sort candidates by creation time (FCFS)
      candidates.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      ticketToCall = candidates[0];
    }

    if (!ticketToCall) {
      // No tickets in waiting list
      counter.currentTicketId = null;
      return res.status(200).json({ message: "No tickets waiting", state });
    }

    // Update ticket
    ticketToCall.status = "calling";
    ticketToCall.counterId = counter.id;
    ticketToCall.calledAt = new Date().toISOString();

    // Update counter
    counter.currentTicketId = ticketToCall.id;

    // Build polite Indonesian announcement details for voice call
    const digitString = ticketToCall.number.toString();
    const prefixPronunciation = ticketToCall.prefix; // e.g. "A"
    const counterName = counter.name; // e.g., "Loket 1"

    // Construct highly natural Indonesian text-to-speech phrase
    const voiceText = `Nomor antrian, ${prefixPronunciation}, ${digitString}, silakan menuju ke, ${counterName}`;

    const callEvent: CallEvent = {
      id: generateId(),
      ticketId: ticketToCall.id,
      prefix: ticketToCall.prefix,
      number: ticketToCall.number,
      formattedNumber: ticketToCall.formattedNumber,
      counterId: counter.id,
      counterName: counter.name,
      timestamp: Date.now(),
      voiceText,
    };

    state.activeCallEvent = callEvent;

    res.json({ ticket: ticketToCall, state });
  });

  // 4. Recall (Repeat calling current ticket on operator counter)
  app.post("/api/queue/recall", (req, res) => {
    const { counterId } = req.body;
    const counter = state.counters.find((c) => c.id === counterId);
    
    if (!counter) {
      return res.status(404).json({ error: "Counter not found" });
    }

    if (!counter.currentTicketId) {
      return res.status(400).json({ error: "Counter is not serving any ticket right now" });
    }

    const ticket = state.tickets.find((t) => t.id === counter.currentTicketId);
    if (!ticket) {
      return res.status(404).json({ error: "Serving ticket not found" });
    }

    // Generate a fresh call event to trigger the speaker again
    const voiceText = `Nomor antrian, ${ticket.prefix}, ${ticket.number}, silakan menuju ke, ${counter.name}`;

    const callEvent: CallEvent = {
      id: generateId(),
      ticketId: ticket.id,
      prefix: ticket.prefix,
      number: ticket.number,
      formattedNumber: ticket.formattedNumber,
      counterId: counter.id,
      counterName: counter.name,
      timestamp: Date.now(),
      voiceText,
    };

    state.activeCallEvent = callEvent;

    res.json({ ticket, state });
  });

  // 5. Skip current ticket (marks it as skipped and idles counter)
  app.post("/api/queue/skip", (req, res) => {
    const { counterId } = req.body;
    const counter = state.counters.find((c) => c.id === counterId);
    
    if (!counter) {
      return res.status(404).json({ error: "Counter not found" });
    }

    if (counter.currentTicketId) {
      const ticket = state.tickets.find((t) => t.id === counter.currentTicketId);
      if (ticket) {
        ticket.status = "skipped";
      }
      counter.currentTicketId = null;
    }

    res.json(state);
  });

  // 6. Complete current ticket (marks it as completed and idles counter)
  app.post("/api/queue/complete", (req, res) => {
    const { counterId } = req.body;
    const counter = state.counters.find((c) => c.id === counterId);
    
    if (!counter) {
      return res.status(404).json({ error: "Counter not found" });
    }

    if (counter.currentTicketId) {
      const ticket = state.tickets.find((t) => t.id === counter.currentTicketId);
      if (ticket) {
        ticket.status = "completed";
      }
      counter.currentTicketId = null;
    }

    res.json(state);
  });

  // 7. Update counter details
  app.post("/api/queue/counter/update", (req, res) => {
    const { counterId, operatorName, active, name } = req.body;
    const counter = state.counters.find((c) => c.id === counterId);
    
    if (!counter) {
      return res.status(404).json({ error: "Counter not found" });
    }

    if (operatorName !== undefined) counter.operatorName = operatorName;
    if (active !== undefined) counter.active = active;
    if (name !== undefined) counter.name = name;

    res.json(state);
  });

  // 8. Reset the entire queue
  app.post("/api/queue/reset", (req, res) => {
    state = {
      tickets: [],
      counters: INITIAL_COUNTERS.map(c => ({...c, currentTicketId: null})),
      activeCallEvent: null,
      lastReset: new Date().toISOString(),
    };
    res.json(state);
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Support React Router / SPA-fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Queue System] Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Critical: Express failed to start", err);
});
