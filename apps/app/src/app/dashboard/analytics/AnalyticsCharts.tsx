"use client";

import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

export function AnalyticsCharts() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 text-sm text-heading">ROAS Trend (8 weeks)</div>
        <Line
          data={{
            labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
            datasets: [
              {
                label: "Blended ROAS",
                data: [2.7, 2.9, 3.1, 3.0, 3.3, 3.2, 3.5, 3.4],
                borderColor: "#7C4DFF",
                backgroundColor: "rgba(124, 77, 255, 0.12)",
                tension: 0.35
              }
            ]
          }}
          options={{
            responsive: true,
            plugins: { legend: { labels: { color: "#516F90" } } },
            scales: {
              x: { ticks: { color: "#516F90" }, grid: { color: "#DFE3EB" } },
              y: { ticks: { color: "#516F90" }, grid: { color: "#DFE3EB" } }
            }
          }}
        />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 text-sm text-heading">Budget Mix</div>
        <Doughnut
          data={{
            labels: ["Google Ads", "LinkedIn", "Meta", "Content"],
            datasets: [
              {
                data: [32, 26, 22, 20],
                backgroundColor: ["#7C4DFF", "#FF8F00", "#5E35B1", "#99ACC2"],
                borderColor: "#FFFFFF"
              }
            ]
          }}
          options={{
            plugins: { legend: { labels: { color: "#516F90" } } }
          }}
        />
      </div>
    </div>
  );
}

