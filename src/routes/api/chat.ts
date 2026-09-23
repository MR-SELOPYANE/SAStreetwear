import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayRunIdFetch, withLovableAiGatewayRunIdHeader } from "@/lib/ai-gateway.server";

const SYSTEM = `You are "Mzansi Stylist", the shopping assistant for SA Streetwear — a marketplace for South African street vendors selling clothes, shoes and accessories.
- Help shoppers find items. ALWAYS use the search_products tool before recommending specific items; never invent products.
- Prices are in South African Rand (R). Orders are placed online and paid in cash on collection from the vendor.
- Keep answers short, friendly, with a little local flavour. When listing items, give title, price, vendor & location, and a markdown link: [View item](/product/<id>).
- If nothing matches, say so and suggest broader searches.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(messages)) return new Response("Messages are required", { status: 400 });
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const db = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const runIdFetch = createLovableAiGatewayRunIdFetch();
        const lovable = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey: key,
          headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });

        const result = streamText({
          model: lovable.responses("openai/gpt-6-astra"),
          system: SYSTEM,
          messages: await convertToModelMessages(messages as UIMessage[]),
          stopWhen: stepCountIs(50),
          tools: {
            search_products: tool({
              description: "Search SA Streetwear listings by keyword, category and max price.",
              inputSchema: z.object({
                query: z.string().describe("Keywords, e.g. 'black hoodie' or 'sneakers'. Empty string for any."),
                category: z
                  .string()
                  .nullable()
                  .describe("One of: Tops, Bottoms, Shoes, Jackets, Caps & Hats, Accessories, Dresses, Kids. Null for any."),
                max_price: z.number().nullable().describe("Maximum price in Rand, or null."),
              }),
              execute: async ({ query, category, max_price }) => {
                let q = db
                  .from("products")
                  .select("id, title, price, category, sizes, description, sellers!inner(shop_name, location, status)")
                  .eq("active", true)
                  .eq("sellers.status", "approved")
                  .limit(8);
                const words = query.trim().split(/\s+/).filter((w) => w.length > 1).slice(0, 4);
                if (words.length) {
                  q = q.or(words.map((w) => `title.ilike.%${w.replace(/[,()%]/g, "")}%,description.ilike.%${w.replace(/[,()%]/g, "")}%`).join(","));
                }
                if (category) q = q.eq("category", category);
                if (max_price != null) q = q.lte("price", max_price);
                const { data, error } = await q;
                if (error) return { error: error.message, results: [] };
                return {
                  results: (data ?? []).map((p) => {
                    const s = p.sellers as unknown as { shop_name: string; location: string };
                    return { id: p.id, title: p.title, price: p.price, category: p.category, sizes: p.sizes, vendor: s.shop_name, location: s.location };
                  }),
                };
              },
            }),
          },
          providerOptions: {
            openai: {
              store: false,
              include: ["reasoning.encrypted_content"],
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
            },
          },
        });

        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({ originalMessages: messages as UIMessage[] }),
          runIdFetch,
        );
      },
    },
  },
});
