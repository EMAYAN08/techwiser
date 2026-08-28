import React from "react";
import { useRouter } from "expo-router";
import { useComparisonStore } from "../../store/useComparisonStore";
import {
  DetailedSpreadsheet,
  DetailedSpreadsheetEmpty,
} from "../../components/comparison/DetailedSpreadsheet";

export default function DetailedCompareScreen() {
  const router = useRouter();
  const { activeComparison } = useComparisonStore();
  const handleBack = () => router.back();

  if (!activeComparison) {
    return <DetailedSpreadsheetEmpty onBack={handleBack} />;
  }

  return (
    <DetailedSpreadsheet
      products={activeComparison.products}
      groupedSpecs={(activeComparison as any).groupedSpecs}
      onBack={handleBack}
    />
  );
}
