import { ui } from "@slflows/sdk/v1";

export default async (label: string, color: string) => {
  await ui.widget.set({
    elements: [
      {
        type: "svg",
        attributes: {
          width: "100%",
          height: "24",
          viewBox: "0 0 100% 24",
        },
        children: [
          {
            type: "element",
            tag: "circle",
            attributes: {
              cx: "12",
              cy: "12",
              r: "10",
              fill: color,
            },
            children: [],
          },
          {
            type: "text",
            value: label,
            attributes: {
              x: "32",
              y: "16",
              "font-size": "12",
              fill: "white",
            },
          },
        ],
      },
    ],
  });
};
