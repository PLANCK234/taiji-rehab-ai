import Link from "next/link";
import {
  measurementText,
  type AssessmentTrend,
  type AssessmentTrendEntry,
} from "../../workspace/assessments";

const shanghaiDateTime = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit",
});

function confirmedValue(row: AssessmentTrendEntry) {
  const confirmed = row.latest_confirmed;
  if (!confirmed) return "尚无已确认版本";
  return measurementText(confirmed);
}

function recordedTime(value: string) {
  return shanghaiDateTime.format(new Date(value));
}

export default function AssessmentTrendSection({ trend }: { trend: AssessmentTrend | null }) {
  const entries = trend?.entries ?? [];
  const validCount = entries.filter((row) => row.latest_confirmed?.validity === "valid").length;
  const missingCount = entries.filter((row) => row.latest_confirmed?.validity === "missing").length;
  const invalidCount = entries.filter((row) => row.latest_confirmed?.validity === "invalid").length;
  const pendingCount = entries.filter((row) => row.current.state === "draft").length;

  return (
    <section aria-labelledby="assessment-trend-heading">
      <h2 id="assessment-trend-heading">人工总分记录趋势</h2>
      <p className="note">仅供合成数据研究核对，按登记顺序展示。条形仅表示已确认、有效的人工 SPPB 总分（0–12 分）；缺失、无效和草稿不作为零分，也不代表疗效判断。</p>
      {trend === null ? <p role="status">趋势记录暂不可用；请稍后重试。</p> : entries.length === 0 ? (
        <p>暂无评估记录。</p>
      ) : <>
        <p>已确认有效 {validCount} 条 · 缺失 {missingCount} 条 · 无效 {invalidCount} 条 · 当前待确认 {pendingCount} 条</p>
        <div className="trend-table-wrap">
          <table className="trend-table">
            <caption>编号对象的人工 SPPB 总分基线与复评序列</caption>
            <thead><tr><th scope="col">登记顺序</th><th scope="col">登记时间</th><th scope="col">访视类型</th><th scope="col">最近确认</th><th scope="col">当前草稿</th><th scope="col">总分图示</th></tr></thead>
            <tbody>{entries.map((row, index) => {
              const confirmed = row.latest_confirmed;
              const validValue = confirmed?.validity === "valid" ? confirmed.raw_value : null;
              return <tr key={row.assessment_id}>
                <td>{index + 1}</td>
                <td><time dateTime={row.created_at}>{recordedTime(row.created_at)}</time></td>
                <td><Link href={`/assessments/${row.assessment_id}`}>{row.visit_kind === "baseline" ? "基线" : "复评"}</Link></td>
                <td>{confirmedValue(row)}</td>
                <td>{row.current.state === "draft" ? `待确认：${measurementText(row.current)}` : "无"}</td>
                <td>{validValue !== null && validValue !== undefined ? <>
                  <meter min={0} max={12} value={validValue} aria-label={`第 ${index + 1} 条已确认总分 ${validValue} 分`} />
                  <span> {validValue} 分</span>
                </> : "—"}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </>}
    </section>
  );
}
