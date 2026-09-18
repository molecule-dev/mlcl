import { fromHTML } from '@molecule/api-pdf'

type InvoiceInput = {
  invoiceNumber: string
  issueDate: Date
  seller: { name: string; address: string; vatId?: string }
  customer: { name: string; address?: string; email: string; vatId?: string }
  lineItems: { description: string; quantity: number; unitPriceCents: number }[]
  taxRatePercent: number
  currency: string // ISO 4217, e.g. 'USD'
}

function formatMoney(cents: number, currency: string): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency })
}

// Escape every user-supplied string before interpolating into the invoice HTML.
// fromHTML renders whatever markup it's given, so an unescaped customer name or
// line-item description (`</td><script>…`) could forge or restyle the document —
// see the @molecule/api-pdf @remarks ("HTML from user input is an injection surface").
function esc(value: string): string {
  // Numeric character references — correct HTML escaping (equivalent to the
  // named ampersand/lt/gt entities) that also keeps them out of source.
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&#38;', '<': '&#60;', '>': '&#62;', '"': '&#34;', "'": '&#39;' })[c] as string,
  )
}

/**
 * Render an invoice to a PDF Buffer via the `@molecule/api-pdf` bond — NOT a raw
 * PDF library. Wire a provider once in bonds.ts (`setProvider(provider)` from
 * `@molecule/api-pdf-puppeteer` for full CSS fidelity, or `-pdfkit` for a
 * lighter, text-approximation renderer). Swapping the engine touches only
 * bonds.ts; this code never changes.
 */
export async function renderInvoice(input: InvoiceInput): Promise<Buffer> {
  let subtotalCents = 0
  const rows = input.lineItems
    .map((item) => {
      const lineTotal = item.quantity * item.unitPriceCents
      subtotalCents += lineTotal
      return `<tr>
        <td>${esc(item.description)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatMoney(item.unitPriceCents, input.currency)}</td>
        <td class="num">${formatMoney(lineTotal, input.currency)}</td>
      </tr>`
    })
    .join('')

  const taxCents = Math.round(subtotalCents * (input.taxRatePercent / 100))
  const totalCents = subtotalCents + taxCents

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body { font-family: Helvetica, Arial, sans-serif; color: #111; font-size: 12px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { padding: 6px 4px; text-align: left; border-bottom: 1px solid #ddd; }
    .num { text-align: right; }
    tfoot td { border: none; padding-top: 4px; }
    .total { font-size: 14px; font-weight: bold; }
  </style></head><body>
    <h1>${esc(input.seller.name)}</h1>
    <div>${esc(input.seller.address)}</div>
    ${input.seller.vatId ? `<div>VAT: ${esc(input.seller.vatId)}</div>` : ''}
    <div class="meta">
      <div><strong>Invoice #${esc(input.invoiceNumber)}</strong></div>
      <div>Issued: ${input.issueDate.toISOString().slice(0, 10)}</div>
    </div>
    <div><strong>Bill to:</strong></div>
    <div>${esc(input.customer.name)}</div>
    ${input.customer.address ? `<div>${esc(input.customer.address)}</div>` : ''}
    <div>${esc(input.customer.email)}</div>
    ${input.customer.vatId ? `<div>VAT: ${esc(input.customer.vatId)}</div>` : ''}
    <table>
      <thead>
        <tr><th>Description</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th></tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="3" class="num">Subtotal</td><td class="num">${formatMoney(subtotalCents, input.currency)}</td></tr>
        <tr><td colspan="3" class="num">Tax (${input.taxRatePercent}%)</td><td class="num">${formatMoney(taxCents, input.currency)}</td></tr>
        <tr><td colspan="3" class="num total">Total</td><td class="num total">${formatMoney(totalCents, input.currency)}</td></tr>
      </tfoot>
    </table>
  </body></html>`

  return fromHTML(html, {
    format: 'Letter',
    margin: { top: '48px', bottom: '48px', left: '48px', right: '48px' },
  })
}
