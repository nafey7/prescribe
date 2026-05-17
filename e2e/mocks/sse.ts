// SSE body builder for mocking chat stream endpoints in E2E tests.
// Use with page.route() to intercept the stream endpoint and return canned events.

export type ThinkingEvent = {
  type: "thinking";
  status: string;
  phase?: string;
};

export type TokenEvent = {
  type: "token";
  content: string;
};

export type DifferentialDiagnosisEvent = {
  type: "differential_diagnosis";
  differential_diagnosis: object;
};

export type DoneEvent = {
  type: "done";
  chat_id?: string;
  message_id?: string;
  message_type?: string;
  meal_plan?: object | null;
  fitness_plan?: object | null;
  differential_diagnosis?: object | null;
};

export type TitleEvent = {
  type: "title";
  title: string;
};

export type ErrorEvent = {
  type: "error";
  detail: string;
};

export type ChatStreamEvent =
  | ThinkingEvent
  | TokenEvent
  | DifferentialDiagnosisEvent
  | DoneEvent
  | TitleEvent
  | ErrorEvent;

/**
 * Serialise an array of ChatStreamEvent values into a full SSE body string
 * matching the wire format the frontend expects from the backend.
 *
 * Wire format per event:
 *   event: <type>\ndata: <JSON payload>\n\n
 *
 * The `type` field is stripped from the JSON payload so it matches what the
 * backend actually sends (e.g. a token event sends `{"content":"..."}`, not
 * `{"type":"token","content":"..."}`).
 */
export function buildChatStream(events: ChatStreamEvent[]): string {
  return events
    .map((event) => {
      const { type, ...payload } = event;
      return `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
    })
    .join("");
}
