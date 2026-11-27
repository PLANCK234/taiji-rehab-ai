const ROLE_LABELS: Record<string, string> = {
  admin: "授权管理员",
  clinician: "医护人员",
  clinical_approver: "临床负责人",
  research_assistant: "研究助理",
  analyst: "科研分析员",
  patient: "患者",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
