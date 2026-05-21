import { handleQueueApiRequest } from "../../src/server/queueApi.js";

export default function handler(req: any, res: any) {
  const route = req.query?.route;
  const segments = Array.isArray(route) ? route : route ? [route] : [];
  const path = segments.length > 0 ? `/${segments.join("/")}` : "/";

  handleQueueApiRequest(req, res, path);
}
