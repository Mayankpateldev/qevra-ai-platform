import Home from "../page";
import { requireChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const user = await requireChatGPTUser("/workspace");
  return <Home initialDemo workspaceUser={{ displayName: user.displayName, email: user.email }} />;
}
