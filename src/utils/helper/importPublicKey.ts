import pemToArrayBuffer from "@/utils/helper/pemToArrayBuffer";
import convertRsaPkcs1ToSpki from "@/utils/helper/convertRsaPkcs1ToSpki";

const importPublicKey = async (pem: string): Promise<CryptoKey> => {
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
};

export default importPublicKey;
