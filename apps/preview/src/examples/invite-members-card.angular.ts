import type { GeneratedFile } from "@pixeltocode/schema";

/**
 * The reference example used across the product: the Invite members card for Fieldnote Studio.
 * It exercises what generated Angular code relies on: standalone components, templateUrl and
 * styleUrl, signal inputs and outputs, a child component, @for / @if control flow and signals.
 */
export const INVITE_MEMBERS_CARD_ANGULAR: GeneratedFile[] = [
  {
    path: "src/app/invite-members-card/member.ts",
    content: `export interface Member {
  name: string;
  email: string;
  role: "Owner" | "Editor" | "Viewer";
  pending?: boolean;
}
`,
  },
  {
    path: "src/app/invite-members-card/member-row.component.ts",
    content: `import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";
import type { Member } from "./member";

@Component({
  selector: "app-member-row",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <li class="row">
      <span class="avatar" aria-hidden="true">{{ initials() }}</span>
      <span class="who">
        <span class="name">{{ member().name }}</span>
        <span class="email">{{ member().email }}</span>
      </span>
      @if (member().pending) {
        <span class="badge">Pending</span>
      }
      <button type="button" class="role" (click)="roleClick.emit(member())">{{ member().role }}</button>
    </li>
  \`,
  styles: [\`
    .row { display: flex; align-items: center; gap: 12px; padding: 8px 0; list-style: none; }
    .avatar { width: 32px; height: 32px; border-radius: 999px; background: #EBEBE5; display: grid; place-items: center; font: 500 12px/1 system-ui; }
    .who { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .name { font: 500 14px/1.4 system-ui; color: #111210; }
    .email { font: 400 13px/1.45 system-ui; color: #5E605A; }
    .badge { font: 400 12px/1 system-ui; padding: 4px 8px; border-radius: 999px; background: #EBEBE5; color: #5E605A; }
    .role { height: 28px; padding: 0 10px; border-radius: 8px; border: 1px solid rgba(17,18,16,.16); background: #fff; font: 500 13px/1 system-ui; }
  \`],
})
export class MemberRowComponent {
  readonly member = input.required<Member>();
  readonly roleClick = output<Member>();
  readonly initials = computed(() =>
    this.member().name.split(" ").map((p) => p[0]).join("").slice(0, 2),
  );
}
`,
  },
  {
    path: "src/app/invite-members-card/invite-members-card.component.ts",
    content: `import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { MemberRowComponent } from "./member-row.component";
import type { Member } from "./member";

@Component({
  selector: "app-invite-members-card",
  imports: [MemberRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./invite-members-card.component.html",
  styleUrl: "./invite-members-card.component.css",
})
export class InviteMembersCardComponent {
  readonly workspace = "Fieldnote Studio";
  readonly email = signal("");
  readonly members = signal<Member[]>([
    { name: "Maya Okafor", email: "maya@fieldnote.studio", role: "Owner" },
    { name: "Jonas Lindqvist", email: "jonas@fieldnote.studio", role: "Editor" },
    { name: "Priya Shah", email: "priya@fieldnote.studio", role: "Viewer" },
    { name: "Sam Rivera", email: "sam@example.com", role: "Viewer", pending: true },
  ]);

  invite(): void {
    const email = this.email().trim();
    if (!email) return;
    this.members.update((list) => [...list, { name: email, email, role: "Viewer", pending: true }]);
    this.email.set("");
  }
}
`,
  },
  {
    path: "src/app/invite-members-card/invite-members-card.component.html",
    content: `<section class="card" aria-labelledby="invite-title">
  <h2 id="invite-title">Invite members</h2>
  <p class="sub">Add people to {{ workspace }}. They get access to every project.</p>
  <form class="invite" (submit)="$event.preventDefault(); invite()">
    <input
      type="email"
      placeholder="name@company.com"
      aria-label="Email address"
      [value]="email()"
      (input)="email.set($any($event.target).value)"
    />
    <button type="submit">Send invite</button>
  </form>
  <ul class="list">
    @for (member of members(); track member.email) {
      <app-member-row [member]="member" />
    }
  </ul>
  <p class="count">{{ members().length }} members</p>
</section>
`,
  },
  {
    path: "src/app/invite-members-card/invite-members-card.component.css",
    content: `.card { width: 420px; padding: 24px; border-radius: 12px; background: #fff; border: 1px solid rgba(17,18,16,.10); font-family: system-ui, sans-serif; }
h2 { margin: 0; font: 600 16px/1.35 system-ui; letter-spacing: -0.01em; color: #111210; }
.sub { margin: 4px 0 16px; font: 400 14px/1.5 system-ui; color: #5E605A; }
.invite { display: flex; gap: 8px; margin-bottom: 8px; }
input { flex: 1; height: 32px; padding: 0 10px; border-radius: 8px; border: 1px solid rgba(17,18,16,.16); font: 400 14px system-ui; }
button[type="submit"] { height: 32px; padding: 0 12px; border-radius: 8px; border: 0; background: #111210; color: #D4FA78; font: 500 14px system-ui; }
.list { margin: 0; padding: 0; }
.count { margin: 8px 0 0; font: 400 12px/1.4 system-ui; color: #5E605A; }
`,
  },
];

export const INVITE_MEMBERS_CARD_ENTRY =
  "src/app/invite-members-card/invite-members-card.component.ts";

/** A template error, to check that the preview reports compile errors with their file. */
export const BROKEN_TEMPLATE_ANGULAR: GeneratedFile[] = [
  {
    path: "src/app/broken/broken.component.ts",
    content: `import { Component } from "@angular/core";

@Component({
  selector: "app-broken",
  template: "<div>@if (open) {<span>unclosed</div>",
})
export class BrokenComponent {
  open = true;
}
`,
  },
];
