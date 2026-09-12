import React from "react";
import { departmentLabel, sectionLabel } from "../../utils/planningLabels.js";
import { timeLabel, durationMinutes } from "../../utils/timeline.js";

export default function JointSanctionModal({ block, tasks, territory, identity, onClose }) {
  if (!block) return null;

  const taskById = new Map(tasks.map((task) => [task.task_id, task]));
  const blockTasks = block.tasks.map((taskId) => taskById.get(taskId)).filter(Boolean);
  const protectedSections = block.section_ids?.length ? block.section_ids : [block.section_id];
  const sectionNames = protectedSections.map((id) => sectionLabel(territory, id)).join(" - ");
  const totalDuration = durationMinutes(block.start_time, block.end_time);

  const departments = [...new Set(blockTasks.map((t) => departmentLabel(t.department)))];
  const machines = [...new Set(blockTasks.map((t) => t.machine_type).filter(Boolean))];
  const crews = [...new Set(blockTasks.map((t) => t.crew_type).filter(Boolean))];

  const noticeNumber = `T/409-${block.block_id}-${new Date().getFullYear()}`;
  const issueDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="t409-title">
      <div className="t409-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Toolbar */}
        <div className="t409-toolbar">
          <div className="t409-toolbar-title">
            <span className="badge-t409">FORM T/409</span>
            <span>Joint Sanction &amp; Safety Assurance Memo</span>
          </div>
          <div className="t409-toolbar-actions">
            <button type="button" className="btn-t409-print" onClick={handlePrint}>
              🖨 Print / Export PDF
            </button>
            <button type="button" className="btn-t409-close" onClick={onClose} aria-label="Close memo">
              ✕
            </button>
          </div>
        </div>

        {/* Paper Notice Body */}
        <div className="t409-paper">
          <header className="t409-header">
            <div className="t409-crest">INDIAN RAILWAYS / OPERATING DEPARTMENT</div>
            <h2 id="t409-title" className="t409-main-title">
              MEMORANDUM OF JOINT SANCTION FOR INTEGRATED TRAFFIC &amp; POWER BLOCK
            </h2>
            <div className="t409-subtitle">
              (Under Indian Railways General &amp; Subsidiary Rules - G&amp;SR Section 4.09 &amp; 15.06)
            </div>
            <div className="t409-meta-strip">
              <div><strong>Notice Ref No:</strong> {noticeNumber}</div>
              <div><strong>Dated:</strong> {issueDate}</div>
              <div><strong>Division / Section:</strong> {territory?.display_name || "Eastern Railway"} ({sectionNames})</div>
            </div>
          </header>

          <div className="t409-section">
            <h3 className="t409-section-head">1. POSSESSION &amp; TRACK OCCUPANCY PARTICULARS</h3>
            <table className="t409-table">
              <tbody>
                <tr>
                  <th>Block ID:</th>
                  <td><strong>{block.block_id}</strong></td>
                  <th>Operational Status:</th>
                  <td><strong>{block.status || "APPROVED"}</strong></td>
                </tr>
                <tr>
                  <th>Sanctioned Section(s):</th>
                  <td colSpan="3"><code>{protectedSections.join(", ")}</code> ({sectionNames})</td>
                </tr>
                <tr>
                  <th>Track Designation:</th>
                  <td>{block.track_ids?.length ? `Track(s): ${block.track_ids.join(", ")}` : "All designated running lines in section"}</td>
                  <th>Power Isolation Zone:</th>
                  <td>{block.power_isolation_zone_id || "TRD Zone-Isolated per OHE Permit to Work"}</td>
                </tr>
                <tr>
                  <th>Sanctioned Window:</th>
                  <td colSpan="3">
                    <strong>{timeLabel(block.start_time)} hrs</strong> to <strong>{timeLabel(block.end_time)} hrs</strong> &nbsp;
                    (Duration: <strong>{totalDuration} minutes</strong>)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="t409-section">
            <h3 className="t409-section-head">2. PARTICIPATING DEPARTMENTS &amp; SCHEDULED ACTIVITIES</h3>
            <table className="t409-table">
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Department</th>
                  <th>Activity Description</th>
                  <th>Planned Duration</th>
                  <th>Machinery Deployed</th>
                </tr>
              </thead>
              <tbody>
                {blockTasks.map((t) => (
                  <tr key={t.task_id}>
                    <td><code>{t.task_id}</code></td>
                    <td><strong>{departmentLabel(t.department)}</strong></td>
                    <td>{t.task_type}</td>
                    <td>{t.duration_minutes} min</td>
                    <td>{t.machine_type || "Manual / Portable Gang"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="t409-section">
            <h3 className="t409-section-head">3. RESOURCE LOGISTICS &amp; MOBILIZATION</h3>
            <div className="t409-resource-box">
              <div><strong>Approved Machine Consists:</strong> {machines.length > 0 ? machines.join(", ") : "None (Hand-held equipment only)"}</div>
              <div><strong>Deputed Gangs / Crews:</strong> {crews.length > 0 ? crews.join(", ") : "Designated Sectional Maintenance Gang"}</div>
              <div><strong>Protected Train Headway Buffer:</strong> 15 Minutes Pre- &amp; Post-Possession Cleared per G&amp;SR safety margins.</div>
            </div>
          </div>

          <div className="t409-section">
            <h3 className="t409-section-head">4. MANDATORY SAFETY ASSURANCE CERTIFICATE</h3>
            <p className="t409-terms">
              Certified that the designated section has been examined and all movements shall be suspended during
              the possession. Power isolation (OHE Permit to Work) shall be coordinated via TPC before work inception.
              Track shall be certified fit for traffic at normal sectional speed or specified caution speed upon release.
            </p>

            <div className="t409-signatures">
              <div className="sig-block">
                <div className="sig-line" />
                <span className="sig-role">Section Controller / Dy. CHC (P)</span>
                <span className="sig-sub">Operating Branch</span>
              </div>
              <div className="sig-block">
                <div className="sig-line" />
                <span className="sig-role">SSE / P-Way (Supervisor)</span>
                <span className="sig-sub">Engineering Branch</span>
              </div>
              <div className="sig-block">
                <div className="sig-line" />
                <span className="sig-role">TPC / SSE (TRD)</span>
                <span className="sig-sub">Electrical / Traction Branch</span>
              </div>
              <div className="sig-block">
                <div className="sig-line" />
                <span className="sig-role">SSE (Signal &amp; Telecom)</span>
                <span className="sig-sub">S&amp;T Branch</span>
              </div>
            </div>
          </div>

          <footer className="t409-footer">
            <span>Generated deterministically by RailSync Automated Maintenance &amp; Line Capacity Optimizer</span>
            <span>Conforms to Indian Railways Operating Manual &amp; CRIS Standards</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
