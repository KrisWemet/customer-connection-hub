# Product Requirements Document (PRD): Rustic Retreat CRM

**Document Version:** 1.1
**Date:** January 20, 2026
**Author:** Manus AI
**Goal:** To build a custom, all-in-one CRM and client planning portal for Rustic Retreat, a single-inventory, off-grid wedding venue near Lac La Nonne, Alberta, ensuring operational efficiency, legal compliance, and an enhanced client experience.

***

## 1. Business Goals & Context

The primary goal is to replace manual processes and generic software with a single, purpose-built tool that enforces Rustic Retreat's unique business rules. The CRM must manage the entire client lifecycle from initial inquiry to post-event follow-up.

**Key Operational Reality:** Rustic Retreat books **one event at a time** on a single 65-acre property with one primary event space. The CRM must function as a single-inventory management system. Camping is included as part of the wedding package experience; the venue is **not a public campground**.

## 2. User Roles & Permissions

The system must support three distinct user roles, with permissions enforced via Row Level Security (RLS) [1].

| Role | Primary Responsibilities | Key Access/Permissions |
| :--- | :--- | :--- |
| **Admin (Shannon)** | Full operational management, financial oversight, system configuration, client communication. | Full CRUD access to all data (Inquiries, Bookings, Payments, Settings). |
| **Client (Couple)** | Event planning, guest management, contract signing, document upload, payment tracking. | Read/Write access ONLY to their specific Booking, Guests, Vendors, Documents, and Payments. |
| **Family/Staff** | Pre- and post-event operational tasks, maintenance, and setup. | Read-only access to relevant Booking details (dates, package). Read/Write access to internal Checklists. **No access to financial or sensitive client data.** |

## 3. Core Feature Requirements

### 3.1. Inquiry & Pipeline Management (Phase 2)

*   **Capture:** Must capture Name, Email, Phone, Estimated Guest Count (Reception/Camping), RV Count Request, and Source.
*   **Pipeline Stages:** Must support the following custom stages: Inquiry → Tour/Call scheduled → Approved → Contract sent → Contract signed → Booking confirmed → Pre-event checklist → Event week → Post-event inspection.
*   **Lead Scoring:** Basic logic to flag high-priority leads (e.g., event date within 12 months).

### 3.2. Booking & Calendar Management (Phase 3)

*   **Single-Inventory Calendar:** A visual calendar that clearly shows **Confirmed Bookings** and **Pending Holds**; only one booking may exist per weekend.
*   **Seasonal Operating Window:** Bookings permitted **June 1 – September 30** only (venue closed October–May).
*   **Booking Validation (CRITICAL):** Prevent double-booking and enforce Rustic Retreat package rules:

| Package Type | Duration | Fixed Rules | Guest Limits |
| :--- | :--- | :--- | :--- |
| **3-Day Weekend Package** | Friday–Sunday (2 nights) | Check-in Friday, checkout Sunday. Monday–Thursday reserved for reset/cleanup; do not allow bookings that overlap reset days. | Hard cap **150 reception guests**. **Included:** camping up to 60 guests and up to 15 RV sites. Additional RV/tent capacity allowed only if available and billed as upsells. |
| **5-Day Extended Package** | 5 consecutive days | Must fit inside the June–September season; no overlapping bookings. | Same caps as above. |
| **10-Day Experience Package** | 10 consecutive days | Must fit inside the June–September season; no overlapping bookings. | Same caps as above. |
| **Reset Time** | N/A | Monday–Thursday blocked for reset/prep between events. | N/A |
| **Operating Season** | N/A | Only allow bookings within **June–September**. | N/A |

*   **Lead Time & Last-Minute Rule:** Standard bookings follow the payment schedule. **Last-minute bookings (< 7 days before Friday check-in) require 100% payment upfront** after passing availability checks.
*   **Capacity Enforcement:** Hard validation to prevent exceeding **150 reception guests**; track included camping (60 guests) and RV sites (15) and only allow paid add-ons beyond those included counts if capacity is available; thresholds configurable in admin settings.

### 3.3. Financial Management (Phase 4)

