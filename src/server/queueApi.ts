import { Counter, QueueState, Ticket, CallEvent } from "../types.js";

type RequestLike = {
  body?: any;
  method?: string;
};

type ResponseLike = {
  json: (body: any) => void;
  status: (code: number) => ResponseLike;
};

const generateId = () => Math.random().toString(36).substring(2, 11);

const INITIAL_COUNTERS: Counter[] = [
  { id: "L1", name: "Loket 1", currentTicketId: null, active: true, operatorName: "Budi Santoso" },
  { id: "L2", name: "Loket 2", currentTicketId: null, active: true, operatorName: "Dewi Lestari" },
  { id: "L3", name: "Loket 3", currentTicketId: null, active: true, operatorName: "Ahmad Fauzi" },
  { id: "L4", name: "Loket 4", currentTicketId: null, active: true, operatorName: "Siti Rahma" },
];

const createInitialState = (): QueueState => ({
  tickets: [],
  counters: INITIAL_COUNTERS.map((counter) => ({ ...counter })),
  activeCallEvent: null,
  lastReset: new Date().toISOString(),
});

let state: QueueState = createInitialState();

const getPath = (routePath?: string) => {
  if (!routePath || routePath === "/") {
    return "/";
  }

  return routePath.startsWith("/") ? routePath : `/${routePath}`;
};

