import { pageFor } from "../page";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  return pageFor("/" + (await params).path.join("/"));
}
