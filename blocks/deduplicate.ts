import { AppBlock, events, kv } from "@slflows/sdk/v1";

const deduplicate: AppBlock = {
  name: "Deduplicate",
  description:
    "Identifies and marks duplicate events within a specified time window",
  inputs: {
    default: {
      config: {
        deduplicationKey: {
          name: "Deduplication key",
          description: "Key to use for identifying duplicate events",
          type: "string",
          required: true,
          default: "",
        },
        maxAgeSeconds: {
          name: "Maximum age (seconds)",
          description:
            "Time in seconds to remember a key before considering it new again",
          type: "number",
          required: true,
          default: 3600, // Default to 1 hour
        },
      },
      onEvent: async ({ event: { inputConfig: cfg } }) => {
        const { deduplicationKey, maxAgeSeconds } = cfg;

        if (!maxAgeSeconds || maxAgeSeconds < 1) {
          console.error("Invalid max age");
          return;
        }

        const { value, ttl } = await kv.block.get(deduplicationKey);
        // Keep the longer TTL if existing TTL is greater
        const newTTL = ttl && ttl > maxAgeSeconds ? ttl : maxAgeSeconds;
        const isUnique = !value;

        await Promise.all([
          events.emit({ unique: isUnique }),
          kv.block.set({
            key: deduplicationKey,
            value: true,
            ttl: newTTL,
          }),
        ]);
      },
    },
  },
  outputs: {
    default: {
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          unique: {
            type: "boolean",
            description:
              "Whether this event is unique within the configured time window",
          },
        },
        required: ["unique"],
      },
    },
  },
};

export default deduplicate;
