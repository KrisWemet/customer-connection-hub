# Rustic Retreat CRM - Phase-by-Phase Implementation Plan

**Document Version:** 1.3 (Updated with Alberta venue rules, single 3-day package, and upsell simplification)
**Date:** January 20, 2026
**Author:** Manus AI
**Goal:** A detailed, iterative build guide for the Rustic Retreat CRM. Each phase is designed to be a self-contained, testable unit of work.

***

## 🏗️ PHASE 1: DATABASE & AUTHENTICATION

**Goal:** Supabase database fully set up, authentication working, and RLS policies defined for all three roles (Admin, Client, Family).

**Key Updates:**
*   Schema updated to include `upsells` table and detailed guest tracking fields.
*   RLS policies are critical for this phase.

## 🏗️ PHASE 2: INQUIRY & LEAD MANAGEMENT

**Goal:** Admin can manage leads through the custom Rustic Retreat pipeline stages.

**Key Updates:**
*   Pipeline stages updated to: Inquiry → Tour/Call scheduled → Approved → Contract sent → Contract signed → Booking confirmed → Pre-event checklist → Event week → Post-event inspection.

## 🏗️ PHASE 3: BOOKING CREATION & CALENDAR (CRITICAL VALIDATION)

**Goal:** Admin can create bookings with Alberta-specific date, season, and capacity validation, and view them on the calendar.

**Key Updates:**
*   **Booking Validation Logic (Phase 3.1):**
    *   Packages: **3-Day Weekend** (Fri–Sun), **5-Day Extended** (5 consecutive days), **10-Day Experience** (10 consecutive days).
    *   **Operating Season:** Allow bookings only June 1 – September 30; block October–May.
    *   **Reset:** Monday–Thursday blocked for reset/cleanup; never allow overlapping events (single inventory).
    *   **Lead Time:** Standard schedule applies; **last-minute (<7 days)** requires 100% payment upfront.
*   **Capacity Validation:** Hard cap **150 reception guests**; track included camping (60 guests) and RV sites (15). Only allow paid add-ons beyond included counts if capacity is available; thresholds configurable in admin settings.

## 🏗️ PHASE 4: PAYMENT TRACKING & CONTRACTS

**Goal:** Track payments, manage upsells, implement the tiered cancellation policy, and enable contract signing.

**Key Updates:**
*   **Upsell Management:** The `upsells` table supports overage add-ons only (additional RV sites beyond 15 included, additional tent camping beyond 60 guests included, optional firewood bundles). Prices are admin-configurable (year-over-year updates) via venue settings UI.
*   **Payment Calculation:** The `calculatePaymentSchedule` function must now:
    1.  Generate **25% non-refundable deposit** at contract signing.
    2.  Generate **50% due 90 days** pre-event.
    3.  Generate **25% due 60 days** pre-event.
    4.  For **last-minute (<7 days)**, generate a single 100% payment at booking.
    5.  Apply **5% GST** to package and upsells; upsells roll into the final scheduled payment.
*   **Cancellation Policy:** The `cancelBooking` function must implement the existing tiered refund logic (90+ days, 60-90 days, <60 days) using the 25% non-refundable deposit.
*   **Damage Deposit:** Capture **$500** due at check-in; create inspection/refund workflow to issue within **7 days after booking end**.

## 🏗️ PHASE 5: CLIENT PORTAL & PLANNING TOOL (EXPANDED)

**Goal:** Clients can log in, view their booking, manage guests, track RV/tents, and use the portal as their planning tool.

**Key Updates:**
*   **RV/Tent Tracking Module:** Clients must input unit type, RV size (if applicable), and arrival/departure dates; counts feed camping/RV availability validation and upsell totals.
*   **NEW PHASE 5.6: Client Planning Checklist:** Checklist tailored to outdoor Alberta venue needs (power, tent layout, fire bans, liquor compliance, insurance certificates, noise curfew reminders).
*   **Timeline Builder:** Time-blocked schedule (ceremony, cocktails, dinner, quiet hours).
*   **Vendor Management:** Track vendor details, payments, and arrival windows.
*   **Guest List Management:** Names, camping assignments, RV details, arrival/departure dates.
*   **Contracts/Documents:** Contracts use Rustic Retreat legal entity and Alberta address; portal supports uploads for vendor agreements, insurance certificates, liquor compliance proof, floor plans, and timelines.

