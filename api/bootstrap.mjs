import { scenarios } from "../lib/scenarios.mjs";

export default function handler(request, response) {
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed" });
  return response.status(200).json({ scenarios, mode: "PAPER EXECUTION" });
}
