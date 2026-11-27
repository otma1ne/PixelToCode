import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";
import { ThemeMenu } from "@/components/theme-menu";
import { Button } from "@/components/ui/button";
import { UploadBox } from "@/features/landing/upload-box";
import { ExampleChip } from "@/features/screenshot/example-chip";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-bg">
        <div className="mx-auto flex h-[60px] max-w-[1200px] items-center gap-8 px-6 max-[720px]:px-4">
          <Link href="/" aria-label="PixelToCode home">
            <Wordmark />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeMenu />
            <Button asChild>
              <Link href="/app">Open app</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pt-[88px] pb-26 text-center max-[720px]:px-4 max-[720px]:pt-14">
        <h1 className="mx-auto max-w-[820px] text-[clamp(36px,5.4vw,60px)] leading-[1.05] font-semibold tracking-[-0.045em]">
          Build from what you see.
        </h1>
        <p className="mx-auto mt-4 max-w-[560px] text-body-lg text-muted max-[720px]:text-[16px]">
          Turn any screenshot into a clean, reusable component for Angular, React, Vue or HTML.
        </p>
        <UploadBox />
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-body-sm text-muted">
          Try an example
          <ExampleChip />
        </div>
        <p className="mt-3.5 text-caption text-muted">
          No account needed. 5 free generations a day. Screenshots are deleted after each request.
        </p>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center gap-6 px-6 text-body-sm text-muted max-[720px]:px-4">
          <Wordmark className="text-ink" />
          <span>© 2026 PixelToCode</span>
        </div>
      </footer>
    </div>
  );
}
