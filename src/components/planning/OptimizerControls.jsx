import Button from "../ui/Button.jsx";
import { departmentLabel } from "../../utils/planningLabels.js";

function formatHorizonText(horizon) {
  if (!horizon?.start_time) return "Loading...";
  const [datePart, timePart] = horizon.start_time.split("T");
  const endTimePart = horizon.end_time?.split("T")[1]?.slice(0, 5) ?? "";
  const startTime = timePart ? timePart.slice(0, 5) : "";
  const [year, month, day] = (datePart ?? "").split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthName = months[parseInt(month, 10) - 1] || month;
  return `${day} ${monthName} ${year} · ${startTime}–${endTimePart}`;
}

function proofLabel(proofState) {
  if (proofState === "FULLY_OPTIMAL") return "Optimal plan proven";
  if (proofState === "FEASIBLE_BOUNDED") return "Valid bounded plan";
  return proofState ? proofState.replaceAll("_", " ").toLowerCase() : "Plan generated";
}

export default function OptimizerControls({
  optimizationStatus,
  optimizationError,
  plan,
  horizon,
  onOptimize,
  canOptimize,
  tasks,
  suburbanCurfew = false,
  onToggleSuburbanCurfew,
}) {
  const taskById = new Map(tasks.map((task) => [task.task_id, task]));
  const busy = optimizationStatus === "loading";
  const statusText = busy
    ? "Optimizing plan..."
    : optimizationStatus === "success"
      ? proofLabel(plan?.proof_state)
      : optimizationStatus === "error"
        ? "Optimization failed"
        : "Ready";
  const validSavings =
    plan?.comparison?.same_task_set &&
    plan.comparison.closure_saved_minutes != null &&
    plan.comparison.closure_reduction_percent != null;

  return (
    <section className="optimizer-controls" aria-labelledby="optimizer-heading">
      <div className="workspace-column-heading">
        <div>
          <span className="planner-kicker">Plan action</span>
          <h2 id="optimizer-heading">Plan Controls</h2>
        </div>
      </div>

      <div className="planner-field-readonly">
        <span>Planning horizon</span>
        <strong>{formatHorizonText(horizon)}</strong>
      </div>

      {/* Suburban Peak Curfew Policy Toggle */}
      <div
        className="planner-curfew-control"
        style={{
          margin: "12px 0",
          padding: "12px 14px",
          background: "var(--paper)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          <input
            type="checkbox"
            checked={suburbanCurfew}
            onChange={(e) => onToggleSuburbanCurfew?.(e.target.checked)}
            disabled={busy}
            style={{ marginTop: "3px", cursor: "pointer" }}
          />
          <div>
            <strong style={{ display: "block", color: "var(--navy)", fontSize: "12px" }}>
              Suburban Peak Hour Curfew
            </strong>
            <span style={{ fontSize: "11px", color: "var(--muted)", lineHeight: 1.4, display: "block", marginTop: "2px" }}>
              Strictly ban possessions during rush hours (08:00–10:30 &amp; 17:00–19:30) to safeguard commuter operations.
            </span>
          </div>
        </label>
        {suburbanCurfew && (
          <div
            style={{
              marginTop: "8px",
              padding: "4px 8px",
              background: "rgba(180, 83, 9, 0.1)",
              color: "var(--block)",
              fontSize: "10px",
              fontWeight: 700,
              borderRadius: "2px",
              fontFamily: "var(--font-mono)",
            }}
          >
            ACTIVE CP-SAT CURFEW ENFORCEMENT
          </div>
        )}
      </div>

      <Button
        className="planner-optimize-button"
        onClick={onOptimize}
        disabled={!canOptimize}
        ariaBusy={busy}
      >
        {busy ? "Restart Optimization" : "Optimize Plan"}
      </Button>

      <div
        className={`optimizer-status status-${optimizationStatus}`}
        role="status"
        aria-live="polite"
      >
        <span className="optimizer-status-dot" aria-hidden="true" />
        <div>
          <small>Status</small>
          <strong>{statusText}</strong>
        </div>
      </div>

      {optimizationError ? (
        <div className="optimizer-error" role="alert">
          <strong>{optimizationError.code ?? "REQUEST_FAILED"}</strong>
          <span>{optimizationError.message}</span>
        </div>
      ) : null}

      {plan ? (
        <div className="optimizer-result-summary">
          <p className="optimizer-policy-note"><strong>Policy</strong><span>Service and infrastructure availability</span></p>
          <dl>
            <div><dt>Possessions</dt><dd>{plan.blocks.length}</dd></div>
            <div><dt>Integrated</dt><dd>{plan.metrics.integrated_blocks}</dd></div>
            <div><dt>Scheduled tasks</dt><dd>{new Set(plan.blocks.flatMap((block) => block.tasks)).size}</dd></div>
          </dl>
          <p>
            <strong>Non-integrated CP-SAT comparison</strong>
            {validSavings
              ? `${plan.comparison.closure_saved_minutes} min (${plan.comparison.closure_reduction_percent.toFixed(1)}%) less possession time.`
              : "No same-work savings claim is available."}
          </p>
          <div className="optimizer-unscheduled">
            <strong>Unscheduled maintenance</strong>
            {plan.unscheduled_tasks.length > 0 ? (
              <ul>{plan.unscheduled_tasks.map((id) => (
                <li key={id}>
                  <strong>{taskById.get(id)?.task_type ?? "Maintenance task"}</strong>
                  <span>{departmentLabel(taskById.get(id)?.department)} · {id}</span>
                </li>
              ))}</ul>
            ) : (
              <span>None</span>
            )}
          </div>
        </div>
      ) : null}

    </section>
  );
}
