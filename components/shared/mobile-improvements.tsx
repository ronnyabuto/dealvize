"use client"

import { cn } from "@/lib/utils"

// Enhanced button component with better touch targets for mobile
export function TouchFriendlyButton({ 
  children, 
  className, 
  size = "default",
  ...props 
}: {
  children: React.ReactNode
  className?: string
  size?: "sm" | "default" | "lg"
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizeClasses = {
    sm: "h-10 px-3 text-sm", // Minimum 44px touch target
    default: "h-11 px-4", // Standard 44px+ touch target
    lg: "h-12 px-6 text-lg" // Larger touch target
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "touch-manipulation", // Improves touch responsiveness
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// Enhanced input with better mobile interaction
export function MobileInput({ 
  className, 
  ...props 
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base",
        "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        "touch-manipulation", // Better touch interaction
        "sm:text-sm", // Smaller text on larger screens
        className
      )}
      {...props}
    />
  )
}

// Mobile-optimized card layout
export function MobileCard({ 
  children, 
  className, 
  ...props 
}: {
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        "mx-2 sm:mx-4", // Smaller margins on mobile
        "p-4 sm:p-6", // Responsive padding
        "touch-manipulation",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Mobile navigation helper
export function MobileNavItem({ 
  children, 
  className, 
  active = false,
  ...props 
}: {
  children: React.ReactNode
  className?: string
  active?: boolean
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center space-x-3 rounded-lg px-3 py-3 text-sm font-medium",
        "hover:bg-accent hover:text-accent-foreground cursor-pointer",
        "transition-colors touch-manipulation",
        "min-h-[44px]", // Ensure minimum touch target
        active && "bg-accent text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}