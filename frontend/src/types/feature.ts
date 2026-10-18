export type FeatureKey = "student_management" | "fee_management";

export type EnabledFeature = {
  key: FeatureKey;
  name: string;
};

export type ConfiguredField = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  enabled: boolean;
  required: boolean;
  isCore: boolean;
  sortOrder: number;
};
