"use client";

import { useState } from "react";

const CreateUser = ({ onUserCreated }: { onUserCreated: () => void }) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await fetch("http://localhost:3000/users/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, status }),
    });
    setEmail("");
    setRole("");
    setStatus("");

    onUserCreated();
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="p-4 bg-white rounded-2xl shadow w-full max-w-md"
      >
        <h2 className="text-2xl font-semibold mb-4">Create User</h2>

        <label className="block mb-2">Email</label>
        <input
          type="email"
          className="border w-full p-2 mb-4 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="block mb-2">Role</label>
        <select
          className="border w-full p-2 mb-4 "
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Select a role</option>
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>

        <label className="block mb-2">Status</label>
        <select
          className="border w-full p-4 mb-4 rounded"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Select a status</option>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>

        <button
          type="submit"
          className="bg-blue-500 text-white w-full py-2 rounded hover:bg-blue-600"
        >
          Create
        </button>
      </form>
    </>
  );
};

export default CreateUser;
