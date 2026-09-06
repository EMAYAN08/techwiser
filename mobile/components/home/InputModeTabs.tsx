import React from "react";
import { CircularWells } from "../ui/CircularWells";
import { MODE_WELLS } from "../../constants/wellCatalog";

export type InputMode = "url" | "name" | "upc" | "qr";

interface InputModeTabsProps {
  activeMode: InputMode;
  onModeChange: (mode: InputMode) => void;
}

export function InputModeTabs({ activeMode, onModeChange }: InputModeTabsProps) {
  return (
    <CircularWells
      items={MODE_WELLS}
      selectedId={activeMode}
      onSelect={(id) => onModeChange(id as InputMode)}
      layout="spread"
    />
  );
}
