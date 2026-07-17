import d from "./dashboard.module.css"

export default function DashboardLoading() {
  return (
    <div className={d.page}>
      <div className={d.greetingArea}>
        <div
          style={{
            width: "40%",
            height: 24,
            background: "var(--surface-elevated)",
            borderRadius: 6,
            marginBottom: 8,
          }}
        />
        <div
          style={{
            width: "55%",
            height: 16,
            background: "var(--surface-elevated)",
            borderRadius: 4,
          }}
        />
      </div>

      <div className={d.statGrid}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={d.statCard}>
            <div
              style={{
                width: "50%",
                height: 10,
                background: "var(--surface-elevated)",
                borderRadius: 4,
                marginBottom: 8,
              }}
            />
            <div
              style={{
                width: "65%",
                height: 28,
                background: "var(--surface-elevated)",
                borderRadius: 6,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
