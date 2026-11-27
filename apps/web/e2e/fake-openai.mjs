// A stand-in for the OpenAI Responses API, so end-to-end tests never spend credits.
// Answers with a valid Angular component, or fails when the instructions contain FAIL_PLEASE.
import { createServer } from "node:http";

const port = Number(process.env.FAKE_OPENAI_PORT ?? 3199);

const output = {
  componentName: "InviteMembersCard",
  summary: "Invite members card with an invite form and a member list.",
  files: [
    {
      path: "src/app/invite-members-card/invite-members-card.component.ts",
      content:
        'import { Component } from "@angular/core";\n\n@Component({\n  selector: "app-invite-members-card",\n  templateUrl: "./invite-members-card.component.html",\n  styleUrl: "./invite-members-card.component.scss",\n})\nexport class InviteMembersCardComponent {}\n',
    },
    {
      path: "src/app/invite-members-card/invite-members-card.component.html",
      content: "<section><h2>Invite members</h2></section>\n",
    },
    {
      path: "src/app/invite-members-card/invite-members-card.component.scss",
      content: "section { padding: 24px; }\n",
    },
  ],
  subcomponents: ["MemberRow"],
  dependencies: [{ name: "@angular/material", version: "^19.0.0" }],
  assumptions: ["The role menu shows Admin, Editor and Viewer."],
};

function respond(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

createServer((req, res) => {
  if (req.url === "/health") return respond(res, 200, { ok: true });
  if (req.method !== "POST" || !req.url?.endsWith("/responses")) return respond(res, 404, {});
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    const body = JSON.parse(raw || "{}");
    setTimeout(() => {
      if (JSON.stringify(body.input ?? "").includes("FAIL_PLEASE")) {
        return respond(res, 500, { error: { message: "fake failure" } });
      }
      respond(res, 200, {
        id: "resp_fake",
        object: "response",
        created_at: 0,
        status: "completed",
        model: body.model,
        output: [
          {
            id: "msg_fake",
            type: "message",
            role: "assistant",
            status: "completed",
            content: [{ type: "output_text", text: JSON.stringify(output), annotations: [] }],
          },
        ],
        usage: {
          input_tokens: 2100,
          input_tokens_details: { cached_tokens: 0 },
          output_tokens: 3200,
          output_tokens_details: { reasoning_tokens: 0 },
          total_tokens: 5300,
        },
      });
    }, 400);
  });
}).listen(port, () => console.log(`fake OpenAI on ${port}`));
