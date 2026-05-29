"use client"

import { Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CardAction } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface CardInfoTooltipProps {
  label: string
  content: string
}

export function CardInfoTooltip({ label, content }: CardInfoTooltipProps) {
  return (
    <CardAction>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label={label}
            className="-me-2 -mt-2 size-8 text-muted-foreground hover:text-foreground"
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Info className="h-4 w-4" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent align="end" className="max-w-64 leading-relaxed" side="top" sideOffset={6}>
          {content}
        </TooltipContent>
      </Tooltip>
    </CardAction>
  )
}
