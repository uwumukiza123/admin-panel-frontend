const convertRsaPkcs1ToSpki = (pkcs1: ArrayBuffer): ArrayBuffer => {
  const rsaHeader = new Uint8Array([
    0x30, 0x82, 0x01, 0x22, 0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86,
    0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00, 0x03, 0x82, 0x01, 0x0f, 0x00,
  ]);

  const total = new Uint8Array(rsaHeader.length + pkcs1.byteLength);
  total.set(rsaHeader, 0);
  total.set(new Uint8Array(pkcs1), rsaHeader.length);
  return total.buffer;
};

export default convertRsaPkcs1ToSpki;
