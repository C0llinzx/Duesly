"use client"

import { useEffect, useState } from "react"

interface Props {
  className?: string
  size?: number
}

export default function Logo({ className, size = 20 }: Props) {
  const [theme, setTheme] = useState<"light" | "dark">("dark")

  useEffect(() => {
    function read() {
      const t = document.documentElement.getAttribute("data-theme")
      setTheme(t === "light" ? "light" : "dark")
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })
    return () => observer.disconnect()
  }, [])

  const src =
    theme === "dark"
      ? "/brand/duesly-mark-dark.svg"
      : "/brand/duesly-mark-light.svg"

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Duesly"
      width={size}
      height={size}
      className={className}
      style={{ display: "block" }}
    />
  )
}
