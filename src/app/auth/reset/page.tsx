"use client"

import { useState, useRef, useEffect, useActionState } from "react"
import Link from "next/link"
import { useFormStatus } from "react-dom"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import { resetPasswordAction } from "@/lib/actions/auth"
import ThemeToggle from "@/components/ThemeToggle"
import styles from "../auth.module.css"

function SubmitBtn({ label, pendingLabel, disabled }: { label: string; pendingLabel: string; disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={styles.submit} disabled={pending || disabled}>
      {pending ? pendingLabel : label}
    </button>
  )
}

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)

  const [blurErrors, setBlurErrors] = useState<Record<string, string>>({})
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({})
  const [bannerError, setBannerError] = useState("")

  const [resetState, resetFormAction] = useActionState(resetPasswordAction, { ok: false })

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const tok = params.get("token")
      setToken(tok)
      setLoading(false)
    }
  }, [])

  // Handle server resetState changes
  const [prevResetState, setPrevResetState] = useState(resetState)
  if (resetState !== prevResetState) {
    setPrevResetState(resetState)
    setServerErrors(resetState.errors || {})
    const formError = resetState.errors?._form?.[0]
    const pwdError = resetState.errors?.password?.[0]
    if (formError) {
      setBannerError(formError)
    } else if (pwdError) {
      setBannerError(pwdError)
    }
  }

  function togglePassword() {
    setShowPassword((p) => !p)
    setTimeout(() => passwordRef.current?.focus(), 0)
  }

  // Password requirements client-side validation
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const allReqsMet = hasMinLength && hasUppercase && hasLowercase && hasNumber

  if (loading) {
    return (
      <div className={styles.page} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--color-on-surface-variant)" }}>Loading...</p>
      </div>
    )
  }

  if (!token) {
    return (
      <div className={styles.page}>
        <div className={styles.formWrapper}>
          <div className={styles.card}>
            <div className={styles.header}>
              <Link className={styles.logo} href="/">Duesly</Link>
              <h1 className={styles.title}>Invalid Link</h1>
              <p className={styles.subtitle} style={{ marginBottom: 24 }}>
                This password reset link is missing a validation token.
              </p>
              <Link href="/auth" className={styles.submit} style={{ textDecoration: "none" }}>
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 2 }}>
        <ThemeToggle />
      </div>

      <div className={styles.formWrapper}>
        <div className={styles.card}>
          <div className={styles.header}>
            <Link className={styles.logo} href="/">Duesly</Link>
            <h1 className={styles.title}>Choose new password</h1>
            <p className={styles.subtitle}>Enter your new password below.</p>
          </div>

          <form className={styles.form} action={resetFormAction} noValidate>
            <div
              className={styles.bannerError}
              role="alert"
              data-visible={!!bannerError}
              aria-hidden={!bannerError}
              style={bannerError ? {} : { display: "none" }}
            >
              {bannerError}
            </div>

            <input type="hidden" name="token" value={token} />

            <label className={styles.field} htmlFor="reset-password">
              <span className={styles.label}>New Password</span>
              <div className={styles.passwordInput}>
                <input
                  required
                  autoComplete="new-password"
                  className={`${styles.input}${(serverErrors.password || blurErrors.password) ? ` ${styles.inputError}` : ""}`}
                  placeholder="Enter new password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  id="reset-password"
                  value={password}
                  ref={passwordRef}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (blurErrors.password) setBlurErrors((prev) => ({ ...prev, password: "" }))
                    if (serverErrors.password) setServerErrors((prev) => {
                      const copy = { ...prev }
                      delete copy.password
                      return copy
                    })
                    if (bannerError) setBannerError("")
                  }}
                  onBlur={() => {
                    if (!password) {
                      setBlurErrors((prev) => ({ ...prev, password: "Please fill in the details" }))
                    }
                  }}
                  aria-invalid={!!(serverErrors.password || blurErrors.password)}
                  aria-describedby={(serverErrors.password || blurErrors.password) ? "reset-password-error" : undefined}
                  autoFocus
                />
                <button type="button" className={styles.passwordToggle} onClick={togglePassword} tabIndex={-1}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Requirement indicators */}
              <ul className={styles.reqList} style={{ marginTop: 12, gap: 6 }}>
                <li className={styles.reqItem} style={{ color: hasMinLength ? "var(--success)" : "var(--color-on-surface-variant)", opacity: hasMinLength ? 1 : 0.6 }}>
                  <span style={{ marginRight: 6 }}>{hasMinLength ? "✓" : "○"}</span>
                  At least 8 characters
                </li>
                <li className={styles.reqItem} style={{ color: hasUppercase ? "var(--success)" : "var(--color-on-surface-variant)", opacity: hasUppercase ? 1 : 0.6 }}>
                  <span style={{ marginRight: 6 }}>{hasUppercase ? "✓" : "○"}</span>
                  One uppercase letter
                </li>
                <li className={styles.reqItem} style={{ color: hasLowercase ? "var(--success)" : "var(--color-on-surface-variant)", opacity: hasLowercase ? 1 : 0.6 }}>
                  <span style={{ marginRight: 6 }}>{hasLowercase ? "✓" : "○"}</span>
                  One lowercase letter
                </li>
                <li className={styles.reqItem} style={{ color: hasNumber ? "var(--success)" : "var(--color-on-surface-variant)", opacity: hasNumber ? 1 : 0.6 }}>
                  <span style={{ marginRight: 6 }}>{hasNumber ? "✓" : "○"}</span>
                  One number
                </li>
              </ul>
            </label>

            <SubmitBtn label="Reset Password" pendingLabel="Resetting..." disabled={!allReqsMet} />
          </form>

          <p className={styles.switchText}>
            <Link href="/auth" className={styles.switchLink}>
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
