"use client";

import { useEffect, useState } from "react";
import * as protobuf from "protobufjs";
import { UserProto } from "@/utils/userData";
import importPublicKey from "@/utils/helper/importPublicKey";
import base64ToUint8Array from "@/utils/helper/base64ToUint8Array";

const UsersTable = ({ refreshKey }: { refreshKey: number }) => {
  const [users, setUsers] = useState<UserProto[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadAndVerify = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:3000/users/export");
        if (!res.ok) throw new Error("Failed to fetch /users/export");
        const arrayBuffer = await res.arrayBuffer();

        const protoStr = `
          syntax = "proto3";
          package myApp;
          message User {
            string id = 1;
            string email = 2;
            string hashedEmail = 3;
            string role = 4;
            string status = 5;
            string createdAt = 6;
            string signature = 7;
          }
          message Users {
            repeated User users = 1;
          }
        `;
        const parsed = protobuf.parse(protoStr);
        const UsersType = parsed.root.lookupType("myApp.Users");

        const decoded = UsersType.decode(new Uint8Array(arrayBuffer));
        const object = UsersType.toObject(decoded, {
          longs: String,
          enums: String,
          bytes: String,
          defaults: true,
        });

        const exportedUsers: UserProto[] = (object.users || []).map(
          (u: any) => ({
            id: u.id,
            email: u.email,
            hashedEmail: u.hashedEmail,
            role: u.role,
            status: u.status,
            createdAt: u.createdAt,
            signature: u.signature,
          })
        );

        const keyRes = await fetch("http://localhost:3000/users/public-key");
        const { key } = await keyRes.json();
        const pem = key.replace(/\\n/g, "\n");
        const cryptoKey = await importPublicKey(pem);

        const verifiedUsers: UserProto[] = [];

        for (const u of exportedUsers) {
          try {
            if (!u.signature || !u.hashedEmail) continue;

            const signatureBytes = base64ToUint8Array(u.signature);
            const hashBytes = new TextEncoder().encode(u.hashedEmail);

            const valid = await crypto.subtle.verify(
              { name: "RSASSA-PKCS1-v1_5" },
              cryptoKey,
              signatureBytes,
              hashBytes
            );

            if (valid) verifiedUsers.push(u);
            else console.warn("Invalid signature for:", u.email);
          } catch (err) {
            console.error("Verification error for user", u.email, err);
          }
        }

        if (mounted) setUsers(verifiedUsers);
      } catch (err) {
        console.error("Error loading users/export or verifying:", err);
        if (mounted) setUsers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAndVerify();
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  if (loading) return <div>Loading users...</div>;
  if (!users) return <div>No users loaded</div>;

  return (
    <div className="p-4 bg-white rounded shadow-md overflow-auto">
      <h3 className="text-lg font-semibold mb-3">Verified Users</h3>
      {users.length === 0 ? (
        <div>No verified users to show.</div>
      ) : (
        <table className="w-full table-auto text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Email</th>
              <th className="p-2">Role</th>
              <th className="p-2">Status</th>
              <th className="p-2">Created At</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-2  md:p-4 md:w-48">{u.email}</td>
                <td className="p-2 md:p-4 md:w-48">{u.role}</td>
                <td className="p-2 md:p-4 md:w-48">{u.status}</td>
                <td className="p-2 md:p-4 md:w-48">
                  {new Date(u.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UsersTable;