## 🏗️ PHASE 6: FAMILY DASHBOARD & CHECKLISTS

**Goal:** Family/Staff can view upcoming events and complete operational checklists.

**Status:** No major changes. The internal checklists (Pre-Event Setup, Post-Event Inspection) are crucial for the Damage Deposit workflow.

## 🏗️ PHASE 7: AUTOMATED WORKFLOWS & COMMUNICATIONS

**Goal:** Implement automated communication workflows, prioritizing Twilio SMS.

**Key Updates:**
*   **Twilio Priority:** Ensure `message-service.ts` prioritizes SMS (Mountain Time / Alberta) for all short, time-sensitive reminders.
*   **Unified Messaging Hub:** SMS (Twilio) + Email (Resend) with threaded conversations and booking linkage; Facebook Messenger planned.
*   **Critical Workflow:** Add the **7-Day Pre-Arrival Reminder**, including Friday check-in instructions, campsite/RV details, and the **$500 Damage Deposit reminder**.

## 🏗️ PHASE 8: POLISH, REPORTS & DEPLOYMENT

**Goal:** Finalize reporting, settings, and deploy the application.

**Key Updates:**
*   **Reporting:** Financial reports must include a breakdown of **Upsell Revenue** and a dedicated **Cancellation Audit Log** to track refund calculations.
*   **Settings:** Update the settings page to allow configuration of package base prices, included counts (camping 60, RV 15), upsell unit prices (additional RV site, additional tent camping, firewood), GST toggle/rate (default 5%), and the non-refundable deposit percentage (default 25%); all editable without code changes.

## 🔄 PHASE 1B: LIVE INTEGRATIONS

**Goal:** Replace mock services with live integrations.

**Status:** No changes. This remains the final step after the core application is stable.

***

## Testing Checkpoint: Phase 3 Validation

The following tests are **CRITICAL** to ensure the core business logic is correct:

| Test Case | Expected Outcome |
| :--- | :--- |
| **Weekend Booking (Valid)** | Start Friday, end Sunday in July. **Success.** |
| **5-Day Package (Valid)** | Start July 10, end July 14. **Success.** |
| **10-Day Package (Valid)** | Start Aug 1, end Aug 10. **Success.** |
| **Midweek Booking (Invalid)** | Start Wednesday, end Friday on 3-day package. **Error.** |
| **Out-of-Season Booking (Invalid)** | Start October 4. **Error: Venue closed October–May.** |
| **Double Booking Block** | Existing booking; attempt overlapping dates. **Error: Single-inventory conflict.** |
| **Reset Window Enforcement** | Back-to-back bookings without 1-day gap. **Error: Reset/cleanup days blocked.** |
| **Capacity Limit** | Reception guests 160. **Error: Exceeds 150-guest cap.** |
| **RV/Tent Tracking** | RV/tent counts beyond included 15/60. **Warning/Error** per config; totals feed upsell. |
| **Last-Minute Payment Rule** | Booking created 5 days before event. **100% upfront required.** |
| **Payment Schedule** | Standard booking: 25% deposit, 50% at -90 days, 25% at -60 days with GST. |
| **Messaging Threads** | Send outbound SMS/email and verify message stored + thread last_message_at updates. |
| **Cancellation** | Booking cancelled 75 days out. **System calculates 50% refund of balance above non-refundable deposit.** |

This plan is now fully aligned with the unique operational requirements of Rustic Retreat.

## ➕ Additional Phases

* **PHASE 3.5: Tours/Viewings Management** — schedule and track tours, follow-up reminders.
* **PHASE 4.5: Contract Generation & E-Signature** — generate contracts and send for signature (DocuSign or similar).
* **PHASE 5.5: Unified Messaging System (SMS + Email)** — threaded inbox, booking-linked conversations.
* **PHASE 5.6: Timeline Builder** — build event day timelines/blocks.
* **PHASE 5.7: Vendor Management** — vendors, arrival times, payments, documents.
* **PHASE 5.8: Guest List Management with RV/Camping Details** — guests, camping assignments, RV details, arrivals/departures.
