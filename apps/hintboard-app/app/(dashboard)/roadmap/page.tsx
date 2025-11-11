import { RoadmapView } from "@/features/roadmap/roadmap-view";
import { RoadmapService } from "@hintboard/supabase/services";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function RoadmapPage() {
  const headersList = await headers();
  const organizationId = headersList.get("x-organization-id");

  if (!organizationId) {
    redirect("/");
  }

  // Fetch data using organizationId
  const roadmapData = await RoadmapService.getRoadmapData(
    organizationId,
    "server",
  );

  return (
    <RoadmapView initialData={roadmapData} organizationId={organizationId} />
  );
}
