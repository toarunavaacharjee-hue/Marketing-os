export const POSITIONING_MODULE = "positioning_studio";
export const POSITIONING_KEY = "canvas";

export type PositioningHealth = {
  clarity: number;
  differentiation: number;
  credibility: number;
  message_market_fit: number;
};

export type PositioningHistoryItem = { version: string; label: string };

export type PositioningCanvasValue = {
  doc: {
    category: string;
    target: string;
    problem: string;
    solution: string;
    diff: string;
    wedge: string;
  };
  health: PositioningHealth;
  revision: number;
  history: PositioningHistoryItem[];
};
