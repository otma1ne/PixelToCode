import type { Metadata } from "next";
import { Code, Eye, GitCompare, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/segmented-tabs";

export const metadata: Metadata = {
  title: "Design system · PixelToCode",
  robots: { index: false },
};

const SWATCHES = [
  "bg",
  "panel",
  "raised",
  "hover",
  "canvas",
  "ink",
  "ink-2",
  "muted",
  "accent",
  "accent-ink",
  "danger",
  "warn",
  "ok",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-line py-8">
      <h2 className="text-title-3">{title}</h2>
      {children}
    </section>
  );
}

/** Internal reference page: the design system tokens and base components as implemented in the app. */
export default function DesignPage() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
      <h1 className="text-title-1">Design system</h1>
      <p className="mt-2 text-body text-muted">
        Tokens and base components, generated from packages/tokens.
      </p>

      <Section title="Colour">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {SWATCHES.map((name) => (
            <li key={name} className="flex flex-col gap-2">
              <span
                className="h-12 rounded-md border border-line"
                style={{ background: `var(--${name})` }}
              />
              <code className="text-mono-sm text-muted">{name}</code>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Type">
        <p className="text-title-2">One screenshot, four frameworks</p>
        <p className="text-title-3">Drop a screenshot to start</p>
        <p className="text-body">Generated InviteMembersCard in 4.3 s with one subcomponent.</p>
        <p className="text-body-sm text-muted">PNG, JPEG or WebP, up to 5 MB.</p>
        <p className="text-caption text-muted">14:16 · 37 lines</p>
        <code className="text-code">readonly members = input&lt;Member[]&gt;([]);</code>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary">Generate component</Button>
          <Button>Compare with screenshot</Button>
          <Button variant="ghost">Copy</Button>
          <Button variant="danger">Remove</Button>
          <Button size="sm">
            <RotateCcw aria-hidden strokeWidth={1.5} />
            Reset file
          </Button>
          <Button variant="primary" size="lg">
            Try it with your own screenshot
          </Button>
          <Button variant="ghost" size="icon" aria-label="Reset">
            <RotateCcw aria-hidden strokeWidth={1.5} />
          </Button>
        </div>
      </Section>

      <Section title="Fields and badges">
        <div className="flex max-w-md flex-col gap-3">
          <Input placeholder="Describe a change, for example: make the button full width" />
          <Input aria-invalid placeholder="name@company.com" />
          <div className="flex gap-2">
            <Badge>Angular</Badge>
            <Badge>Pending</Badge>
            <Badge>12 files</Badge>
          </div>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="preview">
          <TabsList aria-label="Result view">
            <TabsTrigger value="preview">
              <Eye aria-hidden strokeWidth={1.5} />
              Preview
            </TabsTrigger>
            <TabsTrigger value="code">
              <Code aria-hidden strokeWidth={1.5} />
              Code
            </TabsTrigger>
            <TabsTrigger value="compare">
              <GitCompare aria-hidden strokeWidth={1.5} />
              Compare
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Section>

      <Section title="Notices">
        <div className="flex max-w-xl flex-col gap-3">
          <Notice
            tone="danger"
            title="Preview failed to compile"
            action={<Button size="sm">Ask to fix it</Button>}
          >
            invite-members-card.component.html:4 Unexpected closing tag &quot;div&quot;.
          </Notice>
          <Notice tone="warn" title="Usage limit reached">
            You can generate again at 00:00 UTC.
          </Notice>
          <Notice tone="ok" title="Export ready">
            invite-members-card.zip, 6 files.
          </Notice>
        </div>
      </Section>
    </main>
  );
}
