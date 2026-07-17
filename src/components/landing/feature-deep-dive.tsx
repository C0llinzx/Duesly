import { ReactNode } from "react"
import { Check } from "lucide-react"
import s from "../../../docs/design/landing.module.css"

interface FeatureDeepDiveProps {
  step: string
  title: string
  description: string
  points: string[]
  stageClass: string
  reverse?: boolean
  children: ReactNode
}

export default function FeatureDeepDive({
  step,
  title,
  description,
  points,
  stageClass,
  reverse,
  children,
}: FeatureDeepDiveProps) {
  return (
    <div className={`${s.feature} reveal${reverse ? ` ${s.reverse}` : ""}`}>
      <div className={s["feature-text"]}>
        <p className={s["feature-step"]}>{step}</p>
        <h2>{title}</h2>
        <p>{description}</p>
        <ul className={s["feature-points"]}>
          {points.map((point, i) => (
            <li key={i}>
              <Check size={15} />
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div className={`${s["feature-stage"]} ${s[stageClass]}`}>
        <div className={s["feature-visual"]}>
          {children}
        </div>
      </div>
    </div>
  )
}
