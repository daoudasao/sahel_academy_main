"use client";

import React, { useState } from "react";

export interface RadarMetric {
  subject: string;
  value: number; // 0 to 100
  fullMark?: number;
}

interface RadarChartProps {
  data: RadarMetric[];
  title?: string;
  subtitle?: string;
}

export default function RadarChart({ data, title = "Répartition par Domaine", subtitle = "Analyse des performances & inscriptions" }: RadarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const numAxes = data.length;
  if (numAxes < 3) return null;

  const size = 300;
  const center = size / 2;
  const radius = 85;
  const levels = [0.25, 0.5, 0.75, 1.0];

  // Compute angles
  const getCoordinates = (index: number, levelRatio: number) => {
    const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
    const x = center + radius * levelRatio * Math.cos(angle);
    const y = center + radius * levelRatio * Math.sin(angle);
    return { x, y, angle };
  };

  // Polygon points for data
  const dataPoints = data.map((d, i) => {
    const ratio = Math.min(Math.max(d.value / (d.fullMark || 100), 0), 1);
    return getCoordinates(i, ratio);
  });

  const dataPolygonString = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="card p-4 sm:p-6 flex flex-col items-center justify-between w-full">
      <div className="w-full flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
          {subtitle && <p className="text-xs text-[var(--text-secondary)]">{subtitle}</p>}
        </div>
        <span className="badge badge-purple">Radar</span>
      </div>

      <div className="relative w-full max-w-[290px] aspect-square flex items-center justify-center my-2">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0a2d26" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.25" />
            </linearGradient>
          </defs>

          {/* Web grid polygons */}
          {levels.map((lvl, lvlIdx) => {
            const levelPoints = data.map((_, i) => {
              const { x, y } = getCoordinates(i, lvl);
              return `${x},${y}`;
            }).join(" ");

            return (
              <polygon
                key={lvlIdx}
                points={levelPoints}
                fill="none"
                stroke="var(--border-color-strong)"
                strokeWidth="1"
                strokeDasharray={lvlIdx === levels.length - 1 ? "none" : "3,3"}
                opacity="0.6"
              />
            );
          })}

          {/* Axis lines */}
          {data.map((_, i) => {
            const { x, y } = getCoordinates(i, 1.0);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="var(--border-color)"
                strokeWidth="1"
              />
            );
          })}

          {/* Filled Data Polygon (Spiderweb) */}
          <polygon
            points={dataPolygonString}
            fill="url(#radarGradient)"
            stroke="#0a2d26"
            strokeWidth="2.5"
            className="transition-all duration-300 ease-out"
          />

          {/* Data Points / Vertices */}
          {dataPoints.map((pt, i) => (
            <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIdx === i ? 6 : 4}
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="2"
                className="transition-all duration-200"
              />
            </g>
          ))}

          {/* Category Labels */}
          {data.map((d, i) => {
            const { x, y, angle } = getCoordinates(i, 1.2);
            const textAnchor = Math.abs(Math.cos(angle)) < 0.15 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
            const isHovered = hoveredIdx === i;

            return (
              <text
                key={i}
                x={x}
                y={y}
                textAnchor={textAnchor}
                dominantBaseline="middle"
                className={`text-[11px] font-semibold transition-all ${isHovered ? "fill-[var(--accent-primary)] font-bold text-[12px]" : "fill-[var(--text-secondary)]"}`}
              >
                {d.subject} ({d.value}%)
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend / Footer details */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-3 border-t border-[var(--border-color)]">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] truncate">
            <span className="w-2 h-2 rounded-full bg-[#10b981] flex-shrink-0" />
            <span className="truncate">{d.subject}: <strong className="text-[var(--text-primary)]">{d.value}%</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}
