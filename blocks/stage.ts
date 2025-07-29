import { AppBlock, kv, lifecycle } from "@slflows/sdk/v1";

const stage: AppBlock = {
  name: "Stage",
  description:
    "Stage changes to the config before they're exported on an incoming event",
  config: {
    currentValue: {
      name: "Current value",
      type: "any",
      required: true,
    },
  },
  inputs: {
    default: {
      name: "Persist staged value",
      onEvent: async () => {
        await Promise.all([
          kv.block.set({ key: "persist", value: true }),
          lifecycle.sync(),
        ]);
      },
    },
  },
  onSync: async (input) => {
    const { value: persist } = await kv.block.get("persist");
    const configValue = input.block.config.currentValue;

    if (persist === false) {
      const exportedValue = JSON.stringify(
        input.block.lifecycle?.signals?.persistedValue,
      );

      return {
        newStatus: "ready",
        signalUpdates: {
          changesPending:
            JSON.stringify(configValue) !== JSON.stringify(exportedValue),
        },
      };
    }

    await kv.block.set({ key: "persist", value: false });

    return {
      newStatus: "ready",
      signalUpdates: { persistedValue: configValue, changesPending: false },
    };
  },
  onDrain: async () => {
    return { newStatus: "drained" };
  },
  signals: {
    persistedValue: {
      name: "Persisted value",
      description: "Currently persisted value",
    },
    changesPending: {
      name: "Changes pending",
      description: "Indicates whether there are current pending changes",
    },
  },
};

export default stage;
