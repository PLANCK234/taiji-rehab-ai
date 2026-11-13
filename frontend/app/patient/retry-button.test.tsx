// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import RetryPatientHomeButton from "./retry-button";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigation.refresh }),
}));

afterEach(() => {
  cleanup();
  navigation.refresh.mockClear();
});

describe("RetryPatientHomeButton", () => {
  it("refreshes the server-rendered patient state", () => {
    render(<RetryPatientHomeButton label="重新检查绑定" />);
    fireEvent.click(screen.getByRole("button", { name: "重新检查绑定" }));
    expect(navigation.refresh).toHaveBeenCalledOnce();
  });
});
