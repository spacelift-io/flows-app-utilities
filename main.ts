import { defineApp } from "@slflows/sdk/v1";
import { blocks } from "./blocks/index.ts";

export const app = defineApp({
  autoconfirm: true,
  name: "Utilities",
  installationInstructions:
    "A collection of utility blocks for common flow operations",
  blocks,
});
