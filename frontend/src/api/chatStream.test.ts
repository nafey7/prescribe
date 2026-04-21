import { describe, it, expect, vi } from "vitest";
import { consumeSseStream } from "./chatStream";
import type { MealPlanPayload } from "../types/mealPlan";

function sseResponse(body: string): Response {
  const enc = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(enc.encode(body));
        controller.close();
      },
    }),
    { status: 200, headers: { "Content-Type": "text/event-stream" } }
  );
}

describe("consumeSseStream", () => {
  it("invokes onDone with text defaults when done omits message_type and meal_plan", async () => {
    const onDone = vi.fn();
    const res = sseResponse(
      'event: done\ndata: {"chat_id":"c1","message_id":"m1"}\n\n'
    );
    await consumeSseStream(res, {
      onThinking: () => {},
      onToken: () => {},
      onDone,
      onError: () => {},
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith("c1", "m1", "text", null);
  });

  it("parses done with message_type meal_plan and meal_plan payload", async () => {
    const onDone = vi.fn();
    const mealPlan: MealPlanPayload = {
      num_days: 1,
      days: [
        {
          day_index: 1,
          meals: [{ name: "Salad", description: "Greens", items: ["lettuce"] }],
        },
      ],
      summary: "S",
      disclaimer: "D",
    };
    const payload = JSON.stringify({
      chat_id: "c2",
      message_id: "m2",
      message_type: "meal_plan",
      meal_plan: mealPlan,
    });
    const res = sseResponse(`event: done\ndata: ${payload}\n\n`);
    await consumeSseStream(res, {
      onThinking: () => {},
      onToken: () => {},
      onDone,
      onError: () => {},
    });
    expect(onDone).toHaveBeenCalledWith("c2", "m2", "meal_plan", mealPlan);
  });

  it("streams token then done in order", async () => {
    const onToken = vi.fn();
    const onDone = vi.fn();
    const res = sseResponse(
      'event: token\ndata: {"content":"Hello"}\n\nevent: done\ndata: {"chat_id":"x","message_id":"y"}\n\n'
    );
    await consumeSseStream(res, {
      onThinking: () => {},
      onToken,
      onDone,
      onError: () => {},
    });
    expect(onToken).toHaveBeenCalledWith("Hello");
    expect(onDone).toHaveBeenCalledWith("x", "y", "text", null);
  });

  it("dispatches thinking with optional phase", async () => {
    const onThinking = vi.fn();
    const res = sseResponse(
      'event: thinking\ndata: {"status":"Searching records","phase":"records"}\n\n'
    );
    await consumeSseStream(res, {
      onThinking,
      onToken: () => {},
      onDone: () => {},
      onError: () => {},
    });
    expect(onThinking).toHaveBeenCalledWith({
      status: "Searching records",
      phase: "records",
    });
  });
});
