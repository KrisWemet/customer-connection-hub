export const integrationConfig = {
  twilio: {
    enabled: Boolean(import.meta.env.VITE_TWILIO_ACCOUNT_SID && import.meta.env.VITE_TWILIO_AUTH_TOKEN),
  },
  resend: {
    enabled: Boolean(import.meta.env.VITE_RESEND_API_KEY),
  },
  stripe: {
    enabled: Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY),
  },
};
