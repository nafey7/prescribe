import { ensureFreshAccessToken } from "./authSession";
import { applyPrescribeHeaders, getApiBase } from "./client";
import type { DifferentialDiagnosisPayload } from "../types/differentialDiagnosis";
import type { FitnessPlanPayload } from "../types/fitnessPlan";
import type { MealPlanPayload } from "../types/mealPlan";
import type { CitationSource, ThinkingPhase } from "../types/chat";

export type ThinkingUpdate = {
  status: string;
  phase?: ThinkingPhase;
};

type StreamCallbacks = {
  onThinking: (update: ThinkingUpdate) => void;
  onToken: (token: string) => void;
  onDone: (
    chatId: string,
    messageId: string,
    messageType: string,
    mealPlan: MealPlanPayload | null,
    fitnessPlan: FitnessPlanPayload | null,
    differentialDiagnosis: DifferentialDiagnosisPayload | null,
    citations: CitationSource[]
  ) => void;
  onError: (error: string) => void;
  onChatTitle?: (title: string) => void;
  /**
   * Optional: fires when the backend emits a `differential_diagnosis` event before `done`.
   * The same payload is also delivered through `onDone`, so consumers that only need
   * end-of-stream state can ignore this callback.
   */
  onDifferentialDiagnosis?: (payload: DifferentialDiagnosisPayload) => void;
};

/** Exported for Vitest; used by `sendMessageStream` / `sendDoctorChatMessageStream`. */
export async function consumeSseStream(
  res: Response,
  callbacks: StreamCallbacks
): Promise<void> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line === "") {
        currentEvent = "";
      } else if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ") && currentEvent) {
        try {
          const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
          switch (currentEvent) {
            case "thinking": {
              const rawPhase = data.phase;
              const phase: ThinkingPhase | undefined =
                rawPhase === "web_search" ||
                rawPhase === "records" ||
                rawPhase === "tool" ||
                rawPhase === "thinking" ||
                rawPhase === "meal_plan" ||
                rawPhase === "fitness_plan" ||
                rawPhase === "differential"
                  ? rawPhase
                  : undefined;
              callbacks.onThinking({
                status: String(data.status ?? ""),
                ...(phase !== undefined ? { phase } : {}),
              });
              break;
            }
            case "token":
              callbacks.onToken(String(data.content ?? ""));
              break;
            case "differential_diagnosis": {
              const payload = data.differential_diagnosis;
              if (payload && typeof payload === "object") {
                callbacks.onDifferentialDiagnosis?.(
                  payload as DifferentialDiagnosisPayload
                );
              }
              break;
            }
            case "done": {
              const mealPlan =
                data.meal_plan != null
                  ? (data.meal_plan as MealPlanPayload)
                  : null;
              const fitnessPlan =
                data.fitness_plan != null
                  ? (data.fitness_plan as FitnessPlanPayload)
                  : null;
              const differentialDiagnosis =
                data.differential_diagnosis != null
                  ? (data.differential_diagnosis as DifferentialDiagnosisPayload)
                  : null;
              const citations = Array.isArray(data.citations)
                ? (data.citations as CitationSource[])
                : [];
              callbacks.onDone(
                String(data.chat_id ?? ""),
                String(data.message_id ?? ""),
                String(data.message_type ?? "text"),
                mealPlan,
                fitnessPlan,
                differentialDiagnosis,
                citations
              );
              break;
            }
            case "title":
              callbacks.onChatTitle?.(String(data.title ?? ""));
              break;
            case "error":
              callbacks.onError(String(data.detail ?? "Error"));
              break;
          }
        } catch {
          // skip malformed JSON lines
        }
        currentEvent = "";
      }
    }
  }
}

export async function sendMessageStream(
  message: string,
  chatId: string | undefined,
  callbacks: StreamCallbacks
): Promise<void> {
  const body = JSON.stringify({
    message,
    chat_id: chatId,
  });
  const send = () => {
    const headers = new Headers();
    applyPrescribeHeaders(headers, { body });
    return fetch(`${getApiBase()}/chat/message/stream`, {
      method: "POST",
      headers,
      body,
    });
  };

  let res = await send();
  if (res.status === 401) {
    const ok = await ensureFreshAccessToken();
    if (ok) res = await send();
  }

  if (!res.ok) {
    const bodyJson = (await res.json().catch(() => ({}))) as {
      detail?: string;
    };
    callbacks.onError(bodyJson.detail || `Request failed (${res.status})`);
    return;
  }

  await consumeSseStream(res, callbacks);
}

export async function sendDoctorChatMessageStream(
  doctorId: string,
  patientId: string,
  message: string,
  chatId: string | undefined,
  callbacks: StreamCallbacks
): Promise<void> {
  const path = `/doctors/${encodeURIComponent(doctorId)}/patients/${encodeURIComponent(patientId)}/chat/message/stream`;
  const body = JSON.stringify({
    message,
    chat_id: chatId ?? null,
  });
  const sendDoc = () => {
    const headers = new Headers();
    applyPrescribeHeaders(headers, { body, skipPatientHeader: true });
    return fetch(`${getApiBase()}${path}`, {
      method: "POST",
      headers,
      body,
    });
  };

  let res = await sendDoc();
  if (res.status === 401) {
    const ok = await ensureFreshAccessToken();
    if (ok) res = await sendDoc();
  }

  if (!res.ok) {
    const bodyJson = (await res.json().catch(() => ({}))) as {
      detail?: string;
    };
    callbacks.onError(bodyJson.detail || `Request failed (${res.status})`);
    return;
  }

  await consumeSseStream(res, callbacks);
}
