'use client'

import React from 'react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface HoverInfoProps {
  content: React.ReactNode
  contentClassName?: string
  children: React.ReactNode
}

export function HoverInfo({ content, contentClassName, children }: HoverInfoProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>{children}</span>
      </TooltipTrigger>
      <TooltipContent className={contentClassName} sideOffset={6}>
        <div className="relative max-w-xs">
          <div
            className="max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-muted"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="whitespace-normal text-sm leading-relaxed">{content}</div>
          </div>
          <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-6 bg-gradient-to-t from-foreground/90 to-transparent" />
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export default HoverInfo
