import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithTheme, screen } from "../test-utils/renderWithProviders";
import type { Message } from "../types/chat";
import MessageList from "./MessageList";

function thinkingMessage(
  phase: Message["thinkingPhase"],
  status: string
): Message {
  return {
    role: "assistant",
    content: "",
    timestamp: new Date().toISOString(),
    isThinking: true,
    thinkingStatus: status,
    thinkingPhase: phase,
  };
}

describe("MessageList thinking indicator", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(cleanup);

  it.each([
    ["records", "Searching patient records..."],
    ["lab_results", "Fetching lab results..."],
    ["documents", "Searching patient documents..."],
    ["web_search", "Searching the web..."],
  ] as const)("shows the %s tool phase label", (phase, label) => {
    renderWithTheme(
      <MessageList
        messages={[thinkingMessage(phase, label)]}
        isLoading
      />
    );

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("keeps the tool label while showing analyze status as detail", () => {
    renderWithTheme(
      <MessageList
        messages={[thinkingMessage("lab_results", "Analyzing lab results...")]}
        isLoading
      />
    );

    expect(screen.getByText("Fetching lab results...")).toBeInTheDocument();
    expect(screen.getByText("Analyzing lab results...")).toBeInTheDocument();
  });
});
