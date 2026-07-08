"use client"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { LucideIcon } from "lucide-react"

interface ActionButtonProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
  variant?: "ghost" | "destructive"
  className?: string
  disabled?: boolean
}

export function ActionButton({ icon: Icon, label, onClick, variant = "ghost", className, disabled }: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size="icon"
          onClick={onClick}
          className={className}
          disabled={disabled}
        >
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
