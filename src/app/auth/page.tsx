"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import { loginAction, signupAction } from "@/lib/actions/auth"
import ThemeToggle from "@/components/ThemeToggle"
import styles from "./auth.module.css"

type Mode = "signup" | "login" | "forgot"

function SubmitBtn({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={styles.submit} disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  )
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("signup")
  const [step, setStep] = useState(1)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [estateName, setEstateName] = useState("")
  const [password, setPassword] = useState("")

  const [showPassword, setShowPassword] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)

  const [loginBanner, setLoginBanner] = useState("")
  const [loginBlurErrors, setLoginBlurErrors] = useState<Record<string, string>>({})
  const [signupBlurErrors, setSignupBlurErrors] = useState<Record<string, string>>({})
  const [step1BlurErrors, setStep1BlurErrors] = useState<Record<string, string>>({})

  const [loginServerErrors, setLoginServerErrors] = useState<Record<string, string[]>>({})
  const [serverErrors, setServerErrors] = useState<Record<string, string[]>>({})

  const [loginState, loginFormAction] = useActionState(loginAction, { ok: false })
  const [signupState, signupFormAction] = useActionState(signupAction, { ok: false })
  const [signupBanner, setSignupBanner] = useState("")

  const [prevLoginState, setPrevLoginState] = useState(loginState)
  if (loginState !== prevLoginState) {
    setPrevLoginState(loginState)
    setLoginServerErrors(loginState.errors || {})
    const formError = loginState.errors?._form?.[0]
    if (formError) {
      setLoginBanner(formError)
    }
  }

  const [prevSignupState, setPrevSignupState] = useState(signupState)
  if (signupState !== prevSignupState) {
    setPrevSignupState(signupState)
    setServerErrors(signupState.errors || {})
    const formError = signupState.errors?._form?.[0]
    const emailError = signupState.errors?.email?.[0]
    const nameError = signupState.errors?.name?.[0]

    if (formError) {
      setSignupBanner(formError)
    } else if (emailError) {
      setSignupBanner(emailError)
      setStep(1)
    } else if (nameError) {
      setSignupBanner(nameError)
      setStep(1)
    }
  }

  function clearLoginBanner() {
    if (loginBanner) setLoginBanner("")
  }

  function clearLoginBlurErrors() {
    setLoginBlurErrors({})
  }

  function handleContinue() {
    const s1 = name.trim()
    const s2 = email.trim()
    const errors: Record<string, string> = {}

    if (!s1) {
      errors.name = "Please fill in the details"
    }
    if (!s2) {
      errors.email = "Please fill in the details"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s2)) {
      errors.email = "Enter a valid email address"
    }

    if (Object.keys(errors).length > 0) {
      setStep1BlurErrors(errors)
      return
    }

    setStep(2)
  }

  function togglePassword() {
    setShowPassword((p) => !p)
    setTimeout(() => passwordRef.current?.focus(), 0)
  }

  const [forgotSent, setForgotSent] = useState(false)
  const [forgotSubmittedEmail, setForgotSubmittedEmail] = useState("")

  return (
    <div className={styles.page}>
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 2 }}>
        <ThemeToggle />
      </div>
      {mode === "signup" && step === 1 && (
        <div className={styles.formWrapper}>
          <div className={styles.card}>
            <div className={styles.header}>
              <Link className={styles.logo} href="/">Duesly</Link>
              <h1 className={styles.title}>Create Your Estate Account</h1>
              <p className={styles.subtitle}>Set up your estate in minutes</p>
            </div>

            <form className={styles.form} noValidate>
              <label className={styles.field} htmlFor="signup-name">
                <span className={styles.label}>Full name</span>
                <input
                  required
                  autoComplete="name"
                  className={`${styles.input}${(serverErrors.name || step1BlurErrors.name) ? ` ${styles.inputError}` : ""}`}
                  placeholder="Your name"
                  type="text"
                  name="name"
                  id="signup-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (step1BlurErrors.name) setStep1BlurErrors((prev) => ({ ...prev, name: "" }))
                    if (serverErrors.name) setServerErrors((prev) => {
                      const copy = { ...prev }
                      delete copy.name
                      return copy
                    })
                  }}
                  onBlur={() => {
                    if (!name.trim()) setStep1BlurErrors((prev) => ({ ...prev, name: "Please fill in the details" }))
                  }}
                  aria-invalid={!!(serverErrors.name || step1BlurErrors.name)}
                  aria-describedby={serverErrors.name || step1BlurErrors.name ? "signup-name-error" : undefined}
                  autoFocus
                />
                <span
                  id="signup-name-error"
                  className={styles.errorText}
                  role="alert"
                  data-visible={!!(serverErrors.name || step1BlurErrors.name)}
                  aria-hidden={!(serverErrors.name || step1BlurErrors.name)}
                >
                  <AlertCircle size={14} aria-hidden="true" />
                  {serverErrors.name?.[0] || step1BlurErrors.name || ""}
                </span>
              </label>

              <label className={styles.field} htmlFor="signup-email">
                <span className={styles.label}>Email</span>
                <input
                  required
                  autoComplete="email"
                  className={`${styles.input}${(serverErrors.email || step1BlurErrors.email) ? ` ${styles.inputError}` : ""}`}
                  placeholder="you@example.com"
                  type="email"
                  name="email"
                  id="signup-email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (step1BlurErrors.email) setStep1BlurErrors((prev) => ({ ...prev, email: "" }))
                    if (serverErrors.email) setServerErrors((prev) => {
                      const copy = { ...prev }
                      delete copy.email
                      return copy
                    })
                  }}
                  onBlur={() => {
                    if (!email.trim()) setStep1BlurErrors((prev) => ({ ...prev, email: "Please fill in the details" }))
                  }}
                  aria-invalid={!!(serverErrors.email || step1BlurErrors.email)}
                  aria-describedby={serverErrors.email || step1BlurErrors.email ? "signup-email-error" : undefined}
                />
                <span
                  id="signup-email-error"
                  className={styles.errorText}
                  role="alert"
                  data-visible={!!(serverErrors.email || step1BlurErrors.email)}
                  aria-hidden={!(serverErrors.email || step1BlurErrors.email)}
                >
                  <AlertCircle size={14} aria-hidden="true" />
                  {serverErrors.email?.[0] || step1BlurErrors.email || ""}
                </span>
              </label>

                <button type="button" className={styles.submit} onClick={handleContinue}>
                  Continue
                </button>
            </form>

            <p className={styles.switchText}>
              Already have an account?{" "}
              <button type="button" className={styles.switchLink} onClick={() => { setMode("login"); setStep(1); clearLoginBlurErrors() }}>Log in</button>
            </p>
          </div>
        </div>
      )}

      {mode === "signup" && step === 2 && (
        <div className={styles.formWrapper}>
          <div className={styles.card}>
            <div className={styles.header}>
              <Link className={styles.logo} href="/">Duesly</Link>
              <h1 className={styles.title}>Create Your Estate Account</h1>
              <p className={styles.subtitle}>Just one more step</p>
            </div>

            <form className={styles.form} action={signupFormAction} noValidate>
                <button type="button" className={styles.backTop} onClick={() => { setStep(1); setSignupBanner("") }}>
                  Back
                </button>

              <div
                className={styles.bannerError}
                role="alert"
                data-visible={!!signupBanner}
                aria-hidden={!signupBanner}
                style={signupBanner ? {} : { display: "none" }}
              >
                {signupBanner}
              </div>

              <input type="hidden" name="name" value={name} />
              <input type="hidden" name="email" value={email} />

              <label className={styles.field} htmlFor="signup-estate">
                <span className={styles.label}>Enter Estate Name</span>
                <input
                  required
                  autoComplete="organization"
                  className={`${styles.input}${(serverErrors.estateName || signupBlurErrors.estateName) ? ` ${styles.inputError}` : ""}`}
                  placeholder="e.g. Lekki Gardens Estate"
                  type="text"
                  name="estateName"
                  id="signup-estate"
                  value={estateName}
                  onChange={(e) => {
                    setEstateName(e.target.value)
                    if (signupBlurErrors.estateName) setSignupBlurErrors((prev) => ({ ...prev, estateName: "" }))
                    if (serverErrors.estateName) setServerErrors((prev) => {
                      const copy = { ...prev }
                      delete copy.estateName
                      return copy
                    })
                  }}
                  onBlur={() => {
                    if (!estateName.trim()) {
                      setSignupBlurErrors((prev) => ({ ...prev, estateName: "Please fill in the details" }))
                    }
                  }}
                  aria-invalid={!!(serverErrors.estateName || signupBlurErrors.estateName)}
                  aria-describedby={serverErrors.estateName || signupBlurErrors.estateName ? "signup-estate-error" : undefined}
                />
                <span
                  id="signup-estate-error"
                  className={styles.errorText}
                  role="alert"
                  data-visible={!!(serverErrors.estateName || signupBlurErrors.estateName)}
                  aria-hidden={!(serverErrors.estateName || signupBlurErrors.estateName)}
                >
                  <AlertCircle size={14} aria-hidden="true" />
                  {serverErrors.estateName?.[0] || signupBlurErrors.estateName || ""}
                </span>
              </label>

              <label className={styles.field} htmlFor="signup-password">
                <span className={styles.label}>Choose Password</span>
                <div className={styles.passwordInput}>
                  <input
                    required
                    autoComplete="new-password"
                    className={`${styles.input}${(serverErrors.password || signupBlurErrors.password) ? ` ${styles.inputError}` : ""}`}
                    placeholder="Create a password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    id="signup-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (signupBlurErrors.password) setSignupBlurErrors((prev) => ({ ...prev, password: "" }))
                      if (serverErrors.password) setServerErrors((prev) => {
                        const copy = { ...prev }
                        delete copy.password
                        return copy
                      })
                    }}
                    onBlur={() => {
                      if (!password) {
                        setSignupBlurErrors((prev) => ({ ...prev, password: "Please fill in the details" }))
                      }
                    }}
                    ref={passwordRef}
                    aria-invalid={!!(serverErrors.password || signupBlurErrors.password)}
                    aria-describedby={serverErrors.password || signupBlurErrors.password ? "signup-password-error" : undefined}
                  />
                  <button type="button" className={styles.passwordToggle} onClick={togglePassword} tabIndex={-1}>
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <span
                  id="signup-password-error"
                  className={styles.errorText}
                  role="alert"
                  data-visible={!!(signupBlurErrors.password || (serverErrors.password && serverErrors.password.length > 0))}
                  aria-hidden={!signupBlurErrors.password && !serverErrors.password}
                >
                  <AlertCircle size={14} aria-hidden="true" />
                  {signupBlurErrors.password || serverErrors.password?.[0] || ""}
                </span>
                {serverErrors.password && serverErrors.password.length > 1 && (
                  <ul className={styles.reqList}>
                    {serverErrors.password.slice(1).map((r, i) => (
                      <li key={i} className={styles.reqItem}>
                        <AlertCircle size={14} aria-hidden="true" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </label>

              <SubmitBtn label="Create account" pendingLabel="Creating account..." />
            </form>
          </div>
        </div>
      )}

      {mode === "login" && (
        <div className={styles.formWrapper}>
          <div className={styles.card}>
            <div className={styles.header}>
              <Link className={styles.logo} href="/">Duesly</Link>
              <div
                className={styles.bannerError}
                role="alert"
                data-visible={!!loginBanner}
                aria-hidden={!loginBanner}
                style={loginBanner ? {} : { display: "none" }}
              >
                {loginBanner}
              </div>
              <h1 className={styles.title}>Welcome back</h1>
              <p className={styles.subtitle}>Sign in to your estate account.</p>
            </div>

            <form className={styles.form} action={loginFormAction} noValidate>
              <label className={styles.field} htmlFor="login-email">
                <span className={styles.label}>Enter Email</span>
                <input
                  type="email"
                  id="login-email"
                  name="email"
                  className={`${styles.input}${(loginServerErrors.email || loginBlurErrors.email) ? ` ${styles.inputError}` : ""}`}
                  placeholder="you@example.com"
                  required
                  onFocus={clearLoginBanner}
                  onBlur={(e) => {
                    if (!e.target.value.trim()) {
                      setLoginBlurErrors((prev) => ({ ...prev, email: "Please fill in the details" }))
                    }
                  }}
                  onChange={() => {
                    if (loginBlurErrors.email) setLoginBlurErrors((prev) => ({ ...prev, email: "" }))
                    if (loginServerErrors.email) setLoginServerErrors((prev) => {
                      const copy = { ...prev }
                      delete copy.email
                      return copy
                    })
                  }}
                  aria-invalid={!!(loginServerErrors.email || loginBlurErrors.email)}
                  aria-describedby={loginServerErrors.email || loginBlurErrors.email ? "login-email-error" : undefined}
                />
                <span
                  id="login-email-error"
                  className={styles.errorText}
                  role="alert"
                  data-visible={!!(loginServerErrors.email || loginBlurErrors.email)}
                  aria-hidden={!(loginServerErrors.email || loginBlurErrors.email)}
                >
                  <AlertCircle size={14} aria-hidden="true" />
                  {loginServerErrors.email?.[0] || loginBlurErrors.email || ""}
                </span>
              </label>
              <label className={styles.field} htmlFor="login-password">
                <div className={styles.labelRow}>
                  <span className={styles.label}>Enter Password</span>
                  <button type="button" className={styles.forgotLink} onClick={() => setMode("forgot")}>Forgot password?</button>
                </div>
                <div className={styles.passwordInput}>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="login-password"
                    name="password"
                    className={`${styles.input}${(loginServerErrors.password || loginBlurErrors.password) ? ` ${styles.inputError}` : ""}`}
                    placeholder="Enter your password"
                    required
                    onFocus={clearLoginBanner}
                    onBlur={(e) => {
                      if (!e.target.value.trim()) {
                        setLoginBlurErrors((prev) => ({ ...prev, password: "Please fill in the details" }))
                      }
                    }}
                    onChange={() => {
                      if (loginBlurErrors.password) setLoginBlurErrors((prev) => ({ ...prev, password: "" }))
                      if (loginServerErrors.password) setLoginServerErrors((prev) => {
                        const copy = { ...prev }
                        delete copy.password
                        return copy
                      })
                    }}
                    aria-invalid={!!(loginServerErrors.password || loginBlurErrors.password)}
                    aria-describedby={loginServerErrors.password || loginBlurErrors.password ? "login-password-error" : undefined}
                  />
                  <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword((p) => !p)} tabIndex={-1}>
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <span
                  id="login-password-error"
                  className={styles.errorText}
                  role="alert"
                  data-visible={!!(loginServerErrors.password || loginBlurErrors.password)}
                  aria-hidden={!(loginServerErrors.password || loginBlurErrors.password)}
                >
                  <AlertCircle size={14} aria-hidden="true" />
                  {loginServerErrors.password?.[0] || loginBlurErrors.password || ""}
                </span>
              </label>
              <SubmitBtn label="Sign In" pendingLabel="Logging in..." />
            </form>

            <p className={styles.switchText}>
              Don&apos;t have an account?{" "}
              <button type="button" className={styles.switchLink} onClick={() => { setMode("signup"); setStep(1); setSignupBlurErrors({}); setStep1BlurErrors({}) }}>Sign up</button>
            </p>
          </div>
        </div>
      )}

      {mode === "forgot" && !forgotSent && (
        <div className={styles.formWrapper}>
          <div className={styles.card}>
            <div className={styles.header}>
              <Link className={styles.logo} href="/">Duesly</Link>
              <h1 className={styles.title}>Reset your password</h1>
              <p className={styles.subtitle}>Enter your email and we&apos;ll send a reset link.</p>
            </div>

            <form className={styles.form} onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const val = fd.get("forgot-email") as string
              if (!val?.trim()) return
              setForgotSubmittedEmail(val.trim())
              setForgotSent(true)
            }} noValidate>
              <label className={styles.field} htmlFor="forgot-email">
                <span className={styles.label}>Enter Email</span>
                <input
                  type="email"
                  id="forgot-email"
                  name="forgot-email"
                  className={styles.input}
                  placeholder="you@example.com"
                  required
                />
              </label>
              <button type="submit" className={styles.submit}>Send reset link</button>
            </form>

            <p className={styles.switchText}>
              <button type="button" className={styles.switchLink} onClick={() => setMode("login")}>Back to sign in</button>
            </p>
          </div>
        </div>
      )}

      {mode === "forgot" && forgotSent && (
        <div className={styles.formWrapper}>
          <div className={styles.card}>
            <div className={styles.header}>
              <Link className={styles.logo} href="/">Duesly</Link>
              <h1 className={styles.title}>Check your inbox</h1>
              <p className={styles.subtitle}>We&apos;ve sent instructions to {forgotSubmittedEmail}.</p>
            </div>

            <div className={styles.bannerSuccess}>
              If an account exists for that email, we&apos;ve sent reset instructions.
            </div>

            <form className={styles.form} noValidate>
              <button type="button" className={styles.submit} onClick={() => setMode("login")}>Back to sign in</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
