import { useState } from "react";

const unavailableReasons = {
  start_unverifiable: "起立口令无法核实",
  finish_unverifiable: "第五次站直无法核实",
  obscured_or_incomplete: "画面遮挡或片段不完整",
  other: "其他原因",
};
type Reason = keyof typeof unavailableReasons;
const seconds = (ms: number) => (ms / 1000).toFixed(2);

export default function SitToStandTiming({
  candidateTimes, disabled, captureTime, seekTime, onExport,
}: {
  candidateTimes: number[];
  disabled: boolean;
  captureTime: () => number | null;
  seekTime: (ms: number) => void;
  onExport: (csv: string) => void;
}) {
  const [start, setStart] = useState<number | null>(null);
  const [finish, setFinish] = useState<number | null>(null);
  const [candidate, setCandidate] = useState<number | null>(null);
  const [reason, setReason] = useState<Reason | "">("");
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const ordered = start !== null && finish !== null && finish > start;
  const manualDuration = ordered && !reason ? finish - start : null;
  const candidateFinish = candidate !== null && candidateTimes.includes(candidate) ? candidate : null;
  const candidateDuration = manualDuration !== null && start !== null && candidateFinish !== null
    && candidateFinish > start ? candidateFinish - start : null;
  const difference = candidateDuration !== null && manualDuration !== null ? candidateDuration - manualDuration : null;
  const csv = [
    "status,unavailable_reason,manual_start_ms,manual_fifth_stand_ms,manual_duration_ms,program_candidate_ms,assisted_duration_ms,assisted_minus_manual_ms",
    [manualDuration === null ? "unavailable" : "reviewed", reason, start, finish, manualDuration,
      candidateFinish, candidateDuration, difference].join(","),
  ].join("\n");
  const currentConfirmed = confirmed === csv;

  function update(apply: () => void) {
    setConfirmed(null);
    apply();
  }

  return <section aria-labelledby="sit-to-stand-timing-heading">
    <h3 id="sit-to-stand-timing-heading">五次坐站计时复核</h3>
    <p className="note">在原视频中定位可核实的起立口令和第五次站直。可先勾选「仅看原视频」完成独立标记。计时结果用于技术核对。</p>
    <fieldset disabled={disabled}>
      <div className="button-row">
        <button type="button" onClick={() => update(() => setStart(captureTime()))}>标记计时起点</button>
        <button type="button" onClick={() => update(() => setFinish(captureTime()))}>标记第五次站直</button>
        <button type="button" className="text-button" onClick={() => update(() => {
          setStart(null); setFinish(null); setCandidate(null); setReason("");
        })}>清空计时标记</button>
      </div>
      <dl className="pose-summary-grid">
        <div><dt>人工起点</dt><dd>{start === null ? "未标记" :
          <button type="button" className="text-button" onClick={() => seekTime(start)}>{seconds(start)} 秒</button>}</dd></div>
        <div><dt>人工第五次站直</dt><dd>{finish === null ? "未标记" :
          <button type="button" className="text-button" onClick={() => seekTime(finish)}>{seconds(finish)} 秒</button>}</dd></div>
        <div><dt>人工用时</dt><dd>{manualDuration === null ? "未知" : `${seconds(manualDuration)} 秒`}</dd></div>
        <div><dt>辅助用时</dt><dd>{candidateDuration === null ? "未知" : `${seconds(candidateDuration)} 秒`}</dd></div>
        <div><dt>辅助与人工用时差</dt><dd>{difference === null ? "未知" : `${difference > 0 ? "+" : ""}${seconds(difference)} 秒`}</dd></div>
      </dl>
      {candidateTimes.length > 0 && <>
        <label>用于对照的程序候选<select value={candidateFinish ?? ""} onChange={(event) => {
          const value = event.currentTarget.value;
          update(() => setCandidate(value === "" ? null : Number(value)));
        }}>
          <option value="">不选候选</option>
          {candidateTimes.map((time, index) => <option key={time} value={time} disabled={start !== null && time <= start}>
            候选 {index + 1} · {seconds(time)} 秒
          </option>)}
        </select></label>
        <p className="note">辅助用时使用同一个人工起点，终点使用你选中的程序候选。</p>
      </>}
      <label>无法判定的原因<select value={reason} onChange={(event) => {
        const value = event.currentTarget.value as Reason | "";
        update(() => setReason(value));
      }}>
        <option value="">未选择</option>
        {Object.entries(unavailableReasons).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
      </select></label>
      {!ordered && !reason && <p className="note">{start === null || finish === null
        ? "请标记两个时刻，或选择无法判定的原因。"
        : "第五次站直时刻必须晚于计时起点。"}</p>}
      <div className="button-row">
        <button type="button" disabled={(!ordered && !reason) || currentConfirmed}
          onClick={() => setConfirmed(csv)}>确认本次计时记录</button>
        <button type="button" disabled={!currentConfirmed} onClick={() => onExport(csv)}>导出计时复核 CSV</button>
      </div>
      {currentConfirmed && <p>已确认，可导出本次计时记录。</p>}
    </fieldset>
  </section>;
}
