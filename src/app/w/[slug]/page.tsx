import { WorkspaceView } from "@/components/WorkspaceView";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <WorkspaceView slug={slug} />;
}
