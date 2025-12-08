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
              <Skeleton className="h-4 w-64 mt-1" /> {/* Subtitle */}
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" /> {/* Filter button */}
            <Skeleton className="h-9 w-32" /> {/* Add Task button */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Breadcrumb */}
        <Skeleton className="h-5 w-40 mb-6" />

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-48" /> {/* Search */}
          <Skeleton className="h-10 w-32" /> {/* Status */}
          <Skeleton className="h-10 w-32" /> {/* Priority */}
          <Skeleton className="h-10 w-32" /> {/* Due soon */}
        </div>

        {/* Task Cards */}
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <Skeleton className="h-5 w-5 rounded" /> {/* Checkbox */}
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-2/3" /> {/* Task title */}
                    <Skeleton className="h-4 w-1/2" /> {/* Description */}
                    <div className="flex gap-2 mt-2">
                      <Skeleton className="h-5 w-16" /> {/* Priority badge */}
                      <Skeleton className="h-5 w-20" /> {/* Due date */}
                      <Skeleton className="h-5 w-24" /> {/* Client */}
                    </div>
                  </div>
                </div>
                <Skeleton className="h-8 w-8" /> {/* Menu button */}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
