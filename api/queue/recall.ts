import { handleQueueApiRequest } from "../../src/server/queueApi.js";

export default async function handler(req: any, res: any) {
  handleQueueApiRequest(req, res, "/recall");
}
