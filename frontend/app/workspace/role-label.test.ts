import { describe, expect, it } from "vitest";
import { roleLabel } from "./role-label";

describe("roleLabel", () => {
  it("uses Chinese labels for every demo role", () => {
    expect(roleLabel("admin")).toBe("授权管理员");
    expect(roleLabel("clinician")).toBe("医护人员");
    expect(roleLabel("clinical_approver")).toBe("临床负责人");
    expect(roleLabel("research_assistant")).toBe("研究助理");
    expect(roleLabel("analyst")).toBe("科研分析员");
    expect(roleLabel("patient")).toBe("患者");
  });

  it("keeps an unknown server role visible for diagnosis", () => {
    expect(roleLabel("future_demo_role")).toBe("future_demo_role");
  });
});
