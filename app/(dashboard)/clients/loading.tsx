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
              <Skeleton className="h-8 w-32" /> {/* Title */}
              <Skeleton className="h-4 w-48 mt-1" /> {/* Subtitle */}
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" /> {/* Filter button */}
            <Skeleton className="h-9 w-32" /> {/* Add Client button */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Breadcrumb */}
        <Skeleton className="h-5 w-40 mb-6" />

        {/* Search and Filters */}
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-10 w-64" /> {/* Search */}
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" /> {/* Status filter */}
            <Skeleton className="h-10 w-32" /> {/* Sort */}
          </div>
        </div>

        {/* Client Cards */}
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <Skeleton className="h-12 w-12 rounded-full" /> {/* Avatar */}
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-40" /> {/* Name */}
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-48" /> {/* Email */}
                      <Skeleton className="h-4 w-32" /> {/* Phone */}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Skeleton className="h-5 w-16" /> {/* Badge */}
                      <Skeleton className="h-5 w-24" /> {/* Last contact */}
                    </div>
                  </div>
                </div>
                <Skeleton className="h-8 w-8" /> {/* Menu button */}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </main>
    </div>
  )
}
