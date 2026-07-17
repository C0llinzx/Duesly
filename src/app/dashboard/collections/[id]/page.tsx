import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight, MessageCircle } from "lucide-react"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { formatNaira } from "@/lib/money"
import { getFeeDisplay } from "@/lib/fees"
import { whatsappDeepLink, paymentReminderMessage } from "@/lib/whatsapp"
import ShareActions from "./ShareActions"
import DetailActions from "./DetailActions"
import QrCodeBlock from "./QrCodeBlock"
import d from "../../mevolut.module.css"

interface AssignedUnit {
  id: string
  label: string
  residentName: string | null
  phone1: string | null
  status: string
  occupancyType: string | null
  payments: { status: string; paidAt: Date | null; method: string | null }[]
}

interface ZoneWithUnits {
  id: string
  name: string
  units: AssignedUnit[]
}

const SMALL_RING_R = 10
const SMALL_RING_C = 2 * Math.PI * SMALL_RING_R

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect("/auth")

  const { id } = await params

  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      estate: {
        include: {
          zones: {
            include: {
              units: {
                where: { status: { not: "inactive" } },
                include: {
                  payments: {
                    where: { collectionId: id },
                  },
                },
                orderBy: { label: "asc" },
              },
            },
            orderBy: { name: "asc" },
          },
        },
      },
      payments: {
        where: { status: "success" },
        select: { unitId: true, paidAt: true },
      },
    },
  })

  if (!collection) return <div>Collection not found</div>

  const estateAdmin = await prisma.user.findUnique({ where: { id: collection.estate.adminId } })
  if (session.userId !== estateAdmin?.id) return <div>Unauthorized</div>

  const paidUnitIds = new Set(collection.payments.map((p) => p.unitId))
  const allUnits = collection.estate.zones.flatMap((z) => z.units)
  const totalUnits = allUnits.length
  const totalPaid = collection.payments.length
  const totalOwing = totalUnits - totalPaid
  const amountCollected = collection.payments.length * collection.amountKobo
  const totalExpected = totalUnits * collection.amountKobo
  const zoneCount = collection.estate.zones.length

  const paymentLink = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/pay/${collection.slug}`
  const overdue = new Date(collection.dueDate) < new Date() && totalOwing > 0
  const ratio = totalUnits > 0 ? totalPaid / totalUnits : 0

  const owingUnits = allUnits
    .filter((u) => !paidUnitIds.has(u.id) && u.status !== "inactive")
    .map((u) => ({ id: u.id, label: u.label, residentName: u.residentName, phone1: u.phone1, residentEmail: u.residentEmail }))

  const shareMsg = paymentReminderMessage({
    estateName: collection.estate.name,
    collectionTitle: collection.title,
    amount: formatNaira(collection.amountKobo),
    dueDate: new Date(collection.dueDate).toLocaleDateString("en-NG"),
    unitLabel: "",
    paymentLink,
  })

  return (
    <div className={d.mainArea}>
      {/* Breadcrumb */}
      <nav className={d.detailBreadcrumb}>
        <Link href="/dashboard/collections" className={d.detailBreadcrumbLink}>Dues</Link>
        <ChevronRight size={12} strokeWidth={2} />
        <span className={d.detailBreadcrumbCurrent}>{collection.title}</span>
      </nav>

      {/* ─── Hero / Confirmation ─── */}
      <div className={d.detailHero}>
        <div className={d.detailHeroInfo}>
          <h1 className={d.detailHeroTitle}>{collection.title}</h1>
          <div className={d.detailChipRow}>
            <span className={`${d.detailChip} ${d.detailChipStrong}`}>{formatNaira(collection.amountKobo)}</span>
            <span className={d.detailChip}>{totalUnits} house{totalUnits !== 1 ? "s" : ""}</span>
            <span className={d.detailChip}>{zoneCount} zone{zoneCount !== 1 ? "s" : ""}</span>
            <span className={d.detailChip}>Due {new Date(collection.dueDate).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
            {overdue && <span className={d.detailChipOverdue}>Overdue</span>}
          </div>
          <p className={d.detailHeroExpected}>
            {formatNaira(totalExpected)} expected if all houses pay
          </p>
        </div>
        <DetailActions
          collectionId={collection.id}
          collectionTitle={collection.title}
          estateName={collection.estate.name}
          amount={formatNaira(collection.amountKobo)}
          dueDate={new Date(collection.dueDate).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
          paymentLink={paymentLink}
          owingUnits={owingUnits}
        />
      </div>

      {/* ─── Fee disclosure ─── */}
      <p className={d.detailFeeDisclosure}>{getFeeDisplay().description}</p>

      {/* ─── Stats ─── */}
      <div className={d.detailStatGrid}>
        <div className={d.detailStatCard}>
          <span className={d.detailStatLabel}>Collected</span>
          <span className={d.detailStatValue}>{formatNaira(amountCollected)}</span>
          <span className={d.detailStatSupport}>{totalExpected > 0 ? Math.round((amountCollected / totalExpected) * 100) : 0}% of target</span>
        </div>
        <div className={d.detailStatCard}>
          <span className={d.detailStatLabel}>Outstanding</span>
          <span className={d.detailStatValue}>{formatNaira(totalExpected - amountCollected)}</span>
          <span className={d.detailStatSupport}>{totalExpected > 0 ? Math.round(((totalExpected - amountCollected) / totalExpected) * 100) : 0}% remaining</span>
        </div>
        <div className={d.detailStatCard}>
          <span className={d.detailStatLabel}>Paid</span>
          <div className={d.detailStatValueRow}>
            <span className={d.detailStatValue}>{totalPaid}</span>
            <svg className={d.detailStatRing} viewBox="0 0 24 24" aria-hidden="true">
              <circle className={d.detailStatRingTrack} cx="12" cy="12" r={SMALL_RING_R} />
              <circle
                className={d.detailStatRingFill}
                cx="12" cy="12" r={SMALL_RING_R}
                style={{ strokeDashoffset: SMALL_RING_C * (1 - ratio) }}
              />
            </svg>
          </div>
          <span className={d.detailStatSupport}>{totalPaid} of {totalUnits} houses</span>
        </div>
        <div className={d.detailStatCard}>
          <span className={d.detailStatLabel}>Owing</span>
          <span className={d.detailStatValue}>{totalOwing}</span>
          <span className={d.detailStatSupport}>
            {totalOwing > 0 && <span className={d.detailStatSupportDot} />}
            {totalOwing > 0 ? `${totalOwing} house${totalOwing !== 1 ? 's' : ''} to collect` : 'All paid'}
          </span>
        </div>
      </div>

      {/* ─── Share / Payment Link ─── */}
      <div className={d.detailShareSection}>
        <div className={d.detailShareLabel}>Payment link</div>
        <ShareActions paymentLink={paymentLink} shareMessage={shareMsg} />
      </div>

      {/* ─── QR Code (collapsible, default collapsed) ─── */}
      <QrCodeBlock
        paymentLink={paymentLink}
        levyName={collection.title}
        amount={formatNaira(collection.amountKobo)}
        dueDate={new Date(collection.dueDate).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
        estateName={collection.estate.name}
      />

      {/* ─── Zone-by-zone units table ─── */}
      <h2 className={d.detailUnitsTitle}>Units</h2>
      {collection.estate.zones.map((zone: ZoneWithUnits) => {
        const zonePaid = zone.units.filter((u) => paidUnitIds.has(u.id)).length
        const zoneTotal = zone.units.length
        return (
          <div key={zone.id} className={d.detailZoneSection}>
            <div className={d.detailZoneHeader}>
              <h3 className={d.detailZoneName}>{zone.name}</h3>
              {zoneTotal > 0 && (
                <span className={d.detailZoneCount}>{zonePaid} of {zoneTotal} paid</span>
              )}
            </div>
            <table className={d.detailTable}>
              <thead>
                <tr>
                  <th className={d.detailTh}>Unit</th>
                  <th className={d.detailTh}>Resident</th>
                  <th className={d.detailTh}>Phone</th>
                  <th className={d.detailTh}>Status</th>
                  <th className={d.detailTh} />
                </tr>
              </thead>
              <tbody>
                {zone.units.map((unit: AssignedUnit) => {
                  const isPaid = paidUnitIds.has(unit.id)
                  const isExempt = unit.status === "exempt"
                  const isAbsentee = unit.occupancyType === "owner" && !unit.phone1

                  return (
                    <tr key={unit.id} className={d.detailTr}>
                      <td className={d.detailTd}>
                        <span className={d.detailUnitLabel}>{unit.label}</span>
                        {isAbsentee && <span className={d.detailNoPhone}>No phone</span>}
                      </td>
                      <td className={d.detailTd}>{unit.residentName ?? <span className={d.detailMuted}>—</span>}</td>
                      <td className={d.detailTd}>{unit.phone1 ?? <span className={d.detailMuted}>—</span>}</td>
                      <td className={d.detailTd}>
                        {isExempt ? (
                          <span className={d.detailBadgeExempt}>Exempt</span>
                        ) : (
                          <span className={isPaid ? d.detailBadgePaid : d.detailBadgeOwing}>
                            {isPaid ? "Paid" : "Owing"}
                          </span>
                        )}
                      </td>
                      <td className={d.detailTd}>
                        {!isPaid && !isExempt && unit.phone1 && (
                          <a
                            href={whatsappDeepLink(unit.phone1, paymentReminderMessage({
                              estateName: collection.estate.name,
                              collectionTitle: collection.title,
                              amount: formatNaira(collection.amountKobo),
                              dueDate: new Date(collection.dueDate).toLocaleDateString("en-NG"),
                              unitLabel: unit.label,
                              paymentLink,
                            }))}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={d.detailWhatsAppBtn}
                            title="Send WhatsApp reminder"
                          >
                            <MessageCircle size={13} strokeWidth={1.75} />
                          </a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
