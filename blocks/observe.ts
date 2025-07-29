import { AppBlock, events } from "@slflows/sdk/v1";

const observe: AppBlock = {
  name: "Observe",
  description: "Observe a value and emits an event every time it changes.",
  config: {
    value: {
      name: "Value to observe",
      description: "Every time this value changes, an event will be emitted.",
      type: "any",
      required: true,
      default: 42,
    },
  },
  onSync: async (input) => {
    // Get the current expression value
    const newValue = input.block.config.value;

    // Get the current timestamp
    const currentTimestamp = Date.now();

    // Get the previously stored value and lastUpdatedAt timestamp from lifecycle signals
    const oldValue = input.block.lifecycle?.signals?.value;
    const lastUpdatedAt = input.block.lifecycle?.signals?.lastUpdatedAt;

    // Compare values (using JSON stringify for deep comparison)
    const newValueStr = JSON.stringify(newValue);
    const oldValueStr = JSON.stringify(oldValue);

    // Check if this is first run (no lastUpdatedAt)
    if (lastUpdatedAt === undefined) {
      // First run - just store values without emitting
      return {
        signalUpdates: {
          value: newValue,
          lastUpdatedAt: currentTimestamp,
        },
        newStatus: "ready",
      };
    }

    // Calculate milliseconds since last update
    const millisSinceLastUpdate = currentTimestamp - lastUpdatedAt;

    // If value has changed (not first run)
    if (oldValueStr !== newValueStr) {
      // Emit event with the change and milliseconds since last update
      await events.emit({
        previous: oldValue,
        current: newValue,
        millisSinceLastUpdate: millisSinceLastUpdate,
      });

      // Return the new value and updated timestamp
      return {
        signalUpdates: {
          value: newValue,
          lastUpdatedAt: currentTimestamp,
        },
        newStatus: "ready",
      };
    }

    // No change detected
    return {
      newStatus: "ready",
    };
  },

  onDrain: async () => {
    return {
      newStatus: "drained",
    };
  },
  signals: {
    value: {
      name: "Value",
      description: "Value to compare against the watched expression",
    },
    lastUpdatedAt: {
      name: "Last updated at",
      description:
        "Timestamp (Unix milliseconds) when the value was last updated",
    },
  },
  outputs: {
    default: {
      type: {
        type: "object",
        properties: {
          previous: {
            type: "any",
            description: "Previous value of the expression",
          },
          current: {
            type: "any",
            description: "Current value of the expression",
          },
          millisSinceLastUpdate: {
            type: "number",
            description: "Milliseconds elapsed since the last update",
          },
        },
        required: ["previous", "current", "millisSinceLastUpdate"],
      },
    },
  },
};

export default observe;
