"use client"

import { useEffect } from "react"

const PAID_RATIO = 31 / 40

export default function LandingAnimations() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          const el = e.target as HTMLElement

          el.classList.add("in")

          el.querySelectorAll<SVGCircleElement>('circle[class*="ring-fill"]').forEach((ring) => {
            const c = 2 * Math.PI * 42
            ring.style.strokeDasharray = String(c)
            if (reduce) {
              ring.style.transition = "none"
              ring.style.strokeDashoffset = String(c * (1 - PAID_RATIO))
            } else {
              ring.style.strokeDashoffset = String(c)
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  ring.style.strokeDashoffset = String(c * (1 - PAID_RATIO))
                })
              )
            }
          })

          el.querySelectorAll<HTMLElement>('[class*="dash-bar"] i').forEach((bar) => {
            const w = bar.dataset.w || "0%"
            if (reduce) {
              bar.style.transition = "none"
              bar.style.width = w
            } else {
              requestAnimationFrame(() => {
                bar.style.width = w
              })
            }
          })

          io.unobserve(el)
        })
      },
      { threshold: 0.2 }
    )

    document.querySelectorAll(".reveal").forEach((el) => io.observe(el))

    const countEl = document.getElementById("ringCount")
    if (countEl) {
      const target = 31
      if (reduce) {
        countEl.textContent = String(target)
      } else {
        const cio = new IntersectionObserver(
          (es) => {
            es.forEach((en) => {
              if (!en.isIntersecting) return
              const start = performance.now()
              const dur = 1300
              const tick = (t: number) => {
                const p = Math.min((t - start) / dur, 1)
                countEl.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))))
                if (p < 1) requestAnimationFrame(tick)
              }
              requestAnimationFrame(tick)
              cio.disconnect()
            })
          },
          { threshold: 0.3 }
        )
        cio.observe(countEl)
      }
    }

    return () => io.disconnect()
  }, [])

  return null
}
