import { getApiHealth } from "./health";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const apiHealth = await getApiHealth();
  return (
    <main>
      <div className="eyebrow">工程状态 · Sprint 0</div>
      <h1>太极康复科研平台</h1>
      <p>研究人员使用的工程健康检查页。当前仅允许合成测试数据。</p>
      <section aria-labelledby="status-heading">
        <h2 id="status-heading">服务状态</h2>
        <dl>
          <div><dt>前端</dt><dd>正常</dd></div>
          <div><dt>API 进程</dt><dd>{apiHealth}</dd></div>
        </dl>
        <p className="note">此页面不提供临床评估、诊断或训练建议。</p>
      </section>
      <p><Link href="/login">研究人员登录</Link></p>
    </main>
  );
}
