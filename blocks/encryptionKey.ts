import { AppBlock } from "@slflows/sdk/v1";

const encryptionKey: AppBlock = {
  autoconfirm: true,
  name: "Encryption key",
  category: "Security",
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
    "- Encrypt sensitive data in events to protect privacy\n" +
    "- The key is marked as sensitive so it won't appear in logs\n" +
    "- Uses military-grade AES-256 encryption\n" +
    "- Cryptoshredding: Delete and recreate the encryption key to permanently destroy access to encrypted data in events\n\n" +
    "Encryption helpers you can use:\n" +
    '- `encrypt(ref("signal.encryptionKey.key"), plaintext)` - Encrypts your text using the key\n' +
    '- `decrypt(ref("signal.encryptionKey.key"), encryptedData)` - Decrypts your data back to readable text\n\n' +
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
        `const encryptedData = encrypt(ref("signal.encryptionKey.key"), plaintext)\n` +
        "// Now you're sending encrypted data instead of plain text\n" +
        "```",
      sensitive: true, // Mark as sensitive
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

export default encryptionKey;
