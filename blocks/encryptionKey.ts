import { AppBlock, events, kv } from "@slflows/sdk/v1";

const encryptionKey: AppBlock = {
  name: "Encryption key",
  description:
    "Generates and exports an AES-256 symmetric encryption key for secure data operations",
  onSync: async () => {
    try {
      // Check if we already have a key
      const { value: existingKey } = await kv.block.get("currentKey");
      const { value: createdAt } = await kv.block.get("createdAt");

      if (!existingKey) {
        // Generate a new key if one doesn't exist
        const key = await generateKey();
        const createdAt = Date.now();

        // Store the key and timestamp
        await kv.block.setMany([
          { key: "currentKey", value: key },
          { key: "createdAt", value: createdAt },
        ]);

        return {
          signalUpdates: { key, createdAt },
          newStatus: "ready",
        };
      }

      return {
        signalUpdates: {
          key: existingKey,
          createdAt: createdAt,
        },
        newStatus: "ready",
      };
    } catch (error) {
      console.error("Error in encryption key sync:", error);
      return {
        newStatus: "failed",
        customStatusDescription: `Failed to manage encryption key: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
  onDrain: async () => {
    return { newStatus: "drained" };
  },
  signals: {
    key: {
      name: "Encryption key",
      description: "Base64-encoded AES-256 symmetric encryption key",
      sensitive: true, // Mark as sensitive
    },
    createdAt: {
      name: "Created at",
      description: "Timestamp when the key was generated",
    },
  },
  inputs: {
    default: {
      name: "Generate IV",
      description: "Generates a new initialization vector for encryption",
      onEvent: async () => {
        try {
          // Ensure a key exists
          const { value: existingKey } = await kv.block.get("currentKey");

          if (!existingKey) {
            // Generate a new key if one doesn't exist
            const key = await generateKey();
            const createdAt = Date.now();

            await kv.block.setMany([
              { key: "currentKey", value: key },
              { key: "createdAt", value: createdAt },
            ]);
          }

          // Generate a new IV (12 bytes for AES-GCM)
          const iv = generateIV();

          // Emit only the IV
          await events.emit(
            {
              iv: iv,
            },
            { outputKey: "encryption" },
          );
        } catch (error) {
          console.error("Error generating IV:", error);
        }
      },
    },
  },
  outputs: {
    encryption: {
      name: "Encryption IV",
      description: "Provides initialization vector for encryption operations",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          iv: {
            type: "string",
            description: "Base64-encoded initialization vector",
          },
        },
        required: ["iv"],
      },
    },
  },
};

// Helper function to generate a new AES-256 key and return as base64
async function generateKey(): Promise<string> {
  // Generate an AES-256 key
  const key = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
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
