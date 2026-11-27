// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import SitToStandTiming from "./sit-to-stand-timing";

afterEach(cleanup);

it("reviews ordered manual endpoints and compares an explicitly selected candidate", () => {
  const captureTime = vi.fn().mockReturnValueOnce(2000).mockReturnValueOnce(1000).mockReturnValueOnce(12000);
  const onExport = vi.fn();
  const seekTime = vi.fn();
  render(<SitToStandTiming candidateTimes={[1500, 11500]} disabled={false}
    captureTime={captureTime} seekTime={seekTime} onExport={onExport} />);
  const confirm = screen.getByRole("button", { name: "确认本次计时记录" }) as HTMLButtonElement;
  const download = screen.getByRole("button", { name: "导出计时复核 CSV" }) as HTMLButtonElement;
  fireEvent.click(screen.getByRole("button", { name: "标记计时起点" }));
  fireEvent.click(screen.getByRole("button", { name: "标记第五次站直" }));
  expect(confirm.disabled).toBe(true);
  expect(screen.getByText("第五次站直时刻必须晚于计时起点。")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "标记第五次站直" }));
  fireEvent.click(screen.getByRole("button", { name: "12.00 秒" }));
  expect(seekTime).toHaveBeenCalledWith(12000);
  expect(screen.getByText("10.00 秒")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("用于对照的程序候选"), { target: { value: "11500" } });
  expect(screen.getByText("9.50 秒")).toBeTruthy();
  expect(screen.getByText("-0.50 秒")).toBeTruthy();
  expect(download.disabled).toBe(true);
  fireEvent.click(confirm);
  fireEvent.click(download);
  expect(onExport.mock.calls[0][0]).toContain("\nreviewed,,2000,12000,10000,11500,9500,-500");
  fireEvent.change(screen.getByLabelText("无法判定的原因"), { target: { value: "start_unverifiable" } });
  expect(download.disabled).toBe(true);
  fireEvent.click(confirm);
  fireEvent.click(download);
  expect(onExport.mock.calls[1][0]).toContain("\nunavailable,start_unverifiable,2000,12000,,11500,,");
});
