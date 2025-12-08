import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50/50 overflow-auto">
      {/* Header Skeleton */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-6" /> {/* SidebarTrigger */}
            <div>
              <Skeleton className="h-8 w-24" /> {/* Title */}
              <Skeleton className="h-4 w-56 mt-1" /> {/* Subtitle */}
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" /> {/* Filter button */}
            <Skeleton className="h-9 w-32" /> {/* Add Deal button */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Breadcrumb */}
        <Skeleton className="h-5 w-40 mb-6" />

        {/* View Toggle and Smart Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-20 w-64" />
              <Skeleton className="h-20 w-64" />
              <Skeleton className="h-20 w-64" />
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            <Skeleton className="h-9 w-24" /> {/* Board button */}
            <Skeleton className="h-9 w-24" /> {/* List button */}
          </div>
        </div>

        {/* Pipeline/Board View Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, colIndex) => (
            <div key={colIndex} className="space-y-3">
              <Skeleton className="h-10 w-full" /> {/* Column header */}
              {Array.from({ length: 3 }).map((_, cardIndex) => (
                <div key={cardIndex} className="bg-white rounded-lg border p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" /> {/* Deal title */}
                  <Skeleton className="h-4 w-1/2" /> {/* Value */}
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-16" /> {/* Status badge */}
                    <Skeleton className="h-4 w-12" /> {/* Probability */}
                  </div>
                  <Skeleton className="h-3 w-full" /> {/* Progress bar */}
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
