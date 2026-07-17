export function whatsappDeepLink(phone: string, message: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "")
  const international = cleaned.startsWith("0") ? "234" + cleaned.slice(1) : cleaned
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`
}

export function paymentReminderMessage(params: {
  estateName: string
  collectionTitle: string
  amount: string
  dueDate: string
  unitLabel: string
  paymentLink: string
}): string {
  return [
    `*DUES REMINDER — ${params.estateName}*`,
    ``,
    `This is a reminder that *${params.collectionTitle}* of ${params.amount} is due for *Unit ${params.unitLabel}*.`,
    `Due date: ${params.dueDate}`,
    ``,
    `Pay here: ${params.paymentLink}`,
    ``,
    `Thank you.`,
  ].join("\n")
}
