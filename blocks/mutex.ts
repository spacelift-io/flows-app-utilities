import { AppBlock, events, kv, lifecycle, timers } from "@slflows/sdk/v1";
import label from "./label.ts";

const mutex: AppBlock = {
  name: "Mutex",
  description: "Only allow a single event to be processed at a time",
  config: {
    releaser: {
      name: "Releaser value",
      description: "When this value changes, the mutex will be released",
      type: "string",
      required: true,
      default: "",
    },
  },
  onSync: async (input) => {
    // First, detect if the releaser value has changed by comparing the one
    // stored in the KV store with the one provided in the config.
    const { value: oldReleaser } = await kv.block.get("releaser");
    const newReleaser = input.block.config.releaser;

    // If there is no change in the releaser value, the mutex is still held.
    if (oldReleaser === newReleaser) {
      return { newStatus: "ready" };
    }

    // Get the next event ID. When we list events, they are sorted by
    // their creation time. We want to release the oldest event first.
    const { pairs } = await kv.block.list({ keyPrefix: "evt:" });

    // It is possible that there are no events waiting for the mutex
    // to be released.
    if (pairs.length === 0) {
      await label("Available", "#51d54f");
      return { newStatus: "ready" };
    }

    // Extract the eldest waiting event from our queue of contenders
    const [{ key, value: timeout }] = pairs;
    const eventId = key.split(":")[1];

    await Promise.all([
      timers.set(timeout, { inputPayload: eventId }),
      label("Held", "#ffcb66"),
      kv.block.setMany([
        { key: "currentHolder", value: eventId },
        { key: "releaser", value: newReleaser },
        { key: `evt:${eventId}`, value: "", ttl: 0 }, // Delete the event from the queue.
      ]),
      events.emit({ lockId: eventId }, { parentEventId: eventId }),
    ]);

    return { newStatus: "ready" };
  },
  onDrain: async () => {
    return { newStatus: "drained" };
  },
  onTimer: async ({ timer: { payload: eventId } }) => {
    // Timer no longer useful, possibly related to an older event.
    // We can safely ignore it.
    if ((await kv.block.get("currentHolder")).value !== eventId) {
      return;
    }

    // Resetting the releaser means that we release the next event
    // when the next sync completes.
    await Promise.all([
      kv.block.set({ key: "releaser", value: Date.now().toString() }),
      lifecycle.sync(),
    ]);
  },

  inputs: {
    default: {
      config: {
        timeout: {
          name: "Lock timeout",
          type: "number",
          description:
            "Time (in seconds) the mutex can be held before automatic release",
          required: true,
          default: 60,
        },
      },
      onEvent: async ({ event }) => {
        Promise.all([
          // We could also think of expiring these events after a certain
          // time if they cannot acquire the lock.
          await kv.block.set({
            key: `evt:${event.id}`,
            value: event.inputConfig.timeout,
          }),
          await lifecycle.sync(),
        ]);
      },
    },
  },
  outputs: {
    default: {
      type: {
        type: "object",
        properties: {
          lockId: {
            type: "string",
            description: "Identifier for the acquired lock",
          },
        },
      },
    },
  },
};

export default mutex;
