import { requireChatGPTUser } from "./chatgpt-auth";
import { rows } from "../lib/server";
import Album from "../ui/Album";
export const dynamic = "force-dynamic";
export async function pageFor(path: string) {
  const u = await requireChatGPTUser(path);
  return (
    <Album
      initialPath={path}
      initialRows={await rows(u.userId)}
      owner={u.userId}
    />
  );
}
export default function Home() {
  return pageFor("/");
}
