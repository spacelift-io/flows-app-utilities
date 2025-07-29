import { AppBlock, kv, lifecycle, timers } from "@slflows/sdk/v1";

const KV_KEYS = {
  VALUE: "value",
  EXPIRES_AT: "expiresAt",
  EVENT_ID: "eventId",
};

const capture: AppBlock = {
  name: "Capture",
  description:
    "Captures the last event received and makes it available as an exported key value",
  config: {
    defaultValue: {
      name: "Default value",
      description: "Default value to use when no event has been captured yet",
      type: "any",
      required: false,
      default: {},
    },
  },
  inputs: {
    default: {
      config: {
        value: {
          name: "Value to export",
          type: "any",
          required: true,
          default: {},
        },
        timeoutSeconds: {
          name: "Timeout in seconds",
          description:
            "If set, the value will revert to default after this time period",
          type: "number",
          required: false,
        },
      },
      onEvent: async (input) => {
        try {
          const { value, timeoutSeconds } = input.event.inputConfig;
          const eventId = input.event.id;
          let expiresAt: number | null = null;

          // Handle timeout if provided
          if (timeoutSeconds !== undefined && timeoutSeconds > 0) {
            // Calculate expiration time
            expiresAt = Date.now() + timeoutSeconds * 1000;

            // Set a new timer to reset value when timeout expires
            await timers.set(timeoutSeconds, {
              description: "Reset captured value to default",
              inputPayload: { eventId },
            });
          }

          // Store the value, expiration time, and event ID in KV store
          await kv.block.setMany([
            { key: KV_KEYS.VALUE, value },
            { key: KV_KEYS.EXPIRES_AT, value: expiresAt },
            { key: KV_KEYS.EVENT_ID, value: eventId },
          ]);

          // Trigger sync to update lifecycle signals
          await lifecycle.sync();
        } catch (error) {
          console.error("Error processing capture event:", error);
        }
      },
    },
  },
  onSync: async (input) => {
    try {
      const now = Date.now();
      const defaultValue = input.block.config.defaultValue;

      // Retrieve the captured value, expiration time, and event ID from KV store
      const [{ value }, { value: expiresAt }, { value: eventId }] =
        await kv.block.getMany([
          KV_KEYS.VALUE,
          KV_KEYS.EXPIRES_AT,
          KV_KEYS.EVENT_ID,
        ]);

      // Helper function to create consistent export updates
      const createExportUpdates = (
        value: any,
        expiresAt?: number | null,
        eventId?: string | null,
      ) => ({
        value,
        updatedAt: now,
        expiresAt,
        updatedBy: eventId || "expiration",
      });

      // Handle expired value
      if (expiresAt && now > expiresAt) {
        // Reset KV store with default values
        await kv.block.setMany([
          { key: KV_KEYS.VALUE, value: defaultValue },
          { key: KV_KEYS.EXPIRES_AT, value: null },
          { key: KV_KEYS.EVENT_ID, value: null },
        ]);

        return {
          signalUpdates: createExportUpdates(defaultValue, null, null),
          newStatus: "ready",
        };
      }

      // Handle no value case
      if (!value) {
        return {
          signalUpdates: createExportUpdates(defaultValue, null, null),
          newStatus: "ready",
        };
      }

      // Normal case - return current values
      return {
        signalUpdates: createExportUpdates(value, expiresAt, eventId),
        newStatus: "ready",
      };
    } catch (error) {
      console.error("Error in capture sync:", error);
      return {
        newStatus: "ready",
        signalUpdates: {
          value: input.block.config.defaultValue,
          updatedAt: null,
          expiresAt: null,
          updatedBy: null,
        },
      };
    }
  },

  onDrain: async () => {
    return { newStatus: "drained" };
  },
  onTimer: async (input) => {
    try {
      // Get the current event ID from KV store for more accurate comparison
      const { value: currentEventId } = await kv.block.get(KV_KEYS.EVENT_ID);
      const { block } = input;
      const defaultValue = block.config.defaultValue;

      // Only reset if the timer's event ID matches the current one
      if (
        input.timer.payload &&
        input.timer.payload.eventId === currentEventId
      ) {
        // Reset all KV values to defaults
        await kv.block.setMany([
          { key: KV_KEYS.VALUE, value: defaultValue },
          { key: KV_KEYS.EXPIRES_AT, value: null },
          { key: KV_KEYS.EVENT_ID, value: null },
        ]);

        await lifecycle.sync();
      }
    } catch (error) {
      console.error("Error in timer handler:", error);
    }
  },
  signals: {
    value: {
      name: "Value",
      description: "The last received value",
    },
    updatedAt: {
      name: "Last updated timestamp",
      description:
        "Timestamp (Unix milliseconds) when the value was last updated",
    },
    updatedBy: {
      name: "Updated by",
      description:
        "ID of the event that set the current value (null if using default value)",
    },
    expiresAt: {
      name: "Expires at",
      description:
        "Timestamp (Unix milliseconds) when the value will expire and revert to default (null if no expiration)",
    },
  },
};

export default capture;
