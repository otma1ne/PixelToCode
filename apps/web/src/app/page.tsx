import { Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const FRAMEWORKS = ["Angular", "React", "Vue", "HTML"];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[1200px] flex-col items-center justify-center px-4 py-26 text-center sm:px-6">
      <h1 className="max-w-3xl text-[clamp(36px,5.4vw,60px)] leading-[1.05] font-semibold tracking-[-0.045em]">
        Build from what you see.
      </h1>
      <p className="mt-4 max-w-xl text-body-lg text-muted">
        Turn any screenshot into a clean, reusable component.
      </p>
      <div className="mt-10 flex w-full max-w-xl flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong bg-panel p-6 shadow-raise">
        <Upload aria-hidden className="size-4 text-faint" strokeWidth={1.5} />
        <p className="text-title-3">Drop a screenshot to start</p>
        <p className="text-body-sm text-muted">PNG, JPEG or WebP, up to 5 MB.</p>
        <Button variant="primary" disabled>
          Generate component
        </Button>
      </div>
      <ul className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Supported frameworks">
        {FRAMEWORKS.map((name) => (
          <li key={name}>
            <Badge>{name}</Badge>
          </li>
        ))}
      </ul>
    </main>
  );
}
