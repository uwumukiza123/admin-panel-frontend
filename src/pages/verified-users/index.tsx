"use client";

import UsersTable from "@/components/UsersTable";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifiedUsers() {
  const [refreshKey] = useState(0);
  const router = useRouter();

  return (
    <div className="bg-gray-50 flex flex-col items-center p-8">
      <h1 className="text-2xl font-bold mb-6">Users Table</h1>
      <UsersTable refreshKey={refreshKey} />
      <button
        onClick={() => router.push("/")}
        className="mt-8 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition cursor-pointer"
      >
        Users Chart
      </button>
    </div>
  );
}
