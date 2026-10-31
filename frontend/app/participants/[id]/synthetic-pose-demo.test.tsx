import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import SyntheticPoseDemo from "./synthetic-pose-demo";

describe("synthetic pose demo", () => {
  it("labels the unprocessed synthetic preview and exposes no photo collection control", () => {
    const html = renderToStaticMarkup(<SyntheticPoseDemo />);
    expect(html).toContain("姿态识别算法尚未接入");
    expect(html).toContain("查看合成预览");
    expect(html).toContain("不调用摄像头，不选择或上传照片，也不保存图像");
    expect(html).not.toContain('type="file"');
    expect(html).not.toContain('capture=');
  });
});
