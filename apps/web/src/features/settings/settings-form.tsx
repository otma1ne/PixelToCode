"use client";

import {
  FRAMEWORK_LABELS,
  FRAMEWORKS,
  MAX_INSTRUCTIONS_LENGTH,
  STYLE_LABELS,
  STYLE_SYSTEMS,
  unsupportedReason,
} from "@pixeltocode/schema";
import { useId } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/features/workspace/store";

export const FRAMEWORK_OPTIONS = FRAMEWORKS.map((value) => ({
  value,
  label: FRAMEWORK_LABELS[value],
}));

/** Framework, styling and instructions, in the app column before the first generation. */
export function SettingsForm() {
  const settings = useWorkspace((s) => s.settings);
  const setFramework = useWorkspace((s) => s.setFramework);
  const setStyle = useWorkspace((s) => s.setStyle);
  const setInstructions = useWorkspace((s) => s.setInstructions);
  const instructionsId = useId();
  const countId = useId();

  const styleOptions = STYLE_SYSTEMS.map((value) => {
    const reason = unsupportedReason(settings.framework, value);
    return {
      value,
      label: STYLE_LABELS[value],
      disabled: reason !== null,
      hint: reason ?? undefined,
    };
  });
  const unavailable = styleOptions.filter((o) => o.disabled);

  return (
    <div className="grid gap-3.5">
      <div>
        <p className="mb-1.5 text-body-sm text-muted">Framework</p>
        <SegmentedControl
          label="Framework"
          fill
          value={settings.framework}
          options={FRAMEWORK_OPTIONS}
          onChange={setFramework}
        />
      </div>
      <div>
        <p className="mb-1.5 text-body-sm text-muted">Styling</p>
        <SegmentedControl
          label="Styling"
          fill
          value={settings.style}
          options={styleOptions}
          onChange={setStyle}
        />
        {unavailable.length > 0 ? (
          <p className="mt-1.5 text-caption text-muted">{unavailable[0]?.hint}.</p>
        ) : null}
      </div>
      <div>
        <label htmlFor={instructionsId} className="mb-1.5 flex text-body-sm text-muted">
          Instructions
          <span className="ml-1 text-muted">(optional)</span>
          <span id={countId} className="ml-auto font-mono text-caption">
            {settings.instructions.length}/{MAX_INSTRUCTIONS_LENGTH}
          </span>
        </label>
        <Textarea
          id={instructionsId}
          aria-describedby={countId}
          maxLength={MAX_INSTRUCTIONS_LENGTH}
          placeholder="e.g. Use standalone components. Keep the original spacing."
          value={settings.instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>
    </div>
  );
}
