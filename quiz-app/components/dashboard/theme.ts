import { createElement, type ReactNode } from "react";

/** Chart colours, matching the quiz palette: white surfaces, green = positive, red = danger. */
export const COLOR = {
  pre: "#aab2bd",
  post: "#15803d",
  social: "#c81e2d",
  seminar: "#15803d",
  grid: "#e6e9ee",
  text: "#14181f",
  muted: "#5b6573",
};

export const CATEGORY_COLOR = {
  Substantial: "#15803d",
  Modest: "#7cc59a",
  Unchanged: "#b6bdc7",
  Lower: "#c81e2d",
} as const;

export const CATEGORY_LABEL = {
  Substantial: "Improved substantially",
  Modest: "Improved modestly",
  Unchanged: "Unchanged",
  Lower: "Scored lower",
} as const;

const SHORT_TOPIC: Record<string, string> = {
  "WhatsApp Scams": "WhatsApp",
  "Phishing": "Phishing",
  "Everyday Online Fraud": "Everyday fraud",
  "Scam Prevention": "Prevention",
};
export const shortTopic = (t: string) => SHORT_TOPIC[t] ?? t;

/** Legend labels in body text colour; Recharts defaults to the (often pale) series colour. */
export const legendText = (value: ReactNode) => createElement("span", { style: { color: COLOR.text } }, value);
