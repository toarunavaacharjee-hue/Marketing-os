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
      <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
        <div className="mb-3 text-sm text-[#f0f0f8]">ROAS Trend (8 weeks)</div>
        <Line
          data={{
            labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"],
            datasets: [
              {
                label: "Blended ROAS",
                data: [2.7, 2.9, 3.1, 3.0, 3.3, 3.2, 3.5, 3.4],
                borderColor: "#7c6cff",
                backgroundColor: "rgba(124,108,255,0.2)",
                tension: 0.35
              }
            ]
          }}
          options={{
            responsive: true,
            plugins: { legend: { labels: { color: "#9090b0" } } },
            scales: {
              x: { ticks: { color: "#9090b0" }, grid: { color: "#2a2e3f" } },
              y: { ticks: { color: "#9090b0" }, grid: { color: "#2a2e3f" } }
            }
          }}
        />
      </div>

      <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
        <div className="mb-3 text-sm text-[#f0f0f8]">Budget Mix</div>
        <Doughnut
          data={{
            labels: ["Google Ads", "LinkedIn", "Meta", "Content"],
            datasets: [
              {
                data: [32, 26, 22, 20],
                backgroundColor: ["#7c6cff", "#b8ff6c", "#5a4bcf", "#2a2e3f"],
                borderColor: "#141420"
              }
            ]
          }}
          options={{
            plugins: { legend: { labels: { color: "#9090b0" } } }
          }}
        />
      </div>
    </div>
  );
}

