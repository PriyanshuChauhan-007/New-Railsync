import { useMemo, useState } from "react";
import { trainLabel } from "../../utils/planningLabels.js";
import { timeLabel } from "../../utils/timeline.js";

const WIDTH = 1050;
const LEFT = 170;
const RIGHT = 24;
const TOP = 44;
const ROW = 64;

function minutesFrom(value, origin) {
  return (new Date(value).getTime() - new Date(origin).getTime()) / 60000;
}

export default function TimeDistanceDiagram({
  territory,
  occupancy,
  blocks,
  horizon,
  selectedSection,
  selectedBlockId,
  onSelectBlock,
}) {
  const [hoveredElement, setHoveredElement] = useState(null);
  const [showSafetyBuffer, setShowSafetyBuffer] = useState(true);

  const model = useMemo(() => {
    if (!territory || !horizon) return null;
    const stations = [...territory.stations].sort((a, b) => a.order - b.order);
    const stationById = new Map(
      stations.map((station, index) => [station.station_id, { ...station, index }])
    );
    const sectionById = new Map(
      territory.sections.map((section) => [section.section_id, section])
    );
    const serviceById = new Map(
      (territory.train_services ?? []).map((service) => [service.train_id, service])
    );
    const total = Math.max(1, minutesFrom(horizon.end_time, horizon.start_time));
    const x = (value) =>
      LEFT +
      (Math.max(0, Math.min(total, minutesFrom(value, horizon.start_time))) / total) *
        (WIDTH - LEFT - RIGHT);
    const y = (stationId) => TOP + (stationById.get(stationId)?.index ?? 0) * ROW;
    const pxPerMinute = (WIDTH - LEFT - RIGHT) / total;

    const paths = [];
    const byTrain = new Map();
    occupancy.forEach((row) =>
      byTrain.set(row.train_id, [...(byTrain.get(row.train_id) ?? []), row])
    );

    byTrain.forEach((rows, trainId) => {
      const service = serviceById.get(trainId);
      const sequence = service?.station_sequence ?? [];
      const points = [];
      const segments = [];
      rows
        .sort((a, b) => new Date(a.entry_time) - new Date(b.entry_time))
        .forEach((row) => {
          const section = sectionById.get(row.section_id);
          if (!section) return;
          const fromIndex = sequence.indexOf(section.from_station);
          const toIndex = sequence.indexOf(section.to_station);
          const forward = fromIndex < 0 || toIndex < 0 ? true : fromIndex < toIndex;
          const entryStation = forward ? section.from_station : section.to_station;
          const exitStation = forward ? section.to_station : section.from_station;
          const p1 = [x(row.entry_time), y(entryStation)];
          const p2 = [x(row.exit_time), y(exitStation)];
          points.push(p1, p2);
          segments.push({
            sectionId: row.section_id,
            entryTime: row.entry_time,
            exitTime: row.exit_time,
            p1,
            p2,
          });
        });

      paths.push({
        trainId,
        label: trainLabel(trainId, territory),
        points,
        segments,
        startTime: rows[0]?.entry_time,
        endTime: rows[rows.length - 1]?.exit_time,
      });
    });

    const blockRects = blocks.map((block) => {
      const sectionIds = block.section_ids?.length
        ? block.section_ids
        : [block.section_id];
      const stationIndexes = sectionIds
        .flatMap((id) => {
          const section = sectionById.get(id);
          return section
            ? [
                stationById.get(section.from_station)?.index,
                stationById.get(section.to_station)?.index,
              ]
            : [];
        })
        .filter(Number.isFinite);

      const min = stationIndexes.length ? Math.min(...stationIndexes) : 0;
      const max = stationIndexes.length ? Math.max(...stationIndexes) : min;
      const blockX = x(block.start_time);
      const blockW = Math.max(8, x(block.end_time) - x(block.start_time));
      const blockY = TOP + min * ROW - 11;
      const blockH = Math.max(24, (max - min) * ROW + 22);

      // 15-minute headway safety buffer (both before and after possession)
      const bufferMinutes = 15;
      const bufferPixels = bufferMinutes * pxPerMinute;
      const bufferX = Math.max(LEFT, blockX - bufferPixels);
      const bufferW = blockW + (blockX - bufferX) + bufferPixels;

      return {
        ...block,
        x: blockX,
        width: blockW,
        y: blockY,
        height: blockH,
        bufferX,
        bufferWidth: bufferW,
        sectionIds,
      };
    });

    const ticks = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(
        new Date(horizon.start_time).getTime() + (total * index) / 6 * 60000
      );
      return {
        x: LEFT + ((WIDTH - LEFT - RIGHT) * index) / 6,
        label: timeLabel(date.toISOString()),
      };
    });

    return {
      stations,
      paths,
      blockRects,
      ticks,
      y,
      height: TOP * 2 + Math.max(1, stations.length - 1) * ROW,
    };
  }, [territory, occupancy, blocks, horizon]);

  if (!model) return null;

  return (
    <section className="time-distance-card" aria-labelledby="time-distance-heading">
      <div className="workspace-column-heading time-distance-heading">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <span className="planner-kicker">Route-wide operating picture</span>
            <h2 id="time-distance-heading">Interactive String Diagram (Time–Distance)</h2>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "12px" }}>
              Time runs left to right; stations run top to bottom. Shows conflict-free paths, possessions, and safety headway corridors.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--navy)",
                cursor: "pointer",
                background: "var(--paper)",
                padding: "4px 8px",
                border: "1px solid var(--line)",
                borderRadius: "3px",
              }}
            >
              <input
                type="checkbox"
                checked={showSafetyBuffer}
                onChange={(e) => setShowSafetyBuffer(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              Show 15-min G&amp;SR Headway Buffer
            </label>
          </div>
        </div>
      </div>

      <div className="time-distance-legend" style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap", fontSize: "11px", margin: "12px 0 16px" }}>
        <span>
          <i className="td-train" style={{ display: "inline-block", width: "14px", height: "3px", background: "var(--train, #1e5a8a)", marginRight: "6px", verticalAlign: "middle" }} />
          Public Train Path
        </span>
        <span>
          <i className="td-block" style={{ display: "inline-block", width: "14px", height: "10px", background: "var(--confirm, #1b6440)", borderRadius: "2px", marginRight: "6px", verticalAlign: "middle" }} />
          Optimized Possession
        </span>
        {showSafetyBuffer && (
          <span>
            <i style={{ display: "inline-block", width: "14px", height: "10px", background: "rgba(234, 88, 12, 0.2)", border: "1px dashed #ea580c", borderRadius: "2px", marginRight: "6px", verticalAlign: "middle" }} />
            15-min Headway Buffer
          </span>
        )}
        <span>
          <i className="td-selected" style={{ display: "inline-block", width: "14px", height: "10px", background: "#f59e0b", border: "1px solid #d97706", borderRadius: "2px", marginRight: "6px", verticalAlign: "middle" }} />
          Selected Block
        </span>
      </div>

      <div className="time-distance-scroll" style={{ position: "relative" }}>
        <svg
          className="time-distance-svg"
          viewBox={`0 0 ${WIDTH} ${model.height}`}
          role="img"
          aria-label="Interactive time-distance string diagram of route stations, train paths, and maintenance possessions"
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          {/* Time grid lines & axis labels */}
          {model.ticks.map((tick) => (
            <g key={tick.label + tick.x}>
              <line
                x1={tick.x}
                y1={TOP - 20}
                x2={tick.x}
                y2={model.height - 24}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={tick.x}
                y={16}
                textAnchor="middle"
                fontSize="10"
                fill="var(--muted, #64748b)"
                fontFamily="var(--font-mono, monospace)"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Station grid lines & station name labels */}
          {model.stations.map((station) => (
            <g key={station.station_id}>
              <line
                x1={LEFT}
                y1={model.y(station.station_id)}
                x2={WIDTH - RIGHT}
                y2={model.y(station.station_id)}
                stroke="#cbd5e1"
                strokeWidth="1"
              />
              <text
                x={LEFT - 12}
                y={model.y(station.station_id) + 4}
                textAnchor="end"
                fontSize="11"
                fontWeight="600"
                fill="var(--navy, #0f172a)"
              >
                {station.station_name}
              </text>
            </g>
          ))}

          {/* Safety headway buffers (rendered behind train lines and possessions) */}
          {showSafetyBuffer &&
            model.blockRects.map((block) => (
              <g key={`buffer-${block.block_id}`}>
                <rect
                  x={block.bufferX}
                  y={block.y}
                  width={block.bufferWidth}
                  height={block.height}
                  fill="rgba(249, 115, 22, 0.12)"
                  stroke="#ea580c"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  rx="4"
                  style={{ pointerEvents: "none" }}
                />
              </g>
            ))}

          {/* Train path string lines */}
          {model.paths.map((train) => {
            if (train.points.length < 2) return null;
            const isHovered =
              hoveredElement?.type === "train" &&
              hoveredElement.data.trainId === train.trainId;

            return (
              <g
                key={train.trainId}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredElement({
                    type: "train",
                    data: train,
                    x: e.clientX - rect.left + LEFT,
                    y: e.clientY - rect.top,
                  });
                }}
                onMouseLeave={() => setHoveredElement(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Thick transparent stroke for easier hover targeting */}
                <polyline
                  points={train.points.map((p) => p.join(",")).join(" ")}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="14"
                />
                <polyline
                  points={train.points.map((p) => p.join(",")).join(" ")}
                  fill="none"
                  stroke={isHovered ? "#0284c7" : "var(--train, #1e5a8a)"}
                  strokeWidth={isHovered ? "3.5" : "2"}
                  opacity={isHovered ? 1 : 0.85}
                  style={{ transition: "all 0.15s ease" }}
                />
              </g>
            );
          })}

          {/* Scheduled block possessions */}
          {model.blockRects.map((block) => {
            const isSelected = selectedBlockId === block.block_id;
            const isHovered =
              hoveredElement?.type === "block" &&
              hoveredElement.data.block_id === block.block_id;

            return (
              <g
                key={block.block_id}
                className={`td-possession ${isSelected ? "is-selected" : ""}`}
                onClick={() => onSelectBlock(block.block_id)}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                  setHoveredElement({
                    type: "block",
                    data: block,
                    x: block.x + block.width / 2,
                    y: block.y - 10,
                  });
                }}
                onMouseLeave={() => setHoveredElement(null)}
                role="button"
                tabIndex="0"
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={block.x}
                  y={block.y}
                  width={block.width}
                  height={block.height}
                  rx="4"
                  fill={
                    isSelected
                      ? "#f59e0b"
                      : block.integrated
                      ? "#15803d"
                      : "var(--confirm, #1b6440)"
                  }
                  stroke={isSelected ? "#d97706" : isHovered ? "#fff" : "#0f5132"}
                  strokeWidth={isSelected || isHovered ? "2" : "1"}
                  style={{
                    filter: isHovered ? "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" : "none",
                    transition: "all 0.12s ease",
                  }}
                />
                {block.width > 48 && (
                  <text
                    x={block.x + 6}
                    y={block.y + 16}
                    fontSize="10"
                    fontWeight="700"
                    fill="#ffffff"
                    style={{ pointerEvents: "none" }}
                  >
                    {block.block_id}
                  </text>
                )}
              </g>
            );
          })}

          {selectedSection && (
            <text
              x={WIDTH - RIGHT}
              y={model.height - 7}
              textAnchor="end"
              className="td-scope-label"
              fontSize="10"
              fill="var(--muted, #64748b)"
            >
              Focused section: {selectedSection}
            </text>
          )}
        </svg>

        {/* Floating Interactive Hover Tooltip */}
        {hoveredElement && (
          <div
            style={{
              position: "absolute",
              top: Math.max(10, hoveredElement.y || 40),
              left: Math.min(WIDTH - 240, Math.max(LEFT + 10, hoveredElement.x || LEFT)),
              transform: "translate(-50%, -100%)",
              background: "rgba(15, 23, 42, 0.95)",
              color: "#ffffff",
              padding: "8px 12px",
              borderRadius: "4px",
              fontSize: "11px",
              pointerEvents: "none",
              zIndex: 30,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.35)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(4px)",
              minWidth: "180px",
            }}
          >
            {hoveredElement.type === "train" ? (
              <div>
                <div style={{ fontWeight: 700, color: "#38bdf8", marginBottom: "3px" }}>
                  🚆 {hoveredElement.data.label}
                </div>
                <div style={{ color: "#cbd5e1", fontSize: "10px" }}>
                  Train ID: <strong>{hoveredElement.data.trainId}</strong>
                </div>
                <div style={{ color: "#94a3b8", fontSize: "10px", marginTop: "2px" }}>
                  Schedule: {timeLabel(hoveredElement.data.startTime)} – {timeLabel(hoveredElement.data.endTime)}
                </div>
                <div style={{ color: "#22c55e", fontSize: "9px", marginTop: "4px", fontWeight: 600 }}>
                  ✓ Non-conflicting Timetable Path
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 700, color: "#4ade80", marginBottom: "2px" }}>
                  🛠️ Possession {hoveredElement.data.block_id}
                </div>
                <div style={{ color: "#e2e8f0", fontSize: "10px" }}>
                  Time: <strong>{timeLabel(hoveredElement.data.start_time)}</strong> – <strong>{timeLabel(hoveredElement.data.end_time)}</strong>
                </div>
                <div style={{ color: "#cbd5e1", fontSize: "10px", marginTop: "2px" }}>
                  Tasks ({hoveredElement.data.tasks?.length || 0}): {hoveredElement.data.tasks?.join(", ")}
                </div>
                <div style={{ color: "#fdba74", fontSize: "10px", marginTop: "2px" }}>
                  Sections: {hoveredElement.data.sectionIds?.join(", ")}
                </div>
                {hoveredElement.data.integrated && (
                  <div style={{ color: "#86efac", fontSize: "9px", marginTop: "4px", fontWeight: 700 }}>
                    ⚡ Multi-Department Synchronized Block
                  </div>
                )}
                {showSafetyBuffer && (
                  <div style={{ color: "#fed7aa", fontSize: "9px", marginTop: "2px" }}>
                    🛡️ ±15 min G&amp;SR Headway Buffer Enforced
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {!blocks.length && (
        <p className="timeline-empty" style={{ margin: "12px 0 0", color: "var(--muted)", fontSize: "12px" }}>
          Run the CP-SAT optimizer to overlay maintenance possessions and headway buffers.
        </p>
      )}
    </section>
  );
}
