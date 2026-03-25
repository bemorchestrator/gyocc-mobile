import React from "react";
import StatusBadge from "./StatusBadge";
import { EquipmentCondition } from "../types";
import { font } from '../constants/fonts';

const CONDITION_COLORS: Record<
  EquipmentCondition,
  { color: string; bgColor: string }
> = {
  Excellent: { color: "#15803D", bgColor: "#DCFCE7" },
  Good: { color: "#1D4ED8", bgColor: "#DBEAFE" },
  Fair: { color: "#A16207", bgColor: "#FEF9C3" },
  Poor: { color: "#DC2626", bgColor: "#FEE2E2" },
};

export default function ConditionBadge({
  condition,
}: {
  condition: EquipmentCondition;
}) {
  const colors = CONDITION_COLORS[condition] || CONDITION_COLORS.Good;
  return <StatusBadge label={condition} color={colors.color} bgColor={colors.bgColor} />;
}
