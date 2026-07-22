import { PageContent } from "@/components/page-content";
import { PageSkeleton } from "@/components/page-skeleton";

export default function CampaignDetailLoading() {
  return (
    <PageContent>
      <PageSkeleton variant="detail" />
    </PageContent>
  );
}
