import { ensureFreshAccessToken } from "./authSession";
import { applyPrescribeHeaders, getApiBase } from "./client";

type StreamCallbacks = {
  onThinking: (status: string) => void;
  onToken: (token: string) => void;
  onDone: (chatId: string, messageId: string) => void;
  onError: (error: string) => void;
  onChatTitle?: (title: string) => void;
};

async function consumeSseStream(
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
            case "thinking":
              callbacks.onThinking(String(data.status ?? ""));
              break;
            case "token":
              callbacks.onToken(String(data.content ?? ""));
              break;
            case "done":
              callbacks.onDone(
                String(data.chat_id ?? ""),
                String(data.message_id ?? "")
              );
              break;
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
