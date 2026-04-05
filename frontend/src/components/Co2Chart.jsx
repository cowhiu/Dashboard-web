import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

function formatTickLabel(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    minute: "2-digit",
    second: "2-digit",
  });
}

function Co2Chart({ history }) {
  const labels = history.map((point) => formatTickLabel(point.timestamp));
  const data = {
    labels,
    datasets: [
      {
        label: "CO2 (ppm)",
        data: history.map((point) => point.co2),
        borderColor: "#2dd4bf",
        backgroundColor: "rgba(45, 212, 191, 0.16)",
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: "index",
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(8, 17, 31, 0.94)",
        borderColor: "rgba(148, 163, 184, 0.2)",
        borderWidth: 1,
        titleColor: "#f8fafc",
        bodyColor: "#cbd5e1",
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(148, 163, 184, 0.08)",
        },
        ticks: {
          color: "#94a3b8",
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        min: 400,
        max: 1500,
        grid: {
          color: "rgba(148, 163, 184, 0.08)",
        },
        ticks: {
          color: "#94a3b8",
          stepSize: 200,
        },
      },
    },
  };

  return (
    <div className="h-[320px]">
      <Line data={data} options={options} />
    </div>
  );
}

export default Co2Chart;
