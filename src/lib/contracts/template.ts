type PaymentScheduleItem = {
  label: string;
  dueDate: string;
  amount: number;
};

export type ContractTemplateData = {
  contractNumber: string;
  createdAt: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  packageType: string;
  eventStartDate: string;
  eventEndDate: string;
  totalAmount: number;
  depositAmount: number;
  gstRate?: number;
  paymentSchedule?: PaymentScheduleItem[];
  signatureName?: string | null;
  signatureImage?: string | null;
  signedAt?: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function buildDefaultSchedule(data: ContractTemplateData): PaymentScheduleItem[] {
  const eventStart = new Date(`${data.eventStartDate}T00:00:00`);
  const depositDue = new Date(data.createdAt);
  const ninetyDays = new Date(eventStart);
  ninetyDays.setDate(ninetyDays.getDate() - 90);
  const sixtyDays = new Date(eventStart);
  sixtyDays.setDate(sixtyDays.getDate() - 60);
  const total = data.totalAmount;
  return [
    { label: "Deposit (25%)", dueDate: depositDue.toISOString(), amount: total * 0.25 },
    { label: "Second Payment (50%)", dueDate: ninetyDays.toISOString(), amount: total * 0.5 },
    { label: "Final Payment (25%)", dueDate: sixtyDays.toISOString(), amount: total * 0.25 },
  ];
}

export function generateContractHtml(data: ContractTemplateData) {
  const gstRate = data.gstRate ?? 0.05;
  const schedule = data.paymentSchedule ?? buildDefaultSchedule(data);
  const subtotal = data.totalAmount / (1 + gstRate);
  const gst = data.totalAmount - subtotal;

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: "Helvetica", "Arial", sans-serif; color: #111827; line-height: 1.5; }
        h1, h2, h3 { margin: 0 0 8px; }
        h1 { font-size: 22px; }
        h2 { font-size: 16px; margin-top: 24px; }
        h3 { font-size: 14px; margin-top: 16px; }
        p { margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #E5E7EB; font-size: 12px; }
        .muted { color: #6B7280; font-size: 12px; }
        .section { margin-top: 18px; }
        .signature { border: 1px dashed #D1D5DB; padding: 12px; margin-top: 12px; min-height: 80px; }
        .signature img { max-height: 80px; display: block; }
      </style>
    </head>
    <body>
      <h1>Rustic Retreat Weddings and Events</h1>
      <p class="muted">Contract ${data.contractNumber} • ${formatDate(data.createdAt)}</p>

      <div class="section">
        <h2>Client Information</h2>
        <p><strong>${data.clientName}</strong></p>
        <p>${data.clientEmail}${data.clientPhone ? ` • ${data.clientPhone}` : ""}</p>
      </div>

      <div class="section">
        <h2>Event Details</h2>
        <p><strong>Package:</strong> ${data.packageType}</p>
        <p><strong>Event Dates:</strong> ${formatDate(data.eventStartDate)} – ${formatDate(data.eventEndDate)}</p>
      </div>

      <div class="section">
        <h2>Pricing</h2>
        <table>
          <tbody>
            <tr><td>Subtotal</td><td>${formatCurrency(subtotal)}</td></tr>
            <tr><td>GST (${(gstRate * 100).toFixed(1)}%)</td><td>${formatCurrency(gst)}</td></tr>
            <tr><td><strong>Total</strong></td><td><strong>${formatCurrency(data.totalAmount)}</strong></td></tr>
            <tr><td>Deposit</td><td>${formatCurrency(data.depositAmount)}</td></tr>
            <tr><td>Damage Deposit</td><td>${formatCurrency(500)}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Payment Schedule</h2>
        <table>
          <thead>
            <tr><th>Milestone</th><th>Due Date</th><th>Amount</th></tr>
          </thead>
          <tbody>
            ${schedule
              .map(
                (item) => `
              <tr>
                <td>${item.label}</td>
                <td>${formatDate(item.dueDate)}</td>
                <td>${formatCurrency(item.amount)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Terms & Conditions</h2>
        <p>1. The venue is single-inventory; reservations are exclusive once confirmed.</p>
        <p>2. Operating season is June through September. Off-season bookings require special approval.</p>
        <p>3. Cancellation policy: deposits are non-refundable. Additional refunds are tiered based on notice.</p>
        <p>4. All services are subject to Alberta GST requirements.</p>
        <p>5. Included camping: 60 guests and 15 RV sites. Overages are billed per venue settings.</p>
        <p>6. Venue rules and regulations apply to all guests and vendors.</p>
      </div>

      <div class="section">
        <h2>Signatures</h2>
        <div class="signature">
          ${data.signatureImage ? `<img src="${data.signatureImage}" alt="Signature" />` : ""}
          <p><strong>${data.signatureName ?? data.clientName}</strong></p>
          <p class="muted">${data.signedAt ? formatDate(data.signedAt) : "Pending signature"}</p>
        </div>
      </div>
    </body>
  </html>
  `;
}
