import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50/50 overflow-auto">
      {/* Header Skeleton */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-6" /> {/* SidebarTrigger */}
          <div>
            <Skeleton className="h-8 w-32" /> {/* Title */}
            <Skeleton className="h-4 w-56 mt-1" /> {/* Subtitle */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Email History Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" /> {/* Section title */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-5 w-40" /> {/* Subject */}
                  <Skeleton className="h-5 w-16" /> {/* Status badge */}
                </div>
                <Skeleton className="h-4 w-32" /> {/* Email address */}
                <Skeleton className="h-4 w-full" /> {/* Preview */}
                <Skeleton className="h-3 w-24" /> {/* Date */}
              </div>
            ))}
          </div>

          {/* SMS History Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" /> {/* Section title */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-5 w-32" /> {/* Phone number */}
                  <Skeleton className="h-5 w-16" /> {/* Status badge */}
                </div>
                <Skeleton className="h-4 w-full" /> {/* Message */}
                <Skeleton className="h-3 w-24" /> {/* Date */}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
