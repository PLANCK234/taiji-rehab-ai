# Open questions and decision register

**2026-11-26更新**：CKLL-20260904伦理批件已提供并查看，见[证据](evidence/CKLL-20260904.md)。用户明确授权临床分级、剂量/禁忌、AI自动方案与准确率模块开发；相应状态为DEVELOPMENT_AUTHORIZED。具体数值/协议附件/系统角色为配置输入，不再一概记为“伦理未批”。未列入此次范围的数据治理和部署事项继续分别跟踪。下表负责人角色为待绑定的软件责任角色，不凭空指定签核人员。

| ID | Blocking question | Proposed owner | Impact / fallback |
|---|---|---|---|
| Q-01 | 已记录CKLL-20260904及“同意实施”；批件包括摄像头AI辅助评估。完整协议和知情同意附件尚未随本次PDF提供 | PI / ethics | 研究伦理依据已记录，开发开放；具体数据接入按已实现功能和研究配置推进，不自动切换运行环境 |
| Q-02 | SPPB分项SOP、标准计分表的具体配置 | clinical measurement lead | 自动评分配置框架已授权开发；未配置数值不冒充已确定参数 |
| Q-03 | 太极适配模板、禁忌、剂量参数与可编辑范围 | clinical team | DEVELOPMENT_AUTHORIZED / CONFIG_PENDING_EXPERT_TUNING；直接做版本化配置、编辑和专家调参 |
| Q-04 | Safety stop/resumption and AE/SAE escalation deadlines? | hospital clinical policy | generic event intake; no claimed escalation SLA |
| Q-05 | Actual visit/cycle schedule and enrollment/cohort rules? | PI / statistician | configurable demo template |
| Q-06 | Objective primary endpoints and labels for A/B/C ML tasks? | statistician / PI | frozen descriptive reporting only |
| Q-07 | What real identifiable fields are necessary? Data controller and retention? | privacy officer | synthetic data/identity mapping off |
| Q-08 | On-prem or approved cloud, region, encryption, backup RPO/RTO? | hospital IT | local/staging only |
| Q-09 | 用户已授权规则、AI方案及评测开发；软件签署角色、策略生效范围和版本记录怎样落地？ | PI / governance | 开发不再笼统阻断；实现策略版本生效、自动模式、人工覆盖与回滚，具体账号/部署另配 |
| Q-10 | 批件载明手机/平板摄像头AI评估；原视频留存期限、存储和导出细则是什么？ | ethics / data controller | 采集/分析研究方向已载明，留存细则仍需配置；现有仅上传关键点的实现不因本轮文档自动改变 |
| Q-11 | RCT allocation and blinded analyst workflow needed in MVP? | PI / statistician | out of scope pending decision |
| Q-12 | Which observation quality/subjective response scales? | clinical team | categorical placeholders marked unvalidated |
| Q-13 | External LLM used for literature only? Approved provider and documents? | security / PI | offline manual literature extraction |
| Q-14 | AI评分相关的原表/SOP、任务/参考视频、维度锚点/权重和不可评估条件 | 临床评估负责人 / 项目负责人 | 已授权评分模块开发，CONFIG_PENDING_EXPERT_TUNING；可直接做schema/候选/调参，不由太极视频凭空补齐SPPB |
| Q-15 | AI阶段映射、动作模板、功能I–IV与康复阶段的区别、自动策略范围 | 康复专家 / 项目负责人 | 已授权AI分数驱动方案，直接做策略和参数编辑；具体语义/数值版本化，缺值保留待配 |

此前AI方向仅有提案时的“未提供伦理材料”记录已被本轮批件及用户授权更新。开发顺序见[待开发计划](product/CLINICAL_AI_DEVELOPMENT_BACKLOG.md)，本轮未执行临床规则或数据接入代码变更。表中历史重复编号Q-14/Q-15仍按问题描述区分，不能把AI评分问题和账号绑定/素材发布混作一项。
| Q-14 | 患者账号怎样与本人研究编号可靠绑定？谁创建/撤销账号，退出研究后访问如何处理？ | PI / 隐私负责人 / 医院 IT | 仅可用合成账号开发患者入口；不得开放真实患者登录 |
| Q-15 | 哪些计划字段和视频经谁审核后可发布给患者？如何撤回、替换版本并通知？ | 临床负责人 / PI | 患者端不得展示 `DEMO_ONLY` 草案为正式训练计划；视频继续待添加 |

**Decision/configuration record**: date; question and scope; user authorization or signed decision; authority; protocol/rule version; evidence file/hash; affected tests; effective date. Distinguish documented study approval, authorized development, configured parameters and measured outcomes.

`demo-rule-v1`仍是合成映射。临床规则/剂量/AI自动方案已授权另行开发，不从Demo改名产生；研究协议、参数、生效版本和部署范围分别登记。
