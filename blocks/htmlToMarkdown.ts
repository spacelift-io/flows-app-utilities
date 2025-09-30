import { AppBlock, events } from "@slflows/sdk/v1";
import TurndownService from "turndown";

const htmlToMarkdown: AppBlock = {
  name: "HTML to Markdown",
  category: "Transform",
  description: "Converts HTML content to Markdown format using turndown",
  config: {},
  inputs: {
    default: {
      name: "HTML Input",
      description: "HTML content to convert to Markdown",
      config: {
        html: {
          name: "HTML Content",
          description: "The HTML content to convert",
          type: "string",
          required: true,
        },
        headingStyle: {
          name: "Heading Style",
          description: "Style for headings (setext or atx)",
          type: { type: "string", enum: ["setext", "atx"] },
          required: false,
          default: "atx",
        },
        bulletListMarker: {
          name: "Bullet List Marker",
          description: "Character to use for bullet lists",
          type: { type: "string", enum: ["-", "*", "+"] },
          required: false,
          default: "-",
        },
        codeBlockStyle: {
          name: "Code Block Style",
          description: "Style for code blocks",
          type: { type: "string", enum: ["indented", "fenced"] },
          required: false,
          default: "fenced",
        },
        fence: {
          name: "Fence Characters",
          description: "Characters to use for fenced code blocks",
          type: { type: "string", enum: ["```", "~~~"] },
          required: false,
          default: "```",
        },
      },
      onEvent: async (input) => {
        try {
          const {
            html,
            headingStyle,
            bulletListMarker,
            codeBlockStyle,
            fence,
          } = input.event.inputConfig;

          // Create turndown service with configuration
          const turndownService = new TurndownService({
            headingStyle: headingStyle || "atx",
            bulletListMarker: bulletListMarker || "-",
            codeBlockStyle: codeBlockStyle || "fenced",
            fence: fence || "```",
          });

          // Convert HTML to Markdown
          const markdown = turndownService.turndown(html);

          await events.emit(
            {
              markdown,
              originalHtml: html,
            },
            {
              outputKey: "default",
              parentEventId: input.event.id,
            },
          );
        } catch (error) {
          console.error("Error converting HTML to Markdown:", error);
          throw error;
        }
      },
    },
  },
  outputs: {
    default: {
      default: true,
      name: "Markdown Output",
      description: "Successfully converted Markdown content",
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          markdown: {
            type: "string",
            description: "The converted Markdown content",
          },
          originalHtml: {
            type: "string",
            description: "The original HTML input",
          },
        },
        required: ["markdown", "originalHtml"],
      },
    },
  },
};

export default htmlToMarkdown;
