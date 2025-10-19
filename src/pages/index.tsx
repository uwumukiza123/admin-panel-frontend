"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import CreateUser from "@/components/CreateUser";
import UsersChartCard from "@/components/UsersChart";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>

      <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl justify-center">
        <CreateUser onUserCreated={() => setRefreshKey((k) => k + 1)} />
        <UsersChartCard refreshKey={refreshKey} />
      </div>

      <button
        onClick={() => router.push("/verified-users")}
        className="mt-8 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition cursor-pointer"
      >
        Users Table
      </button>
    </div>
  );
}
