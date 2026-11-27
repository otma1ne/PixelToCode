import type { Metadata } from "next";
import { Workspace } from "@/features/workspace/workspace";

export const metadata: Metadata = {
  title: "Workspace · PixelToCode",
};

export default function AppPage() {
  return <Workspace />;
}
