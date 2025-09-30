import { AppBlock } from "@slflows/sdk/v1";
import label from "./label.ts";

const display: AppBlock = {
  name: "Display",
  category: "Display",
  description:
    "Shows status information on the canvas with text labels and color indicators based on signals. " +
    "Creates visual status displays that represent the current state of your workflow.\n\n" +
    "How it works:\n" +
    "- Connect signals to drive the display content and colors\n" +
    "- Transform signal data into meaningful status messages\n" +
    "- Display updates automatically when connected signals change\n" +
    "- Shows interpreted state visually with text + color indicator\n" +
    "- No events required - purely signal-driven visualization\n\n" +
    "Common uses:\n" +
    '- System status: Show "Online"/"Offline" based on health check signals\n' +
    '- Workflow states: Display "Processing"/"Complete"/"Error" based on stage signals\n' +
    '- Business metrics: Show "High Traffic"/"Normal" based on usage signals\n' +
    '- Operational status: Display "Active"/"Idle"/"Maintenance" based on system signals\n\n' +
    "Examples:\n" +
    '- API health signal → "Service Online" (green) / "Service Down" (red)\n' +
    '- Queue length signal → "Queue Empty" (blue) / "Queue Full" (orange)\n' +
    '- Error count signal → "System Healthy" (green) / "Errors Detected" (red)\n' +
    '- User activity signal → "Active Users" (green) / "No Activity" (gray)',
  config: {
    label: {
      name: "Label",
      description:
        "The text to show on the canvas - transform signal data into meaningful status messages.\n\n" +
        "Purpose: Convert raw signal values into human-readable status information for visual monitoring.\n\n" +
        "What to connect:\n" +
        "- Interpreted status: Transform signal data into status messages\n" +
        "- Conditional text: Show different messages based on signal states\n" +
        "- Business-friendly labels: Convert technical data into understandable text\n" +
        "- State descriptions: Display current workflow or system states\n\n" +
        "Examples:\n" +
        '- Health check: `ref("signal.healthStatus.value") ? "Service Online" : "Service Offline"`\n' +
        '- Queue status: `ref("signal.queueLength.value") === 0 ? "Queue Empty" : "Processing Items"`\n' +
        '- User activity: `ref("signal.activeUsers.value") > 0 ? "Users Active" : "No Current Users"`\n' +
        '- Error monitoring: `ref("signal.errors.length") > 0 ? "Issues Detected" : "All Systems Normal"`\n' +
        '- Processing state: `ref("signal.isProcessing.value") ? "Working..." : "Ready"`\n\n' +
        "Focus: Show meaningful status information, not raw signal values.",
      type: "string",
      required: true,
      default: "Look, a circle!",
    },
    color: {
      name: "Color",
      description:
        "The color indicator - typically connected to a signal for dynamic status colors.\n\n" +
        "What to connect:\n" +
        "- Status signals: Connect signals that represent different states\n" +
        "- Conditional colors: Use expressions to choose colors based on signal values\n" +
        "- Static colors: Use fixed hex codes for consistent branding\n" +
        "- Computed colors: Calculate colors based on thresholds or conditions\n\n" +
        "Color formats:\n" +
        "- Hex codes: `#ff0000` (red), `#00ff00` (green), `#0000ff` (blue)\n" +
        "- CSS names: `red`, `green`, `blue`, `orange`, `yellow`\n\n" +
        "Examples:\n" +
        '- Status-based: `status.value === "online" ? "#00ff00" : "#ff0000"`\n' +
        '- Threshold-based: `count.value > 100 ? "#ff0000" : "#00ff00"`\n' +
        '- Traffic light: `"red"` / `"yellow"` / `"green"` based on system health\n' +
        '- Error states: `errors.length > 0 ? "#ff4444" : "#44ff44"`\n\n' +
        "Dynamic updates: Color changes automatically when connected signals change, creating live status indicators.",
      type: "string",
      required: true,
      default: "#95abd7",
    },
  },
  onSync: async ({ block: { config } }) => {
    await label(config.label, config.color);
    return { newStatus: "ready" };
  },
};

export default display;