*   **Payment Schedule:** Auto-generate 3 payments tied to event date:
    *   **25% non-refundable deposit** at contract signing (secures the date).
    *   **50%** due **90 days before** event.
    *   **25%** (remaining balance) due **60 days before** event.
    *   **Last-minute (< 7 days)**: 100% due at booking/contract.
*   **Taxes:** Apply **5% Alberta GST** to package and upsells.
*   **Upsell Tracking:** Track overage add-ons beyond included capacity (prices configurable in admin settings):
    *   Additional RV sites (beyond 15 included) — **$25/night**
    *   Additional tent camping (beyond 60 guests included) — **$15/night**
    *   Firewood bundles — **$20/bundle** (optional; configurable/disable-able)
    *   Package base prices and all upsell unit prices must be editable in venue settings without code changes (year-over-year updates).
*   **Cancellation Policy (CRITICAL):** Implement the existing tiered refund logic:
    *   **> 90 days out:** Full refund of payments made, minus the non-refundable deposit.
    *   **60-90 days out:** 50% refund of the balance paid above the non-refundable deposit.
    *   **< 60 days out:** No refund of any payments made.
*   **Damage Deposit:** Workflow for the **$500 Damage Deposit**, collected at **check-in (Friday)**; refund/deductions logged and issued within **7 days** after the end of the booking.

### 3.4. Client Portal & Planning Tool (Phase 5)

The client portal must serve as the couple's primary planning tool.

*   **Client Planning Checklist:** Client-facing checklist tailored to an outdoor Alberta venue (power needs, tent layout, fire bans, insurance certificate upload, liquor compliance, noise curfew reminders).
*   **Timeline Builder:** Blocks for ceremony, cocktails, dinner, quiet hours, teardown, etc., with times and notes.
*   **Vendor Management:** Track vendor details, arrival times, payments, and documents.
*   **Guest List Management:** Names, RSVP, camping assignments, RV details, and arrival/departure dates.
*   **Detailed Guest Tracking:** Clients must be able to input:
    *   **RV/Tent Guests:** Unit type, RV size, arrival date, and departure date for each site.
    *   **Guest Details:** RSVP status; meal choice optional future feature.
*   **Contract & Documents:** View/download signed contract (Rustic Retreat legal entity and Alberta address placeholder until finalized) and upload vendor contracts, timelines, floor plans, insurance certificates, and liquor compliance documents. Full Planning Service and Day-of Coordination are separate paid services with separate contracts.

### 3.5. Communication & Automation (Phase 7)

*   **Twilio SMS Priority:** All automated reminders prioritize **Twilio SMS** (Mountain Time / Alberta) with email as a fallback.
*   **Unified Messaging Hub:** Threaded conversations per contact across SMS (Twilio) and Email (Resend); messages link to bookings; Facebook Messenger planned for future.
*   **Automated Workflows:** Must include:
    *   Payment reminders (90-day, 60-day).
    *   **7-Day Pre-Arrival Reminder (CRITICAL):** Must include Friday check-in instructions, campsite/RV details, and a reminder for the **$500 Damage Deposit**.
    *   Post-event review request.

### 3.6. Compliance

*   Location: Lac Ste. Anne County, Alberta.
*   GST collection at 5% required on packages and upsells.
*   Alberta liquor service rules apply; capture proof of compliance.
*   Require insurance certificates (standard venue liability); track uploads and expirations.

## 4. Reporting Requirements (Phase 8)

*   **Financial Reports:** Revenue by month/year, GST collected, Outstanding Receivables, and a full transaction export for accounting.
*   **Operational Reports:** Lead conversion rate by source, RV Upsell Count, Damage Deposit Status timeline.

***

## 5. Next Steps

This PRD, along with the accompanying Technical Stack and Implementation Plan documents, provides the complete scope for the development team.

| Document | Purpose |
| :--- | :--- |
| `rustic_retreat_crm_prd.md` | **What** to build (Features & Rules) |
| `rustic_retreat_crm_tech_stack.md` | **How** to build it (Architecture & Tools) |
| `rustic_retreat_crm_implementation_plan.md` | **When** to build it (Phase-by-Phase Guide) |

[1]: Row Level Security is a database feature that restricts which rows a user can access based on their role or other conditions. In this case, it is essential for separating Admin, Client, and Family data access.
