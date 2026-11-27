"use client";

import {
  FRAMEWORK_LABELS,
  FRAMEWORKS,
  STYLE_LABELS,
  supportedStyles,
  type Framework,
  type StyleSystem,
} from "@pixeltocode/schema";
import { Select } from "@/components/ui/select";
import { useWorkspace } from "@/features/workspace/store";

/** Framework and styling as two selects, for the landing upload box. Only compatible styles are listed. */
export function CompactPickers() {
  const settings = useWorkspace((s) => s.settings);
  const setFramework = useWorkspace((s) => s.setFramework);
  const setStyle = useWorkspace((s) => s.setStyle);
  return (
    <>
      <Select
        aria-label="Framework"
        value={settings.framework}
        onChange={(e) => setFramework(e.target.value as Framework)}
      >
        {FRAMEWORKS.map((fw) => (
          <option key={fw} value={fw}>
            {FRAMEWORK_LABELS[fw]}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Styling"
        value={settings.style}
        onChange={(e) => setStyle(e.target.value as StyleSystem)}
      >
        {supportedStyles(settings.framework).map((st) => (
          <option key={st} value={st}>
            {STYLE_LABELS[st]}
          </option>
        ))}
      </Select>
    </>
  );
}
