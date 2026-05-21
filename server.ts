import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { registerQueueRoutes } from "./src/server/queueApi.js";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT ?? 3000);
  const isProduction = process.env.NODE_ENV === "production";

  // Middleware to parse json bodies
  app.use(express.json());

  registerQueueRoutes(app);

  // Vite integration
  if (!isProduction) {
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
