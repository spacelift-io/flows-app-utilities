import { AppBlock, events } from "@slflows/sdk/v1";

const encryptionKey: AppBlock = {
  name: "Encryption key",
  description:
    "Creates secure encryption keys to protect your sensitive data. " +
    "This block generates a strong encryption key that stays in your environment " +
    "and never gets logged by the platform.\n\n" +
    "How it works:\n" +
    "1. Creates a secure AES-256 encryption key in your environment\n" +
    "2. You use this key to encrypt sensitive data before sending it to the platform\n" +
    "3. The platform only sees encrypted data - your sensitive information stays private\n" +
    "4. You can decrypt the data later using the same key\n\n" +
    "Security benefits:\n" +
    "- Your encryption key is created locally and never shared with the platform\n" +
    "- The platform processes your events but cannot read encrypted data\n" +
    "- The key is marked as sensitive so it won't appear in logs\n" +
    "- Uses military-grade AES-256 encryption\n\n" +
    "Encryption helpers you can use:\n" +
    '- `encrypt(ref("signal.encryptionKey.key"), outputs.encryptionKey, plaintext)` - Encrypts your text using the key\n' +
    '- `decrypt(ref("signal.encryptionKey.key"), outputs.encryptionKey, encryptedData)` - Decrypts your data back to readable text\n\n' +
    "Great for protecting:\n" +
    "- Personal information (names, addresses, phone numbers)\n" +
    "- Login credentials and API keys\n" +
    "- Financial data and payment information\n" +
    "- Any other sensitive information you don't want visible in logs",
  onSync: async ({ block }) => {
    if (!!block.lifecycle?.signals?.key) {
      return { newStatus: "ready" };
    }

    try {
      return {
        signalUpdates: { key: await generateKey() },
        newStatus: "ready",
      };
    } catch (error) {
      console.error("Error in encryption key sync:", error);

      return {
        newStatus: "failed",
        customStatusDescription: "See logs for details",
      };
    }
  },
  signals: {
    key: {
      name: "Encryption key",
      description:
        "A secure encryption key that you can use to protect sensitive data in your flows.\n\n" +
        "How to use this key:\n" +
        "- Connect this signal to encryption functions in your output customization\n" +
        "- Encrypt any sensitive information before it gets sent to the platform\n" +
        "- This ensures your private data never appears in platform logs\n\n" +
        "Technical details:\n" +
        "- This is a 256-bit AES encryption key (very secure)\n" +
        "- The key is created in your environment using secure random generation\n" +
        "- It's marked as sensitive so the platform won't show it by default\n" +
        "- You use the same key to both encrypt and decrypt your data\n\n" +
        "Example usage:\n" +
        "```\n" +
        "// In output customization of some other block\n" +
        `const encryptedData = encrypt(ref("signal.encryptionKey.key"), outputs.encryptionKey, plaintext)\n` +
        "// Now you're sending encrypted data instead of plain text\n" +
        "```",
      sensitive: true, // Mark as sensitive
    },
  },
  inputs: {
    default: {
      name: "Generate IV",
      description:
        "Creates a unique code needed for encryption (called an initialization vector or IV).\n\n" +
        "Why you need this:\n" +
        "- Each time you encrypt data, you need a fresh IV to keep it secure\n" +
        "- Even if you encrypt the same text twice, it will look different each time\n" +
        "- IVs are safe to share - they're not secret like the encryption key\n\n" +
        "How to use:\n" +
        "1. Send an event to this input to create a new IV\n" +
        "2. Use the returned IV along with your encryption key to encrypt data\n" +
        "3. Include the IV in your event data (you'll need it to decrypt later)\n\n" +
        "Security note: Using a fresh IV each time prevents anyone from detecting patterns in your encrypted data.",
      onEvent: async () => {
        await events.emit(generateIV());
      },
    },
  },
  outputs: {
    default: {
      name: "Encryption IV",
      description:
        "A unique code (IV) that you use together with your encryption key to safely encrypt data.",
      possiblePrimaryParents: ["default"],
      type: {
        type: "string",
        description:
          "A unique code that works with your encryption key to protect data.\n\n" +
          "How to use:\n" +
          "- Combine this IV with your encryption key to encrypt sensitive information\n" +
          "- Include this IV in your event data (it's safe to share)\n" +
          "- You'll need both the key and this IV to decrypt your data later\n" +
          "- Each encryption gets a fresh IV for maximum security",
      },
    },
  },
};

// Helper function to generate a new AES-256 key and return as base64
async function generateKey(): Promise<string> {
  // Generate an AES-256 key
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true, // extractable
    ["encrypt", "decrypt"],
  );

  // Export the key to raw format
  const rawKey = await crypto.subtle.exportKey("raw", key);

  // Convert to base64
  return btoa(String.fromCharCode(...new Uint8Array(rawKey)));
}

// Helper function to generate a random IV for AES-GCM
function generateIV(): string {
  // Generate 12 bytes (96 bits) for AES-GCM
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  // Convert to base64
  return btoa(String.fromCharCode(...iv));
}

export default encryptionKey;
