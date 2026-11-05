// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import DemoVideo from "./demo-video";

afterEach(cleanup);

describe("DemoVideo", () => {
  const action = { id: "II-01", name: "简化起势" };

  it("shows a clearly labelled placeholder while no reviewed video is supplied", () => {
    const { container } = render(<DemoVideo action={action} />);
    expect(screen.getByText("动作视频待添加")).toBeDefined();
    expect(container.querySelector("video")).toBeNull();
  });

  it("provides a native player when a local video source is supplied", () => {
    const { container } = render(<DemoVideo action={action} src="/demo-videos/II-01.mp4" />);
    const video = container.querySelector("video");
    expect(video?.controls).toBe(true);
    expect(video?.querySelector("source")?.getAttribute("src")).toBe("/demo-videos/II-01.mp4");
  });
});