export function handleQueueApiRequest(req: RequestLike, res: ResponseLike, routePath?: string) {
  const method = req.method?.toUpperCase();
  const path = getPath(routePath);

  if (method === "GET" && path === "/") {
    res.json(state);
    return;
  }

  if (method === "POST" && path === "/ticket") {
    const { prefix, category } = req.body ?? {};
    if (!prefix || !["A", "B", "C"].includes(prefix)) {
      res.status(400).json({ error: "Prefix must be A, B, or C" });
      return;
    }

    const todayTickets = state.tickets.filter((ticket) => ticket.prefix === prefix);
    const nextNumber = todayTickets.length > 0
      ? Math.max(...todayTickets.map((ticket) => ticket.number)) + 1
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
    return;
  }

  if (method === "POST" && path === "/call") {
    const { counterId, prefixFilter, specificTicketId } = req.body ?? {};
    const counterIndex = state.counters.findIndex((counter) => counter.id === counterId);

    if (counterIndex === -1) {
      res.status(404).json({ error: "Counter not found" });
      return;
    }

    const counter = state.counters[counterIndex];

    if (counter.currentTicketId) {
      const activeTicket = state.tickets.find((ticket) => ticket.id === counter.currentTicketId);
      if (activeTicket && activeTicket.status === "calling") {
        activeTicket.status = "completed";
      }
    }

    let ticketToCall: Ticket | undefined;

    if (specificTicketId) {
      ticketToCall = state.tickets.find((ticket) => ticket.id === specificTicketId);
    } else {
      let candidates = state.tickets.filter((ticket) => ticket.status === "waiting");
      if (prefixFilter && ["A", "B", "C"].includes(prefixFilter)) {
        candidates = candidates.filter((ticket) => ticket.prefix === prefixFilter);
      }

      candidates.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      ticketToCall = candidates[0];
    }

    if (!ticketToCall) {
      counter.currentTicketId = null;
      res.status(200).json({ message: "No tickets waiting", state });
      return;
    }

    ticketToCall.status = "calling";
    ticketToCall.counterId = counter.id;
    ticketToCall.calledAt = new Date().toISOString();
    counter.currentTicketId = ticketToCall.id;

    const callEvent: CallEvent = {
      id: generateId(),
      ticketId: ticketToCall.id,
      prefix: ticketToCall.prefix,
      number: ticketToCall.number,
      formattedNumber: ticketToCall.formattedNumber,
      counterId: counter.id,
      counterName: counter.name,
      timestamp: Date.now(),
      voiceText: `Nomor antrian, ${ticketToCall.prefix}, ${ticketToCall.number}, silakan menuju ke, ${counter.name}`,
    };

    state.activeCallEvent = callEvent;
    res.json({ ticket: ticketToCall, state });
    return;
  }

  if (method === "POST" && path === "/recall") {
    const { counterId } = req.body ?? {};
    const counter = state.counters.find((item) => item.id === counterId);

    if (!counter) {
      res.status(404).json({ error: "Counter not found" });
      return;
    }

    if (!counter.currentTicketId) {
      res.status(400).json({ error: "Counter is not serving any ticket right now" });
      return;
    }

    const ticket = state.tickets.find((item) => item.id === counter.currentTicketId);
    if (!ticket) {
      res.status(404).json({ error: "Serving ticket not found" });
      return;
    }

    state.activeCallEvent = {
      id: generateId(),
      ticketId: ticket.id,
      prefix: ticket.prefix,
      number: ticket.number,
      formattedNumber: ticket.formattedNumber,
      counterId: counter.id,
      counterName: counter.name,
      timestamp: Date.now(),
      voiceText: `Nomor antrian, ${ticket.prefix}, ${ticket.number}, silakan menuju ke, ${counter.name}`,
    };

    res.json({ ticket, state });
    return;
  }

  if (method === "POST" && path === "/skip") {
    const { counterId } = req.body ?? {};
    const counter = state.counters.find((item) => item.id === counterId);

    if (!counter) {
      res.status(404).json({ error: "Counter not found" });
      return;
    }

    if (counter.currentTicketId) {
      const ticket = state.tickets.find((item) => item.id === counter.currentTicketId);
      if (ticket) {
        ticket.status = "skipped";
      }
      counter.currentTicketId = null;
    }

    res.json(state);
    return;
  }

  if (method === "POST" && path === "/complete") {
    const { counterId } = req.body ?? {};
    const counter = state.counters.find((item) => item.id === counterId);

    if (!counter) {
      res.status(404).json({ error: "Counter not found" });
      return;
    }

    if (counter.currentTicketId) {
      const ticket = state.tickets.find((item) => item.id === counter.currentTicketId);
      if (ticket) {
        ticket.status = "completed";
      }
      counter.currentTicketId = null;
    }

    res.json(state);
    return;
  }

  if (method === "POST" && path === "/counter/update") {
    const { counterId, operatorName, active, name } = req.body ?? {};
    const counter = state.counters.find((item) => item.id === counterId);

    if (!counter) {
      res.status(404).json({ error: "Counter not found" });
      return;
    }

    if (operatorName !== undefined) {
      counter.operatorName = operatorName;
    }
    if (active !== undefined) {
      counter.active = active;
    }
    if (name !== undefined) {
      counter.name = name;
    }

    res.json(state);
    return;
  }

  if (method === "POST" && path === "/reset") {
    state = createInitialState();
    res.json(state);
    return;
  }

  res.status(404).json({ error: "Queue endpoint not found" });
}

export function registerQueueRoutes(
  app: {
    get: (path: string, handler: (req: any, res: any) => void) => void;
    post: (path: string, handler: (req: any, res: any) => void) => void;
  },
) {
  app.get("/api/queue", (req, res) => {
    handleQueueApiRequest(req, res, "/");
  });

  app.post("/api/queue/ticket", (req, res) => {
    handleQueueApiRequest(req, res, "/ticket");
  });

  app.post("/api/queue/call", (req, res) => {
    handleQueueApiRequest(req, res, "/call");
  });

  app.post("/api/queue/recall", (req, res) => {
    handleQueueApiRequest(req, res, "/recall");
  });

  app.post("/api/queue/skip", (req, res) => {
    handleQueueApiRequest(req, res, "/skip");
  });

  app.post("/api/queue/complete", (req, res) => {
    handleQueueApiRequest(req, res, "/complete");
  });

  app.post("/api/queue/counter/update", (req, res) => {
    handleQueueApiRequest(req, res, "/counter/update");
  });

  app.post("/api/queue/reset", (req, res) => {
    handleQueueApiRequest(req, res, "/reset");
  });
}
