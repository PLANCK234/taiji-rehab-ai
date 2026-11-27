import Link from "next/link";
import { Card, Empty, Notice } from "../../../components/ui";
import { measurementText, type AssessmentTrend, type AssessmentTrendEntry } from "../../../lib/assessments";
import { formatDateTime } from "../../../lib/format";

function confirmedValue(row: AssessmentTrendEntry) {
  return row.latest_confirmed ? measurementText(row.latest_confirmed) : "尚无已确认版本";
}

export default function AssessmentTrendSection({ trend }: { trend: AssessmentTrend | null }) {
  const entries = trend?.entries ?? [];
  const count = (validity: string) => entries.filter(row => row.latest_confirmed?.validity === validity).length;
  const pendingCount = entries.filter(row => row.current.state === "draft").length;

  return <Card title="人工总分记录趋势" id="assessment-trend-heading"
    sub="条形只表示已确认、有效的人工 SPPB 总分（0–12）；缺失、无效与草稿不会被画成 0 分。">
    {trend === null ? <Notice tone="warn"><span role="status">趋势记录暂不可用；请稍后重试。</span></Notice> : entries.length === 0 ? (
      <Empty title="暂无评估记录" />
    ) : <>
      <p className="note">已确认有效 {count("valid")} 条 · 缺失 {count("missing")} 条 · 无效 {count("invalid")} 条 · 当前待确认 {pendingCount} 条</p>
      <div className="trend-table-wrap">
        <table className="trend-table">
          <caption>编号对象的人工 SPPB 总分基线与复评序列</caption>
          <thead><tr><th scope="col">序号</th><th scope="col">登记时间</th><th scope="col">类型</th><th scope="col">最近确认</th><th scope="col">当前草稿</th><th scope="col">总分图示</th></tr></thead>
          <tbody>{entries.map((row, index) => {
            const confirmed = row.latest_confirmed;
            const validValue = confirmed?.validity === "valid" ? confirmed.raw_value : null;
            return <tr key={row.assessment_id}>
              <td>{index + 1}</td>
              <td><time dateTime={row.created_at}>{formatDateTime(row.created_at)}</time></td>
              <td><Link href={`/assessments/${row.assessment_id}`}>{row.visit_kind === "baseline" ? "基线" : "复评"}</Link></td>
              <td>{confirmedValue(row)}</td>
              <td>{row.current.state === "draft" ? `待确认：${measurementText(row.current)}` : "无"}</td>
              <td>{validValue !== null && validValue !== undefined ? <span className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                <meter min={0} max={12} value={validValue} aria-label={`第 ${index + 1} 条已确认总分 ${validValue} 分`} />
                <span>{validValue} 分</span>
              </span> : "—"}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </>}
  </Card>;
}
