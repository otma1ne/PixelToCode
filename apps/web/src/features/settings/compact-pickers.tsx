"use client";

import { FRAMEWORK_LABELS, FRAMEWORKS, STYLE_LABELS, supportedStyles } from "@pixeltocode/schema";
import { Select } from "@/components/ui/select";
import { useWorkspace } from "@/features/workspace/store";

const FRAMEWORK_OPTIONS = FRAMEWORKS.map((value) => ({ value, label: FRAMEWORK_LABELS[value] }));

/** Framework and styling as two selects, for the landing upload box. Only compatible styles are listed. */
export function CompactPickers() {
  const settings = useWorkspace((s) => s.settings);
  const setFramework = useWorkspace((s) => s.setFramework);
  const setStyle = useWorkspace((s) => s.setStyle);
  const styleOptions = supportedStyles(settings.framework).map((value) => ({
    value,
    label: STYLE_LABELS[value],
  }));
  return (
    <>
      <Select
        label="Framework"
        className="w-[112px]"
        value={settings.framework}
        options={FRAMEWORK_OPTIONS}
        onValueChange={setFramework}
      />
      <Select
        label="Styling"
        className="w-[104px]"
        value={settings.style}
        options={styleOptions}
        onValueChange={setStyle}
      />
    </>
  );
}
