'use client'

import { useCommandPalette } from '@/components/superadmin/command-palette'

interface SuperAdminWrapperProps {
  children: React.ReactNode
}

export function SuperAdminWrapper({ children }: SuperAdminWrapperProps) {
  const { CommandPaletteComponent } = useCommandPalette()

  return (
    <>
      {children}
      <CommandPaletteComponent />
    </>
  )
}