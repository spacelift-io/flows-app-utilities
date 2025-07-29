import { AppBlock, events, kv, timers } from "@slflows/sdk/v1";

const merge: AppBlock = {
  name: "Merge",
  description: "Merges events from two inputs based on a matching key",
  config: {
    defaultMergeTimeout: {
      name: "Default merge timeout",
      description:
        "Default timeout in seconds before considering a merge failed",
      type: "number",
      default: 300, // 5 minutes
      required: false,
    },
  },
  inputs: {
    primary: {
      name: "Primary",
      description: "Primary events to be matched",
      config: {
        matchingKey: {
          name: "Matching key",
          description: "Key used to match with secondary events",
          type: "string",
          required: true,
        },
        mergeTimeout: {
          name: "Merge timeout",
          description: "Timeout in seconds (overrides default configuration)",
          type: "number",
          required: false,
        },
      },
      onEvent: async (input) => {
        try {
          const { matchingKey, mergeTimeout } = input.event.inputConfig;

          // Validate matching key
          if (!matchingKey) {
            console.error("Primary event missing matching key");
            return;
          }

          // Calculate effective timeout
          const effectiveTimeout =
            mergeTimeout || input.block.config.defaultMergeTimeout || 300; // 5 minutes default

          // Create a KV store entry for this primary event
          const kvKey = `merge:primary:${matchingKey}:${input.event.id}`;

          await kv.block.set({
            key: kvKey,
            value: { eventId: input.event.id },
          });

          // Set a timer to handle timeout case
          await timers.set(effectiveTimeout, {
            inputPayload: {
              kvKey,
              eventId: input.event.id,
            },
            description: `Timeout for merge key: ${matchingKey}`,
          });
        } catch (error) {
          console.error("Error processing primary event:", error);
        }
      },
    },
    secondary: {
      name: "Secondary",
      description: "Secondary events with payload to merge",
      config: {
        matchingKey: {
          name: "Matching key",
          description: "Key used to match with primary events",
          type: "string",
          required: true,
        },
        payload: {
          name: "Payload",
          description: "Payload to include in the merged output",
          type: "any",
          required: true,
        },
      },
      onEvent: async (input) => {
        try {
          const { matchingKey, payload } = input.event.inputConfig;

          // Validate matching key
          if (!matchingKey) {
            console.error("Secondary event missing matching key");
            return;
          }

          // Search for matching primary events
          const prefix = `merge:primary:${matchingKey}:`;
          const { pairs } = await kv.block.list({ keyPrefix: prefix });

          if (pairs.length === 0) {
            // No matching primary events found, emit on unmatched output
            await events.emit(
              { matchingKey, payload },
              {
                outputKey: "unmatched",
                parentEventId: input.event.id,
              },
            );
            return;
          }

          // Collect all events to emit and keys to delete
          const promises: Promise<any>[] = [];
          const keysToDelete: string[] = [];

          for (const match of pairs) {
            const primaryEventId = match.value.eventId;

            // Add emit promise to the collection
            promises.push(
              events.emit(
                { matched: true, payload: payload },
                {
                  outputKey: "default",
                  parentEventId: primaryEventId,
                  secondaryParentEventIds: [input.event.id],
                },
              ),
            );

            // Add key to the collection for deletion
            keysToDelete.push(match.key);
          }

          if (keysToDelete.length > 0) {
            promises.push(kv.block.delete(keysToDelete));
          }

          // Execute all emit operations
          await Promise.all(promises);
        } catch (error) {
          console.error("Error processing secondary event:", error);
        }
      },
    },
  },
  outputs: {
    default: {
      default: true,
      name: "Merged",
      description: "Output for merged events",
      possiblePrimaryParents: ["primary"],
      type: {
        type: "object",
        properties: {
          matched: {
            type: "boolean",
            description:
              "Whether a matching secondary event was found before timeout",
          },
          payload: {
            type: "any",
            description:
              "The merged payload (from secondary input, or null if timeout)",
          },
        },
        required: ["matched"],
      },
    },
    unmatched: {
      name: "Unmatched",
      description: "Output for unmatched secondary events",
      secondary: true,
      possiblePrimaryParents: ["secondary"],
      type: {
        type: "object",
        properties: {
          matchingKey: {
            type: "string",
            description:
              "The matching key that had no corresponding primary event",
          },
          payload: {
            type: "any",
            description: "The payload from the unmatched secondary event",
          },
        },
        required: ["matchingKey", "payload"],
      },
    },
  },
  onTimer: async (input) => {
    try {
      const { kvKey, eventId } = input.timer.payload;

      // Skip if already matched
      if (!(await kv.block.get(kvKey)).value) return;

      await Promise.all([
        events.emit(
          { matched: false, payload: null },
          { parentEventId: eventId, outputKey: "default" },
        ),
        kv.block.delete([kvKey]),
      ]);
    } catch (error) {
      console.error("Error processing merge timeout:", error);
    }
  },
};

export default merge;
