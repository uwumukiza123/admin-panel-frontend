"use client";

import { useEffect, useState } from "react";
import * as protobuf from "protobufjs";

type UserProto = {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  signature?: string;
};

// ✅ Convert PEM to ArrayBuffer safely
function pemToArrayBuffer(pem: string) {
  if (!pem) throw new Error("Empty PEM string");

  pem = pem.replace(/\\n/g, "\n");

  // Remove header/footer and whitespace
  const b64 = pem
    .replace("-----BEGIN RSA PUBLIC KEY-----", "")
    .replace("-----END RSA PUBLIC KEY-----", "")
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\r?\n|\r|\s+/g, "");

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ✅ Convert PKCS#1 RSA Public Key → SPKI DER for WebCrypto
function convertRsaPkcs1ToSpki(pkcs1: ArrayBuffer): ArrayBuffer {
  const rsaHeader = new Uint8Array([
    0x30, 0x82, 0x01, 0x22, 0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86,
    0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00, 0x03, 0x82, 0x01, 0x0f, 0x00,
  ]);

  const total = new Uint8Array(rsaHeader.length + pkcs1.byteLength);
  total.set(rsaHeader, 0);
  total.set(new Uint8Array(pkcs1), rsaHeader.length);
  return total.buffer;
}

// ✅ Import RSA Public Key (supports both PKCS#1 and SPKI)
async function importPublicKey(pem: string): Promise<CryptoKey> {
  const keyBuffer = pemToArrayBuffer(pem);
  try {
    return await crypto.subtle.importKey(
      "spki",
      keyBuffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-384" },
      true,
      ["verify"]
    );
  } catch {
    console.warn("SPKI import failed, trying PKCS#1 conversion...");
    const spkiBuffer = convertRsaPkcs1ToSpki(keyBuffer);
    return await crypto.subtle.importKey(
      "spki",
      spkiBuffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-384" },
      true,
      ["verify"]
    );
  }
}

// helper: base64 → Uint8Array
function base64ToUint8Array(b64: string) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

export default function UserTable({ refreshKey }: { refreshKey: number }) {
  const [users, setUsers] = useState<UserProto[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadAndVerify = async () => {
      setLoading(true);
      try {
        // 1️⃣ fetch protobuf binary
        const res = await fetch("http://localhost:3000/users/export");
        if (!res.ok) throw new Error("Failed to fetch /users/export");

        const arrayBuffer = await res.arrayBuffer();

        // 2️⃣ load protobuf schema dynamically
        const protoStr = `
          syntax = "proto3";
          package myApp;
          message User {
            string id = 1;
            string email = 2;
            string role = 3;
            string status = 4;
            string createdAt = 5;
            string signature = 6;
          }
          message Users {
            repeated User users = 1;
          }
        `;
        const parsed = protobuf.parse(protoStr);
        const UsersType = parsed.root.lookupType("myApp.Users");

        // decode users
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
            role: u.role,
            status: u.status,
            createdAt: u.createdAt,
            signature: u.signature,
          })
        );

        // 3️⃣ fetch public key
        const keyRes = await fetch("http://localhost:3000/users/public-key");
        const { key } = await keyRes.json();
        const pem = key.replace(/\\n/g, "\n");
        const cryptoKey = await importPublicKey(pem);

        // 4️⃣ verify each user's signature — handles multiple signing formats
        const verifiedUsers: UserProto[] = [];
        const encoder = new TextEncoder();

        for (const u of exportedUsers) {
          try {
            if (!u.signature) continue;

            const signatureBytes = base64ToUint8Array(u.signature);
            const emailBytes = encoder.encode(u.email);
            const digest = await crypto.subtle.digest("SHA-384", emailBytes);

            let valid = false;

            // ✅ CASE 1: backend signed digest
            valid = await crypto.subtle.verify(
              { name: "RSASSA-PKCS1-v1_5" },
              cryptoKey,
              signatureBytes,
              digest
            );

            // ✅ CASE 2: backend signed email directly
            if (!valid) {
              valid = await crypto.subtle.verify(
                { name: "RSASSA-PKCS1-v1_5" },
                cryptoKey,
                signatureBytes,
                emailBytes
              );
            }

            // ✅ CASE 3: backend signed hex digest
            if (!valid) {
              const hex = Array.from(new Uint8Array(digest))
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");
              const hexBytes = encoder.encode(hex);

              valid = await crypto.subtle.verify(
                { name: "RSASSA-PKCS1-v1_5" },
                cryptoKey,
                signatureBytes,
                hexBytes
              );
            }

            if (valid) verifiedUsers.push(u);
            else console.warn("❌ Invalid signature for:", u.email);
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
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">{u.status}</td>
                <td className="p-2">
                  {new Date(u.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
