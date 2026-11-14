export interface DedicatedTeamMetric {
  id: string;
  value: string;
  unit: string;
  label: string;
}

export const dedicatedTeamMetrics: DedicatedTeamMetric[] = [
  {
    id: "brands",
    value: "500",
    unit: "+",
    label: "Brands trust us",
  },
  {
    id: "assets",
    value: "70",
    unit: "k+",
    label: "Assets delivered",
  },
  {
    id: "retention",
    value: "94",
    unit: "%",
    label: "Retention rate",
  },
  {
    id: "first-delivery",
    value: "48",
    unit: "h",
    label: "Average first delivery",
  },
];
