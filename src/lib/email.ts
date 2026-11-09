import { Resend } from "resend"
import { getEnv } from "./env"

let _resend: Resend | null = null

function getResend(): Resend {
  if (_resend) return _resend
  const env = getEnv()
  _resend = new Resend(env.RESEND_API_KEY)
  return _resend
}

export interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  const env = getEnv()

  if (!env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", to)
    return
  }

  const { error } = await getResend().emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  })

  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }
}

export function paymentReceiptHtml(params: {
  estateName: string
  collectionTitle: string
  levyAmount: string
  feeAmount: string
  totalAmount: string
  unitLabel: string
  zoneName: string
  paidAt: string
  reference: string
}): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Payment Confirmed</h2>
      <p>Your payment for <strong>${params.collectionTitle}</strong> has been received.</p>
      <table style="width:100%; border-collapse: collapse;">
        <tr><td style="padding:8px 0; color:#666;">Estate</td><td style="padding:8px 0;">${params.estateName}</td></tr>
        <tr><td style="padding:8px 0; color:#666;">Unit</td><td style="padding:8px 0;">${params.zoneName} - ${params.unitLabel}</td></tr>
        <tr><td style="padding:8px 0; color:#666;">Due amount</td><td style="padding:8px 0;">${params.levyAmount}</td></tr>
        <tr><td style="padding:8px 0; color:#666;">Service fee</td><td style="padding:8px 0;">${params.feeAmount}</td></tr>
        <tr><td style="padding:8px 0; color:#666; font-weight:600;">Total paid</td><td style="padding:8px 0; font-weight:600;">${params.totalAmount}</td></tr>
        <tr><td style="padding:8px 0; color:#666;">Date</td><td style="padding:8px 0;">${params.paidAt}</td></tr>
        <tr><td style="padding:8px 0; color:#666;">Reference</td><td style="padding:8px 0;">${params.reference}</td></tr>
      </table>
      <hr style="margin:24px 0; border:none; border-top:1px solid #eee;" />
      <p style="color:#999; font-size:12px;">Duesly — Estate collection made simple.</p>
    </div>
  `
}

export function paymentAlertHtml(params: {
  estateName: string
  collectionTitle: string
  amount: string
  unitLabel: string
  zoneName: string
  residentName: string | null
  paidAt: string
}): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Payment Received</h2>
      <p>A payment has been made for <strong>${params.collectionTitle}</strong>.</p>
      <table style="width:100%; border-collapse: collapse;">
        <tr><td style="padding:8px 0; color:#666;">Estate</td><td style="padding:8px 0;">${params.estateName}</td></tr>
        <tr><td style="padding:8px 0; color:#666;">Unit</td><td style="padding:8px 0;">${params.zoneName} - ${params.unitLabel}</td></tr>
        <tr><td style="padding:8px 0; color:#666;">Resident</td><td style="padding:8px 0;">${params.residentName ?? "N/A"}</td></tr>
        <tr><td style="padding:8px 0; color:#666;">Amount</td><td style="padding:8px 0;">${params.amount}</td></tr>
        <tr><td style="padding:8px 0; color:#666;">Date</td><td style="padding:8px 0;">${params.paidAt}</td></tr>
      </table>
      <hr style="margin:24px 0; border:none; border-top:1px solid #eee;" />
      <p style="color:#999; font-size:12px;">Duesly — Estate collection made simple.</p>
    </div>
  `
}

export function welcomeHtml(params: { name: string; estateName: string; dashboardUrl: string }): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Welcome to Duesly!</h2>
      <p>Hi ${params.name},</p>
      <p>Your estate account for <strong>${params.estateName}</strong> has been created.</p>
      <p>Here's what to do next:</p>
      <ol>
        <li>Add your zones (blocks, sections) in the setup page</li>
        <li>Import your roster via CSV or add units manually</li>
        <li>Create your first collection and share the payment link</li>
      </ol>
      <a href="${params.dashboardUrl}" style="display:inline-block; margin-top:16px; padding:12px 24px; background:#4F46E5; color:#fff; text-decoration:none; border-radius:8px;">Go to Dashboard</a>
      <hr style="margin:24px 0; border:none; border-top:1px solid #eee;" />
      <p style="color:#999; font-size:12px;">Duesly — Estate collection made simple.</p>
    </div>
  `
}

export function paymentFailedHtml(params: {
  estateName: string
  collectionTitle: string
  amount: string
  unitLabel: string
  zoneName: string
}): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Payment Failed</h2>
      <p>Your payment for <strong>${params.collectionTitle}</strong> could not be completed.</p>
      <table style="width:100%; border-collapse: collapse;">
        <tr><td style="padding:8px 0; color:#666;">Estate</td><td style="padding:8px 0;">${params.estateName}</td></tr>
        <tr><td style="padding:8px 0; color:#666;">Unit</td><td style="padding:8px 0;">${params.zoneName} - ${params.unitLabel}</td></tr>
        <tr><td style="padding:8px 0; color:#666;">Amount</td><td style="padding:8px 0;">${params.amount}</td></tr>
      </table>
      <p style="margin-top:16px;">Please try again or contact your estate treasurer for assistance.</p>
      <hr style="margin:24px 0; border:none; border-top:1px solid #eee;" />
      <p style="color:#999; font-size:12px;">Duesly — Estate collection made simple.</p>
    </div>
  `
}

export function reminderHtml(params: {
  estateName: string
  collectionTitle: string
  amount: string
  dueDate: string
  unitLabel: string
  zoneName: string
  paymentLink: string
}): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Payment Reminder</h2>
      <p>This is a reminder that <strong>${params.collectionTitle}</strong> is due.</p>
      <table style="width:100%; border-collapse: collapse;">
        <tr><td style="padding:8px 0; color:#666;">Estate</td><td style="padding:8px 0;">${params.estateName}</td></tr>
        <tr><td style="padding:8px 0; color:#666;">Unit</td><td style="padding:8px 0;">${params.zoneName} - ${params.unitLabel}</td></tr>
        <tr><td style="padding:8px 0; color:#666;">Amount</td><td style="padding:8px 0;">${params.amount}</td></tr>
        <tr><td style="padding:8px 0; color:#666;">Due Date</td><td style="padding:8px 0;">${params.dueDate}</td></tr>
      </table>
      <a href="${params.paymentLink}" style="display:inline-block; margin-top:16px; padding:12px 24px; background:#4F46E5; color:#fff; text-decoration:none; border-radius:8px;">Pay Now</a>
      <hr style="margin:24px 0; border:none; border-top:1px solid #eee;" />
      <p style="color:#999; font-size:12px;">Duesly — Estate collection made simple.</p>
    </div>
  `
}

export function passwordResetHtml(params: { name: string; resetLink: string }): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #111215;">
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px;">Reset your Duesly Password</h2>
      <p>Hi ${params.name},</p>
      <p>We received a request to reset the password for your Duesly account. Click the button below to choose a new one. This link will expire in 1 hour.</p>
      <div style="margin: 24px 0;">
        <a href="${params.resetLink}" style="display: inline-block; padding: 12px 24px; background: #5E6AD2; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
      </div>
      <p style="font-size: 13px; color: #666; margin-top: 24px;">If you didn't request a password reset, you can safely ignore this email.</p>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
      <p style="color: #999; font-size: 12px;">Duesly — Estate collection made simple.</p>
    </div>
  `
}
