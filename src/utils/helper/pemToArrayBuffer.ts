const pemToArrayBuffer = (pem: string) => {
  if (!pem) throw new Error("Empty PEM string");

  pem = pem.replace(/\\n/g, "\n");

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
};

export default pemToArrayBuffer;
