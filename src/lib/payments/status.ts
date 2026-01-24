export function statusFromStripeStatus(status: string): string {
  switch (status) {
    case "succeeded":
      return "paid";
    case "processing":
    case "requires_action":
    case "requires_payment_method":
    case "requires_confirmation":
      return "pending";
    case "canceled":
      return "canceled";
    default:
      return "pending";
  }
}
