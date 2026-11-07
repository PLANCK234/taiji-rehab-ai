import Link from "next/link";
import type { TrainingTimeline } from "../../workspace/training";

const completionText = {
  completed: "记录为完成", partial: "记录为部分完成",
  interrupted: "记录为中断", not_started: "记录为未开始",
};

export default function TrainingTimelineSection({ timeline }: { timeline: TrainingTimeline | null }) {
  return <section aria-labelledby="training-timeline-heading">
    <h2 id="training-timeline-heading">训练观察序列</h2>
    <p className="note">仅列出已记录的合成观察；未记录的训练或反馈仍是未知。没有计划次数，不能计算完成率，也不表示疗效或安全。</p>
    {timeline === null ? <p role="status">训练观察序列暂不可用；请稍后重试。</p>
      : timeline.entries.length === 0 ? <p>暂无训练观察记录。</p> :
        <div className="trend-table-wrap"><table className="trend-table">
          <caption>编号对象的已记录训练观察</caption>
          <thead><tr><th scope="col">发生时间</th><th scope="col">完成状态</th><th scope="col">实际时长</th><th scope="col">最新反馈</th><th scope="col">RPE</th></tr></thead>
          <tbody>{timeline.entries.map((row) => <tr key={row.session_id}>
            <td><Link href={`/participants/${timeline.participant_id}/training/${row.session_id}`}>
              <time dateTime={row.session_at}>{new Date(row.session_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</time>
            </Link></td>
            <td>{completionText[row.completion_status]}</td>
            <td>{row.actual_minutes === null ? "未记录" : `${row.actual_minutes} 分钟`}</td>
            <td>{row.feedback_state === null ? "未填写" : row.feedback_state === "missing" ? "已记缺失" : "已记录"}</td>
            <td>{row.rpe === null ? "未记录" : row.rpe}</td>
          </tr>)}</tbody>
        </table></div>}
  </section>;
}
