import type { Metadata } from "next";
import TaijiMark from "../../components/taiji-mark";
import { getApiHealth } from "../../lib/health";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "登录" };

export default async function LoginPage() {
  const health = await getApiHealth();
  return <div className="auth-page">
    <aside className="auth-art">
      <div className="row" style={{ gap: 12 }}>
        <TaijiMark size={40} dark="#f1ece1" light="#1a5246" />
        <span style={{ fontFamily: "var(--font-serif)", fontWeight: 700, letterSpacing: ".06em" }}>太极康复研究平台</span>
      </div>
      <div>
        <h1>以太极为方，<br />让康复评估有据可循</h1>
        <p>面向医疗研究人员的工作台：编码建档、人工评估、版本化 Demo 分级、太极动作训练与 AI 姿态证据，全部持久化保存、可追溯。</p>
        <ul className="auth-points">
          <li><span className="dot">1</span><span><b>评估 → 分级 → 方案</b>录入 SPPB 总分，自动生成可解释的 Demo 分级与动作组合</span></li>
          <li><span className="dot">2</span><span><b>AI 视频动作分析</b>浏览器本地识别 33 个关键点，原视频不上传</span></li>
          <li><span className="dot">3</span><span><b>人工复核留痕</b>每次修改追加版本，AI 原值与人工结论分开保存</span></li>
        </ul>
      </div>
      <TaijiMark className="big-mark" size={460} dark="#ffffff" light="#0f2f28" />
    </aside>
    <div className="auth-form-wrap">
      <LoginForm apiHealthy={health === "正常"} />
    </div>
  </div>;
}
