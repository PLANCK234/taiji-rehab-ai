import { useState } from "react";
import type { ManualPoseAnnotation } from "./pose-analysis";

type Props = {
  candidateTimes: number[];
  annotations: ManualPoseAnnotation[];
  onExport: (csv: string) => void;
};

const seconds = (ms: number) => (ms / 1000).toFixed(2);

function differenceLabel(deltaMs: number) {
  const magnitude = seconds(Math.abs(deltaMs));
  if (magnitude === "0.00") return "同一时刻";
  return `程序${deltaMs < 0 ? "早" : "晚"} ${magnitude} 秒`;
}

export default function SitToStandComparison({ candidateTimes, annotations, onExport }: Props) {
  const [pairs, setPairs] = useState<Record<number, string>>({});
  const byId = new Map(annotations.map((annotation, index) => [
    annotation.id, { annotation, number: index + 1 },
  ]));
  const rows = candidateTimes.map((time, index) => ({
    time, number: index + 1, manual: byId.get(pairs[time]),
  }));
  const pairedIds = new Set(rows.flatMap(({ manual }) => manual ? [manual.annotation.id] : []));
  const unmatched = [...byId.values()].filter(({ annotation }) => !pairedIds.has(annotation.id));

  function exportComparison() {
    const header = "status,candidate_number,candidate_ms,manual_number,manual_ms,delta_ms";
    const candidateRows = rows.map(({ time, number, manual }) => manual
      ? `paired,${number},${time.toFixed(1)},${manual.number},${manual.annotation.timestampMs.toFixed(1)},${(time - manual.annotation.timestampMs).toFixed(1)}`
      : `candidate_unpaired,${number},${time.toFixed(1)},,,`);
    const manualRows = unmatched.map(({ annotation, number }) =>
      `manual_unpaired,,,${number},${annotation.timestampMs.toFixed(1)},`);
    onExport([header, ...candidateRows, ...manualRows].join("\n"));
  }

  return <div role="region" aria-labelledby="sit-to-stand-comparison-heading">
    <h4 id="sit-to-stand-comparison-heading">坐站候选与人工标注对照</h4>
    <p className="note">为候选选择对应的人工站直标注。时间差按程序时刻减去人工时刻计算。</p>
    {rows.length ? <div className="trend-table-wrap"><table className="trend-table">
      <thead><tr><th scope="col">程序候选</th><th scope="col">人工标注</th>
        <th scope="col">时间差</th></tr></thead>
      <tbody>{rows.map(({ time, number, manual }) => <tr key={time}>
        <th scope="row">候选 {number} · {seconds(time)} 秒</th>
        <td><select aria-label={`候选 ${number} 对应人工标注`} value={manual?.annotation.id ?? ""}
          onChange={(event) => {
            const id = event.currentTarget.value;
            setPairs((current) => {
              if (id && candidateTimes.some((other) => other !== time && current[other] === id)) {
                return current;
              }
              return { ...current, [time]: id };
            });
          }}>
          <option value="">未配对</option>
          {annotations.map((annotation, index) => <option key={annotation.id} value={annotation.id}
            disabled={pairedIds.has(annotation.id) && manual?.annotation.id !== annotation.id}>
            标注 {index + 1} · {seconds(annotation.timestampMs)} 秒 · {annotation.eventLabel}
          </option>)}
        </select></td>
        <td>{manual ? differenceLabel(time - manual.annotation.timestampMs) : "未配对"}</td>
      </tr>)}</tbody>
    </table></div> : <p>本次没有程序候选。</p>}
    {unmatched.length ? <>
      <h5>未配对的人工标注</h5>
      <ul aria-label="未配对的人工标注">{unmatched.map(({ annotation, number }) => <li key={annotation.id}>
        标注 {number} · {seconds(annotation.timestampMs)} 秒 · {annotation.eventLabel}
      </li>)}</ul>
    </> : null}
    <button type="button" disabled={!rows.length && !unmatched.length}
      onClick={exportComparison}>导出坐站对照 CSV</button>
  </div>;
}
