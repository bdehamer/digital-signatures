const {
  calculateDigest,
  newEllipticCurveKeyPair,
  generateSignature,
  verifySignature,
} = require("../index.js");

describe("calculateDigest", () => {
  it("should return the correct SHA-256 hash as a hex-encoded string", () => {
    const inputs = [
      {
        input: "test input",
        expected:
          "9dfe6f15d1ab73af898739394fd22fd72a03db01834582f24bb2e1c66c7aaeae",
      },
      {
        input: "",
        expected:
          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      },
      {
        input: "*".repeat(1_000_000),
        expected:
          "ec500f6543f8c43040af2ed5707d03ce0775c0f9e0c9ab12ce2abed09ea486f3",
      },
    ];

    inputs.forEach(({ input, expected }) => {
      const result = calculateDigest(input);
      expect(result).toBe(expected);
    });
  });
});

describe("newEllipticCurveKeyPair", () => {
  it("should generate a new elliptic curve key pair", () => {
    const { publicKey, privateKey } = newEllipticCurveKeyPair();
    expect(publicKey).toBeDefined();
    expect(privateKey).toBeDefined();

    expect(publicKey.type).toBe("public");
    expect(publicKey.asymmetricKeyType).toBe("ec");
    expect(publicKey.asymmetricKeyDetails.namedCurve).toBe("prime256v1");

    expect(privateKey.type).toBe("private");
    expect(privateKey.asymmetricKeyType).toBe("ec");
    expect(privateKey.asymmetricKeyDetails.namedCurve).toBe("prime256v1");

    const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
    expect(publicKeyPem).toMatch(/^-----BEGIN PUBLIC KEY-----\n/);

    const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" });
    expect(privateKeyPem).toMatch(/^-----BEGIN PRIVATE KEY-----\n/);
  });
});

describe("generateSignature", () => {
  it("should generate a valid signature for the given data", () => {
    const { publicKey, privateKey } = newEllipticCurveKeyPair();
    const data = "test data";
    const signature = generateSignature(privateKey, data);

    expect(typeof signature).toBe("string");
    expect(signature.length).toBeGreaterThan(0);

    // Check that signature is a valid hex string
    expect(signature).toMatch(/^[0-9a-f]+$/i);
    console.log(`Signature: ${signature}`);
  });
});

describe("verifySignature", () => {
  it("should verify a valid signature", () => {
    const { publicKey, privateKey } = newEllipticCurveKeyPair();
    const data = "test data";
    const signature = generateSignature(privateKey, data);

    const isValid = verifySignature(publicKey, data, signature);
    expect(isValid).toBe(true);
  });

  it("should reject an invalid signature", () => {
    const { publicKey, privateKey } = newEllipticCurveKeyPair();
    const data = "test data";
    const signature = generateSignature(privateKey, data);

    const isValid = verifySignature(publicKey, "tampered data", signature);
    expect(isValid).toBe(false);
  });
});
