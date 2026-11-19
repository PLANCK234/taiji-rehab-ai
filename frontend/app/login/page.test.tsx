// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import LoginPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

afterEach(() => cleanup());

describe("demo login account selection", () => {
  it("fills the selected email and clears any previous password", () => {
    render(<LoginPage />);
    const email = screen.getByLabelText("邮箱") as HTMLInputElement;
    const password = screen.getByLabelText("密码") as HTMLInputElement;

    fireEvent.click(screen.getByRole("button", { name: "工作人员演示账号" }));
    expect(email.value).toBe("demo-clinician-a@example.org");
    expect(document.activeElement).toBe(password);

    fireEvent.change(password, { target: { value: "local-demo-secret" } });
    fireEvent.click(screen.getByRole("button", { name: "显示密码" }));
    expect(password.type).toBe("text");
    expect(screen.getByRole("button", { name: "隐藏密码" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "患者演示账号" }));
    expect(email.value).toBe("demo-patient@example.org");
    expect(password.value).toBe("");
    expect(password.type).toBe("password");
    expect(screen.getByRole("button", { name: "显示密码" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText(/不是电脑开机密码/)).toBeTruthy();
  });
});
