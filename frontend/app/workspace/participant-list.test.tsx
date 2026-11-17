// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ParticipantList from "./participant-list";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const originalStorage = Object.getOwnPropertyDescriptor(window, "localStorage");

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
});

afterEach(() => {
  cleanup();
  if (originalStorage) Object.defineProperty(window, "localStorage", originalStorage);
  else Reflect.deleteProperty(window, "localStorage");
});

it("distinguishes duplicate codes by study and keeps the hidden preference per account", () => {
  const studies = [{ id: "a", code: "SYN-STUDY-A" }, { id: "b", code: "SYN-STUDY-B" }];
  const participants = studies.map(({ id }) => ({ id, study_id: id, study_code: "SYN-001" }));
  const props = { participants, studies, plans: {} };
  const view = render(<ParticipantList accountId="first" {...props} />);
  const rowA = screen.getByText("SYN-STUDY-A").closest("li")!;
  expect(within(rowA).getByRole("link", { name: "SYN-001" }).getAttribute("href")).toBe("/participants/a");
  fireEvent.click(within(rowA).getByRole("button", { name: "隐藏" }));
  expect(screen.queryByText("SYN-STUDY-A")).toBeNull();
  expect(screen.getByText("SYN-STUDY-B")).toBeTruthy();
  view.rerender(<ParticipantList accountId="second" {...props} />);
  expect(screen.getByText("SYN-STUDY-A")).toBeTruthy();
  view.rerender(<ParticipantList accountId="first" {...props} />);
  expect(screen.queryByText("SYN-STUDY-A")).toBeNull();
});
