import { v } from "convex/values";
import { action } from "./_generated/server";

function config() {
  const baseUrl = process.env.CURRENCY_API_URL;
  const apiKey = process.env.CURRENCY_API_KEY;
  if (!baseUrl || !apiKey) throw new Error("Currency API is not configured.");
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

export const getRates = action({
  args: {},
  handler: async () => {
    const { baseUrl, apiKey } = config();
    const response = await fetch(`${baseUrl}/rates`, {
      headers: { "x-api-key": apiKey },
    });
    if (!response.ok) throw new Error(`Currency API failed: ${response.status}`);
    return await response.json();
  },
});

export const convert = action({
  args: { from: v.string(), to: v.string(), amount: v.number() },
  handler: async (_, args) => {
    const { baseUrl, apiKey } = config();
    const params = new URLSearchParams({
      from: args.from,
      to: args.to,
      amount: String(args.amount),
    });
    const response = await fetch(`${baseUrl}/convert?${params.toString()}`, {
      headers: { "x-api-key": apiKey },
    });
    if (!response.ok) throw new Error(`Currency conversion failed: ${response.status}`);
    return await response.json();
  },
});