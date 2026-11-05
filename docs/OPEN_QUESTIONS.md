# Open questions and decision register

**Status**: UNRESOLVED means do not invent a production medical default. Owner roles below are proposed, not named/appointed people.

| ID | Blocking question | Proposed owner | Impact / fallback |
|---|---|---|---|
| Q-01 | Which ethics protocol is approved? Image/secondary AI consent? | PI / ethics | real patients/photos disabled |
| Q-02 | Which SPPB SOP and official item scoring? | clinical measurement lead | manual total only; no auto-scoring |
| Q-03 | Exact tai chi adaptation templates, contraindications, dose and review owner? | clinical team | recommendations draft-only |
| Q-04 | Safety stop/resumption and AE/SAE escalation deadlines? | hospital clinical policy | generic event intake; no claimed escalation SLA |
| Q-05 | Actual visit/cycle schedule and enrollment/cohort rules? | PI / statistician | configurable demo template |
| Q-06 | Objective primary endpoints and labels for A/B/C ML tasks? | statistician / PI | frozen descriptive reporting only |
| Q-07 | What real identifiable fields are necessary? Data controller and retention? | privacy officer | synthetic data/identity mapping off |
| Q-08 | On-prem or approved cloud, region, encryption, backup RPO/RTO? | hospital IT | local/staging only |
| Q-09 | Who can approve rule, snapshot, model and release? | PI / governance | no production publishing |
| Q-10 | Image collection retention and permission? | ethics / data controller | show local preview without persistence |
| Q-11 | RCT allocation and blinded analyst workflow needed in MVP? | PI / statistician | out of scope pending decision |
| Q-12 | Which observation quality/subjective response scales? | clinical team | categorical placeholders marked unvalidated |
| Q-13 | External LLM used for literature only? Approved provider and documents? | security / PI | offline manual literature extraction |
| Q-14 | 患者账号怎样与本人研究编号可靠绑定？谁创建/撤销账号，退出研究后访问如何处理？ | PI / 隐私负责人 / 医院 IT | 仅可用合成账号开发患者入口；不得开放真实患者登录 |
| Q-15 | 哪些计划字段和视频经谁审核后可发布给患者？如何撤回、替换版本并通知？ | 临床负责人 / PI | 患者端不得展示 `DEMO_ONLY` 草案为正式训练计划；视频继续待添加 |

**Decision closure template**: date; question ID; signed decision; authority; scope; rule/protocol version; evidence URL/file; impacted tests; effective date. No closed state without evidence.

DEMO-V2 的 `demo-rule-v1` 与动作文字是明确标记的合成展示映射，不是 Q-03 适配模板或 Q-09 临床发布批准；两项继续未解决。真实数据、处方、剂量和生产接入仍不得据此开放。
