import type { ModelOutput } from "@pixeltocode/schema";

/** A valid Angular answer, as the model would return it. Used by tests and the end-to-end fake. */
export const ANGULAR_OUTPUT: ModelOutput = {
  componentName: "InviteMembersCard",
  summary: "Invite members card with an invite form and a member list.",
  files: [
    {
      path: "src/app/invite-members-card/invite-members-card.component.ts",
      content: [
        'import { ChangeDetectionStrategy, Component, signal } from "@angular/core";',
        'import { MemberRowComponent } from "../member-row/member-row.component";',
        "",
        "@Component({",
        '  selector: "app-invite-members-card",',
        "  imports: [MemberRowComponent],",
        "  changeDetection: ChangeDetectionStrategy.OnPush,",
        '  templateUrl: "./invite-members-card.component.html",',
        '  styleUrl: "./invite-members-card.component.scss",',
        "})",
        "export class InviteMembersCardComponent {",
        '  readonly members = signal([{ name: "Maya Okafor", email: "maya@northpeak.io" }]);',
        "}",
      ].join("\n"),
    },
    {
      path: "src/app/invite-members-card/invite-members-card.component.html",
      content:
        '<section class="card"><h2>Invite members</h2>@for (m of members(); track m.email) {<app-member-row [member]="m" />}</section>',
    },
    {
      path: "src/app/invite-members-card/invite-members-card.component.scss",
      content: ".card { padding: 24px; }",
    },
    {
      path: "src/app/member-row/member-row.component.ts",
      content: [
        'import { ChangeDetectionStrategy, Component, input } from "@angular/core";',
        "",
        "@Component({",
        '  selector: "app-member-row",',
        "  changeDetection: ChangeDetectionStrategy.OnPush,",
        '  template: "<span>{{ member().name }}</span>",',
        "})",
        "export class MemberRowComponent {",
        "  readonly member = input.required<{ name: string; email: string }>();",
        "}",
      ].join("\n"),
    },
  ],
  subcomponents: ["MemberRow"],
  dependencies: [
    { name: "@angular/core", version: "^19.0.0" },
    { name: "@angular/material", version: "^19.0.0" },
  ],
  assumptions: ["The role menu shows Admin, Editor and Viewer."],
};
