import { describe, it, expect, vi } from "vitest";
import { consumeSseStream } from "./chatStream";
import type { DifferentialDiagnosisPayload } from "../types/differentialDiagnosis";
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
  it("invokes onDone with text defaults when done omits message_type and structured payloads", async () => {
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
    expect(onDone).toHaveBeenCalledWith("c1", "m1", "text", null, null, null);
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
    expect(onDone).toHaveBeenCalledWith(
      "c2",
      "m2",
      "meal_plan",
      mealPlan,
      null,
      null
    );
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
    expect(onDone).toHaveBeenCalledWith("x", "y", "text", null, null, null);
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

  it("recognises the 'differential' thinking phase", async () => {
    const onThinking = vi.fn();
    const res = sseResponse(
      'event: thinking\ndata: {"status":"Building differential...","phase":"differential"}\n\n'
    );
    await consumeSseStream(res, {
      onThinking,
      onToken: () => {},
      onDone: () => {},
      onError: () => {},
    });
    expect(onThinking).toHaveBeenCalledWith({
      status: "Building differential...",
      phase: "differential",
    });
  });

  it("dispatches differential_diagnosis event before done and includes payload in done", async () => {
    const onDifferentialDiagnosis = vi.fn();
    const onDone = vi.fn();
    const dd: DifferentialDiagnosisPayload = {
      summary: "Brief picture",
      diagnoses: [
        {
          rank: 1,
          condition: "ACS",
          probability: 45,
          tier: "high",
          rationale: "exertional chest pain",
          supporting_evidence: ["Type 2 diabetes"],
          contradicting_evidence: [],
          key_workup: ["ECG"],
        },
      ],
      red_flags: ["ACS"],
      recommended_workup: ["ECG"],
      reasoning_notes: "",
      disclaimer: "edu",
    };
    const ddEvent = `event: differential_diagnosis\ndata: ${JSON.stringify({ differential_diagnosis: dd })}\n\n`;
    const doneEvent = `event: done\ndata: ${JSON.stringify({
      chat_id: "c3",
      message_id: "m3",
      message_type: "differential_diagnosis",
      differential_diagnosis: dd,
    })}\n\n`;
    const res = sseResponse(ddEvent + doneEvent);
    await consumeSseStream(res, {
      onThinking: () => {},
      onToken: () => {},
      onDone,
      onError: () => {},
      onDifferentialDiagnosis,
    });
    expect(onDifferentialDiagnosis).toHaveBeenCalledTimes(1);
    expect(onDifferentialDiagnosis).toHaveBeenCalledWith(dd);
    expect(onDone).toHaveBeenCalledWith(
      "c3",
      "m3",
      "differential_diagnosis",
      null,
      null,
      dd
    );
  });
});
