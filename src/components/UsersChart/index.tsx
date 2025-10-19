"use client";

import { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import {
  ArcElement,
  Tooltip,
  Legend,
  Chart as ChartJs,
  ChartOptions,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJs.register(ArcElement, Tooltip, Legend, ChartDataLabels);

const UsersChart = ({ refreshKey }: { refreshKey: number }) => {
  const [chartData, setChartData] = useState<any>(null);
  const [_, setTotalUsers] = useState<number>(0);

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch("http://localhost:3000/users");
      const users = await res.json();

      setTotalUsers(users.length);

      const today = new Date();
      const counts: Record<string, number> = {};

      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dayKey = date.toISOString().split("T")[0];
        counts[dayKey] = 0;
      }

      users.forEach((user: any) => {
        const createdDate = user.createdAt.split("T")[0];
        if (counts[createdDate] !== undefined) {
          counts[createdDate]++;
        }
      });

      const labels = Object.keys(counts).reverse();
      const dataValues = Object.values(counts).reverse();

      setChartData({
        labels,
        datasets: [
          {
            label: "Users Created",
            data: dataValues,
            backgroundColor: [
              "#3B82F6",
              "#F59E0B",
              "#10B981",
              "#8B5CF6",
              "#EF4444",
              "#6366F1",
              "#14B8A6",
            ],
          },
        ],
      });
    };

    fetchUsers();
  }, [refreshKey]);

  const options: ChartOptions<"pie"> = {
    plugins: {
      legend: {
        position: "bottom",
      },
      tooltip: {
        enabled: true,
      },
      datalabels: {
        color: "#fff",
        font: {
          weight: "bold" as const,
          size: 14,
        },
        formatter: (value: number) => {
          if (value > 0) return value;
          return "";
        },
      },
    },
  };

  if (!chartData) return <p>Loading chart...</p>;

  return (
    <div className="p-4 bg-white rounded-2xl shadow w-full max-w-md">
      <h2 className="text-2xl font-semibold mb-4">
        Users Created (Last 7 Days)
      </h2>
      <div className="relative">
        <Pie data={chartData} options={options} />
      </div>
    </div>
  );
};

export default UsersChart;
