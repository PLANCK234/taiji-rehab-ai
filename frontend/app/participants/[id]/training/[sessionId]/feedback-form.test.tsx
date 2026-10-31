// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import FeedbackForm from "./feedback-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(() => cleanup());

describe("training feedback form", () => {
  it("separates recorded observations from missing feedback", () => {
    render(<FeedbackForm sessionId="session" expectedRevision={0} />);
    expect(screen.getByLabelText("RPE（6–20，可留空）")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("反馈状态"), { target: { value: "missing" } });
    expect(screen.queryByLabelText("RPE（6–20，可留空）")).toBeNull();
    expect(screen.getByLabelText("缺失原因")).toBeTruthy();
  });

  it("requires an attributable reason for a correction", () => {
    render(<FeedbackForm sessionId="session" expectedRevision={2} />);
    const reason = screen.getByLabelText("更正原因") as HTMLTextAreaElement;
    expect(reason.required).toBe(true);
  });
});
