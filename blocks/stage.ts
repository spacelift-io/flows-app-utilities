import { AppBlock, kv, lifecycle } from "@slflows/sdk/v1";

const PERSIST_KEY = "persist";

const stage: AppBlock = {
  name: "Stage",
  description:
    "Stages config changes as signals with manual commit control - like having " +
    '"Save Draft" vs "Publish" buttons.\n\n' +
    "Key concept: Config → Signal (with manual commit)\n" +
    "- Configure new values without immediately updating signals\n" +
    "- Preview/stage changes before applying them\n" +
    "- Manually trigger commit with an event to update the signal\n" +
    "- Shows pending changes indicator\n\n" +
    "vs Capture: Capture does Event → Signal (immediate), while Stage does " +
    "Config → Signal (manual commit)\n\n" +
    "Workflow:\n" +
    "1. Stage: Configure new value - signal keeps old value, shows `changesPending: true`\n" +
    "2. Preview: Other blocks can see what's staged vs what's live\n" +
    "3. Commit: Send event to input - signal updates to staged value, `changesPending: false`\n\n" +
    "Use cases:\n" +
    "- Draft/publish workflows\n" +
    "- Configuration previews before deployment\n" +
    "- Approval-required changes\n" +
    "- Batch multiple config changes before committing\n" +
    "- A/B testing with staged variations",
  config: {
    currentValue: {
      name: "Current value",
      description:
        "The value to stage - this gets staged immediately but only becomes a signal after commit.\n\n" +
        "Staging behavior:\n" +
        "- Changing this value stages it (doesn't update the signal yet)\n" +
        "- Signal shows previous committed value until you send a commit event\n" +
        "- `changesPending` signal shows `true` when staged value differs from signal\n\n" +
        "What to stage:\n" +
        "- Configuration updates that need approval\n" +
        "- Draft content before publishing\n" +
        "- Settings changes for review\n" +
        "- New versions before deployment\n" +
        "- Any value that needs manual confirmation\n\n" +
        "Examples:\n" +
        "- Website content: stage new text/images before publishing\n" +
        "- API endpoints: stage new URLs before switching\n" +
        "- Feature flags: stage enabled/disabled states\n" +
        "- User permissions: stage role changes before applying",
      type: "any",
      required: true,
    },
  },
  inputs: {
    default: {
      name: "Persist staged value",
      description:
        "Commit the staged changes - turns staged config into live signals.\n\n" +
        "Commit trigger: Send any event to this input to commit staged changes.\n\n" +
        "What happens on commit:\n" +
        "- `persistedValue` signal updates to the staged config value\n" +
        "- `changesPending` signal changes to `false`\n" +
        "- Downstream blocks react to the new signal value\n\n" +
        "When to commit:\n" +
        "- After approval workflows complete\n" +
        "- When ready to publish staged content\n" +
        "- After testing staged configurations\n" +
        "- When manual confirmation is provided\n\n" +
        "Event data: The event payload itself is ignored - any event triggers the commit.",
      onEvent: async () => {
        await Promise.all([
          kv.block.set({ key: PERSIST_KEY, value: true }),
          lifecycle.sync(),
        ]);
      },
    },
  },
  onSync: async (input) => {
    const { value: persist } = await kv.block.get(PERSIST_KEY);
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

    await kv.block.set({ key: PERSIST_KEY, value: false });

    return {
      newStatus: "ready",
      signalUpdates: { persistedValue: configValue, changesPending: false },
    };
  },
  signals: {
    persistedValue: {
      name: "Persisted value",
      description:
        "The live, committed signal value - what other blocks see and react to.\n\n" +
        "Behavior:\n" +
        "- Only updates when commit event is sent\n" +
        "- Remains unchanged when config is staged\n" +
        '- This is the "published" version that downstream blocks use\n\n' +
        "Connect to:\n" +
        "- Other blocks that should react to committed changes\n" +
        "- Conditional logic based on live values\n" +
        "- Display components showing current state\n" +
        "- API calls that use the committed configuration",
    },
    changesPending: {
      name: "Changes pending",
      description:
        "Boolean indicator showing if staged config differs from committed signal.\n\n" +
        "Values:\n" +
        "- `true`: Config has been changed but not committed (staged changes exist)\n" +
        "- `false`: No pending changes (staged config matches committed signal)\n\n" +
        "Use for:\n" +
        '- Show "Save" or "Publish" buttons in UI\n' +
        "- Conditional workflows that wait for commits\n" +
        '- Approval indicators ("Changes need review")\n' +
        "- Prevent actions when changes are pending\n\n" +
        "Pattern: Connect to observe blocks to trigger workflows when changes are staged.",
    },
  },
};

export default stage;
