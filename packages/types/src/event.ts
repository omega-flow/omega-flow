export interface Event {
  id: string;
  time: number;
  type: string;
  data?: any;
}

// Event schema definition
export const EventSchema = {
  type: "object",
  required: ["id", "time", "type"],
  properties: {
    id: { type: "string" },
    time: { type: "number" },
    type: { type: "string" },
    data: {},
  },
};
