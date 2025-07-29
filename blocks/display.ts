import { AppBlock } from "@slflows/sdk/v1";
import label from "./label.ts";

const display: AppBlock = {
  name: "Display",
  description: "Displays arbitrary text and a color indicator",
  config: {
    label: {
      name: "Label",
      description: "The content of the label",
      type: "string",
      required: true,
      default: "Look, a circle!",
    },
    color: {
      name: "Color",
      description: "The color of the indicator",
      type: "string",
      required: true,
      default: "#95abd7",
    },
  },
  onSync: async ({ block: { config } }) => {
    await label(config.label, config.color);
    return { newStatus: "ready" };
  },
  onDrain: async () => {
    return { newStatus: "drained" };
  },
};

export default display;
