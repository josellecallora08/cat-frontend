import { PageContent } from "@/components/page-content";
import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageContent>
      <PageSkeleton variant="list" count={5} />
    </PageContent>
  );
}
