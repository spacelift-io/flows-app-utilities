import { AppBlock, events, kv, timers } from "@slflows/sdk/v1";

const timeout: AppBlock = {
  name: "Timeout",
  description:
    "Create cancellable timers that emit events after a specified delay",

  inputs: {
    start: {
      name: "Start timer",
      config: {
        seconds: {
          name: "Delay (seconds)",
          description: "Number of seconds to wait before the timeout event",
          type: "number",
          required: true,
          default: 10,
        },
      },
      onEvent: async ({ event }) => {
        const seconds = event.inputConfig.seconds;
        const uuid = crypto.randomUUID();

        // Create the pending event for visibility
        const pendingEventId = await events.createPending({
          event: { startedAt: Date.now(), seconds, timerId: uuid },
          outputId: "timeouts",
          statusDescription: `Pending timeout event for ${seconds} seconds`,
        });

        // Set the timer, grab its *internal* ID.
        const timerId = await timers.set(seconds, {
          inputPayload: uuid,
          pendingEventId,
        });

        await Promise.all([
          kv.block.set({ key: uuid, value: { pendingEventId, timerId } }),
          events.emit({ timerId: uuid }),
        ]);
      },
    },

    cancel: {
      name: "Cancel timer",
      config: {
        timerId: {
          name: "Timer ID",
          description: "Opaque identifier for canceling the timer",
          type: "string",
          required: true,
        },
      },
      onEvent: async ({
        event: {
          inputConfig: { timerId: uuid },
        },
      }) => {
        const {
          value: { timerId, pendingEventId },
        } = await kv.block.get(uuid);

        await Promise.all([
          timers.unset(timerId),
          events.cancelPending(pendingEventId, "Timer cancelled by user"),
          kv.block.delete([uuid]),
        ]);
      },
    },
  },

  onTimer: async ({ timer: { payload: uuid } }) => {
    const {
      value: { pendingEventId },
    } = await kv.block.get(uuid);

    await Promise.all([
      events.completePending(pendingEventId),
      kv.block.delete([uuid]),
    ]);
  },

  outputs: {
    default: {
      default: true,
      type: {
        type: "object",
        properties: {
          timerId: {
            type: "string",
            description: "Opaque identifier for canceling the timer",
          },
        },
        required: ["timerId"],
      },
    },

    timeouts: {
      secondary: true,
      type: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
};

export default timeout;
