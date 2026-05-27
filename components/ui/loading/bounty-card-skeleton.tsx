import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";

export function BountyCardSkeleton() {
  return (
    <Card className="overflow-hidden w-full max-w-sm h-full rounded-lg">
      <CardHeader className="pb-4 px-5 pt-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-2 h-2 rounded-full bg-gray-800" />
            <Skeleton className="h-5 w-14 rounded-full bg-gray-800" />
          </div>
          <div className="text-right">
            <Skeleton className="h-5 w-16 bg-gray-800" />
            <Skeleton className="h-3 w-10 ml-auto bg-gray-800" />
          </div>
        </div>
        <Skeleton className="h-5 w-full mb-1 bg-gray-800" />
        <Skeleton className="h-4 w-3/4 bg-gray-800" />
        <div className="flex flex-wrap gap-2 mt-3">
          <Skeleton className="h-6 w-16 rounded-full bg-gray-800" />
          <Skeleton className="h-6 w-20 rounded-full bg-gray-800" />
        </div>
      </CardHeader>
      <CardFooter className="border-t border-[#f0f0f0] dark:border-slate-700 py-3 px-5">
        <div className="flex items-center gap-2 w-full justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full bg-gray-800" />
            <Skeleton className="h-4 w-20 bg-gray-800" />
          </div>
          <Skeleton className="h-4 w-16 bg-gray-800" />
        </div>
      </CardFooter>
    </Card>
  );
}

export function BountyListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
      {Array.from({ length: count }).map((_, i) => (
        <BountyCardSkeleton key={i} />
      ))}
    </div>
  );
}
