import { http, HttpResponse } from "msw";

export const mockScenarios = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Financial Hardship",
    scenario_type: "FINANCIAL_HARDSHIP",
    description:
      "Practice handling a debtor experiencing genuine financial difficulties.",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Angry Customer",
    scenario_type: "ANGRY_CUSTOMER",
    description: "Handle an irate debtor who disputes the debt amount.",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    name: "Payment Extension Request",
    scenario_type: "PAYMENT_EXTENSION",
    description:
      "Negotiate with a debtor requesting more time to pay their balance.",
  },
];

// Default mock handlers for API endpoints
export const handlers = [
  http.get("/api/scenarios", () => {
    return HttpResponse.json(mockScenarios);
  }),
];
