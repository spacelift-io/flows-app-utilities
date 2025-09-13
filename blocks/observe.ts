import { AppBlock, events } from "@slflows/sdk/v1";

const observe: AppBlock = {
  name: "Observe",
  description: "Watches signals for changes and emits events when they occur",
  config: {
    value: {
      name: "Value to observe",
      description:
        "The value to monitor for changes - almost always a signal from another block.\n\n" +
        "What to connect:\n" +
        "- Signals from other blocks (most common use case)\n" +
        "- User input fields or form data\n" +
        "- Database query results\n" +
        "- API response data\n" +
        "- State variables from other components\n\n" +
        "Behavior:\n" +
        "- Uses deep comparison to detect changes (works with objects and arrays)\n" +
        "- On first run, stores the value but doesn't emit an event\n" +
        "- Every subsequent change triggers an event with old/new values\n\n" +
        "Examples:\n" +
        "- Connect to a user profile signal to detect login changes\n" +
        "- Monitor a database query signal for new records\n" +
        "- Watch an API status signal for service updates",
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
    return { newStatus: "ready" };
  },

  signals: {
    value: {
      name: "Value",
      description:
        "Current observed value - stores the most recent value for comparison against future changes.",
    },
    lastUpdatedAt: {
      name: "Last updated at",
      description:
        "Timestamp (Unix milliseconds) when the observed value was last updated. " +
        "Used to calculate time between changes.",
    },
  },
  outputs: {
    default: {
      type: {
        type: "object",
        properties: {
          previous: {
            type: "any",
            description:
              "Previous value before the change occurred. Can be any data type " +
              "(string, number, object, array, etc.).",
          },
          current: {
            type: "any",
            description:
              "New current value after the change. This is what triggered the event emission.",
          },
          millisSinceLastUpdate: {
            type: "number",
            description:
              "Time elapsed in milliseconds since the last value change. Useful for " +
              "rate limiting, debouncing, or understanding change frequency.",
          },
        },
        required: ["previous", "current", "millisSinceLastUpdate"],
      },
    },
  },
};

export default observe;
