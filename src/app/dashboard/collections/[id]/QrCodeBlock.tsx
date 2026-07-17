"use client"

import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"
import { Download, Printer, ChevronDown, ChevronUp } from "lucide-react"
import d from "../../mevolut.module.css"

interface QrCodeBlockProps {
  paymentLink: string
  levyName: string
  amount: string
  dueDate: string
  estateName: string
}

export default function QrCodeBlock({ paymentLink, levyName, amount, dueDate, estateName }: QrCodeBlockProps) {
  const [expanded, setExpanded] = useState(false)
  const [svgMarkup, setSvgMarkup] = useState<string>("")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const posterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    QRCode.toString(paymentLink, {
      type: "svg",
      width: 256,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(setSvgMarkup)
  }, [paymentLink])

  function downloadPng() {
    const size = 1024
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      const link = document.createElement("a")
      link.download = `${levyName.replace(/\s+/g, "-").toLowerCase()}-qr.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    }
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgMarkup)))
  }

  function downloadSvg() {
    const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.download = `${levyName.replace(/\s+/g, "-").toLowerCase()}-qr.svg`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  function handlePrint() {
    window.print()
  }

  return (
    <>
      {/* ─── QR Block (collapsible banner) ─── */}
      <div className={`${d.detailShareSection} ${d.qrBlock}`}>
        <button
          className={d.qrToggle}
          onClick={() => setExpanded((p) => !p)}
          aria-expanded={expanded}
        >
          <div className={d.detailShareLabel} style={{ margin: 0 }}>QR Code</div>
          {expanded ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}
        </button>

        {expanded && (
          <div className={d.qrContent}>
            <div className={d.qrVisual}>
              <div className={d.qrFrame} role="img" aria-label={`QR code for ${levyName} payment`}>
                {svgMarkup ? (
                  <div dangerouslySetInnerHTML={{ __html: svgMarkup }} />
                ) : (
                  <div className={d.qrPlaceholder} />
                )}
              </div>
              <div className={d.qrMeta}>
                <span className={d.qrLevyName}>{levyName}</span>
                <span className={d.qrAmount}>{amount}</span>
                <span className={d.qrCta}>Scan to pay</span>
              </div>
            </div>

            <div className={d.qrActions}>
              <button type="button" onClick={downloadPng} className={d.qrActionBtn} disabled={!svgMarkup}>
                <Download size={13} strokeWidth={2} />
                PNG
              </button>
              <button type="button" onClick={downloadSvg} className={d.qrActionBtn} disabled={!svgMarkup}>
                <Download size={13} strokeWidth={2} />
                SVG
              </button>
              <button type="button" onClick={handlePrint} className={`${d.qrActionBtn} ${d.qrActionPrimary}`}>
                <Printer size={13} strokeWidth={2} />
                Print poster
              </button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} hidden />
      </div>

      {/* ─── Print poster (hidden off-screen, shown via @media print) ─── */}
      <div className={d.qrPosterWrap} ref={posterRef} aria-hidden="true">
        <div className={d.qrPoster}>
          <div className={d.qrPosterEstate}>{estateName}</div>
          <h1 className={d.qrPosterTitle}>{levyName}</h1>

          <div className={d.qrPosterCode}>
            {svgMarkup && (
              <div dangerouslySetInnerHTML={{ __html: svgMarkup }} />
            )}
          </div>

          <p className={d.qrPosterScan}>Scan to pay your {levyName}</p>
          <p className={d.qrPosterAmount}>{amount}</p>
          <p className={d.qrPosterDue}>Due {dueDate}</p>
          <p className={d.qrPosterInstruction}>
            Scan with your phone camera, find your house, and pay.
          </p>

          <div className={d.qrPosterFooter}>
            Powered by <strong>Duesly</strong>
          </div>
        </div>
      </div>
    </>
  )
}
