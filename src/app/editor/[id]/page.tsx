import { notFound } from "next/navigation";
import { getSite } from "@/lib/db";
import Editor from "@/components/Editor";

export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const spec = await getSite(id);
  if (!spec) notFound();
  return <Editor initial={spec} />;
}
