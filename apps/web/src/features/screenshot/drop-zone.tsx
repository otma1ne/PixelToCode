"use client";

import { ACCEPTED_IMAGE_TYPES } from "@pixeltocode/schema";
import { useRef, useState, type ReactNode, type KeyboardEvent, type DragEvent } from "react";
import { cn } from "@/lib/cn";

export interface DropZoneProps {
  onFile: (file: File) => void;
  children: ReactNode;
  className?: string;
}

/**
 * Click, Enter or Space opens the file picker; files can also be dropped on it.
 * Its accessible name is its visible text, so speech users can say what they see.
 */
export function DropZone({ onFile, children, className }: DropZoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const open = () => input.current?.click();
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  };
  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = (e: DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragging(false);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      data-dragging={dragging || undefined}
      onClick={open}
      onKeyDown={onKeyDown}
      onDragEnter={onDragOver}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "cursor-pointer border border-dashed border-line-strong transition-colors duration-[120ms] hover:border-faint data-[dragging]:border-sel data-[dragging]:bg-accent-soft",
        className,
      )}
    >
      {children}
      <input
        ref={input}
        type="file"
        hidden
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        data-testid="screenshot-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
