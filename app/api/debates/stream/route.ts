import { debateSetupSchema } from "@/lib/schema";
import { encodeSseEvent } from "@/lib/sse";
import { runDebate } from "@/lib/debate-engine";
import type { StreamEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const setup = debateSetupSchema.parse(body);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = async (event: StreamEvent) => {
          controller.enqueue(encoder.encode(encodeSseEvent(event.type, event)));
        };

        try {
          await runDebate({
            setup,
            persist: true,
            onEvent: send
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Debate failed.";
          controller.enqueue(encoder.encode(encodeSseEvent("error", { type: "error", message })));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Invalid request."
      },
      { status: 400 }
    );
  }
}
