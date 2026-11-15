import { CardSkeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/ui/page-skeletons";

export default function ParentLinkStudentLoading() {
  return (
    <div className="space-y-6 p-6">
      <PageHeaderSkeleton showActions showDescription actionCount={1} />
      <CardSkeleton showHeader showContent contentLines={4} />
      <CardSkeleton showHeader showContent contentLines={8} />
    </div>
  );
}