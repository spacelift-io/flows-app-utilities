import { AppBlock, events, kv } from "@slflows/sdk/v1";

const deduplicate: AppBlock = {
  name: "Deduplicate",
  description:
    "Prevents duplicate events from being processed by tracking unique identifiers " +
    "within a time window. All events still pass through, but they're marked as " +
    "unique or duplicate.\n\n" +
    "How it works:\n" +
    "- Each event provides a deduplication key (usually from event data)\n" +
    "- First time seeing a key: marked as `unique: true`\n" +
    "- Same key seen again: marked as `unique: false`\n" +
    "- Keys are forgotten after the configured time window\n\n" +
    "Event flow:\n" +
    "- Every event passes through (none are blocked)\n" +
    "- Output shows uniqueness with `unique: true/false`\n" +
    "- Downstream blocks decide whether to process based on uniqueness\n\n" +
    "Common uses:\n" +
    "- Prevent duplicate API calls from user double-clicks\n" +
    "- Avoid processing duplicate webhook deliveries\n" +
    "- Filter repeated sensor readings or alerts\n" +
    '- Implement "send once per hour" logic\n' +
    "- Prevent duplicate database inserts\n\n" +
    "Pattern: Connect to conditional blocks that only process when `unique: true`",
  inputs: {
    default: {
      config: {
        deduplicationKey: {
          name: "Deduplication key",
          description:
            "A unique identifier based on event content to determine if events are duplicates.\n\n" +
            "How to create good keys:\n" +
            "- Use meaningful data from the event that identifies duplicates\n" +
            "- Combine user and action: `outputs.blockId.userId + ':' + outputs.blockId.action`\n" +
            "- Use business identifiers from your application\n" +
            "- Combine multiple fields for complex deduplication",
          type: "string",
          required: true,
          default: "",
        },
        maxAgeSeconds: {
          name: "Maximum age (seconds)",
          description:
            "How long (in seconds) to remember keys before considering them unique again.",
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
              "Shows whether this is the first time we've seen this key - `true` for first occurrence, `false` for duplicates.\n\n" +
              "Values:\n" +
              "- `true`: This is the first time we've seen this key (within the time window)\n" +
              "- `false`: We've seen this key before (it's a duplicate)\n\n" +
              "How to use:\n" +
              "- Connect to conditional blocks that only process unique events\n" +
              "- Track duplicate rates for monitoring\n" +
              '- Show "already processed" messages for duplicates\n' +
              "- Allow only unique actions within time windows\n\n" +
              "Example flows:\n" +
              "- `unique: true` → Process API call\n" +
              "- `unique: false` → Log duplicate attempt, skip processing\n" +
              "- `unique: true` → Send notification\n" +
              "- `unique: false` → Increment duplicate counter\n\n" +
              "Note: All events pass through - this flag just indicates uniqueness for downstream decisions.",
          },
        },
        required: ["unique"],
      },
    },
  },
};

export default deduplicate;
