'use client'

import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface MeteorsProps {
  number?: number
}

export const Meteors = ({ number = 20 }: MeteorsProps) => {
  const [meteors, setMeteors] = useState<Array<{ top: string; left: string; delay: string; duration: string }>>([])

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const meteorArray = Array.from({ length: number }, () => ({
        top: Math.floor(Math.random() * window.innerHeight) + "px",
        left: Math.floor(Math.random() * window.innerWidth) + "px",
        delay: Math.random() * (0.8 - 0.2) + 0.2 + "s",
        duration: Math.floor(Math.random() * (10 - 2) + 2) + "s",
      }))
      setMeteors(meteorArray)
    }
  }, [flnumber])

  if (meteors.length === 0) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {meteors.map((meteor, idx) => (
        <span
          key={"meteor" + idx}
          className={cn(
            "animate-meteor-effect absolute h-0.5 w-0.5 rounded-[9999px] bg-slate-400 shadow-[0_0_0_1px_#ffffff10] rotate-[215deg]",
            "before:content-[''] before:absolute before:top-1/2 before:transform before:-translate-y-[50%] before:w-[50px] before:h-[1px] before:bg-gradient-to-r before:from-[#64748b] before:to-transparent"
          )}
          style={{
            top: meteor.top,
            left: meteor.left,
            animationDelay: meteor.delay,
            animationDuration: meteor.duration,
          }}
        ></span>
      ))}
    </div>
  )
}