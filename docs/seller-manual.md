# SukiGo Seller Manual

## 1) Purpose of the Seller Side

The Seller side is the operational workspace for store owners/managers. It is designed to:

- monitor business performance (dashboard)
- manage products and inventory
- manage order fulfillment and rider handoff
- manage POS subscriptions, branch setup, and POS devices
- configure tenant-specific store behavior

Primary seller routes are under `/seller/*`.

## 2) Seller Module Map (What Each Module Is For)

This list is based on the Seller navigation catalog and module feature gates.

| Module | Route | Main Purpose | Feature Gate |
|---|---|---|---|
| Dashboard | /seller/dashboard | Plan-aware KPI and operations control center | dashboard |
| Multi-Branch | /seller/branches | Branch-level operation management (BUSINESS flow) | multiBranch |
| POS | /seller/pos | POS device account lifecycle and active session control | basicPOS |
| Billing | /seller/billing | Subscription plan checkout, slot management, invoices, payment history | billing |
| Products | /seller/products | Catalog CRUD, pricing, stock baseline, tax type | products |
| Order Management | /seller/orders | Seller order queue, rider tracking, order action workflow | orders |
| Customers | /seller/customers | Customer management (currently scaffolded if not implemented) | customers |
| Employees | /seller/employees | Cashier/staff role operations (plan-locked if unavailable) | employees |
| Inventory | /seller/inventory | Stock sync/update across seller products | inventory |
| Transfers | /seller/transfers | Inter-branch stock movements (BUSINESS) | transfers |
| Analytics | /seller/analytics | Reporting and trend analytics | advancedAnalytics |
| Reports | /seller/reports | Export/reporting workflows | reports |
| Automation | /seller/automation | Automated flows and scheduled operations | automation |
| Audit Logs | /seller/audit-logs | Operational audit and traceability | auditLogs |
| Settings | /seller/store-config | Store behavior configuration (scanner, printer, UX) | settings |

Notes:

- Modules not yet implemented as dedicated pages are handled by the dynamic module placeholder page at `/seller/[module]`.
- If a required feature is disabled by plan/overrides, the module is rendered as locked with an upgrade prompt.

## 3) Dashboard Manual (Special Focus)

Route: `/seller/dashboard`

The dashboard is plan-aware and combines subscription features, live seller data, and customizable widgets.

### 3.1 Main Sections on Dashboard

1. Subscription Status Banner
- shows active plan (FREE/PRO/BUSINESS)
- shows contextual upgrade/business message

2. Plan-aware Intro + Quick Actions
- dashboard title and plan-aware summary
- quick shortcut actions (Create Product, Open POS, Review Billing, Run Report, Automate Flow, Open Alerts)

3. KPI Widget Grid
- shows metric cards based on plan
- supports:
  - drag-and-drop reorder
  - hide/show per widget
- widget state is persisted in seller dashboard store

4. Sales/Analytics Chart
- FREE: line chart with sales + orders
- PRO: line chart with sales + profit (or fallback key)
- BUSINESS: bar chart with revenue + transfer/secondary key
- can use live dashboard summary chart data when available

5. Notifications Feed
- level-based notifications: info/warning/critical
- plan-specific notification data

6. Locked Upsell Modules
- displays locked premium modules and upgrade messaging

7. Onboarding Progress Tracker
- plan-specific onboarding milestones
- completion derived from feature enablement

### 3.2 Dashboard Personalization Behaviors

Persisted via seller dashboard store:

- widget order
- hidden widgets
- sidebar collapse
- selected branch (state holder)
- dark mode toggle (state holder)

Usability shortcuts:

- `Ctrl+K` (or `Cmd+K`) opens Command Palette
- Command Palette lists modules and blocks locked items with upgrade text

### 3.3 Dashboard Data Sources

- seller summary: `/sellers/dashboard-summary`
- subscription snapshot: `/subscription/me`

## 4) POS Control Center Manual

Route: `/seller/pos`

This page now focuses on POS device lifecycle and seller session controls.

### 4.1 POS Device Management

Functions:

- create POS device account
- optional generated password flow
- assign branch and cashier/user ID
- set device status
- launch POS as selected device
- edit/deactivate POS account
- view active sessions
- force logout active sessions

## Billing Module Manual

Route: `/seller/billing`

### Core Purpose

- centralizes subscription plan and billing workflows
- separates subscription/invoice workflows from POS device operations

### Main Contents

- subscription status card (plan, billing state, slot usage summary)
- plan checkout (upgrade/downgrade with timing controls)
- add-more-slots modal (preview + prorated calculations)
- downgrade confirmation flow
- latest invoice snapshot
- latest payment transaction snapshot
- recent invoices list
- subscription lifecycle history list
- recent payment transactions list

### Access Behavior

- module follows billing feature lock rules
- free plan users are prompted to upgrade when opening this module

## Multi-Branch Module Manual

Route: `/seller/branches`

### Core Purpose

- dedicated branch CRUD and branch status operations
- keeps branch management separate from POS device/session controls

### Main Contents

- create branch (name/address/contact)
- list branches
- set active/inactive
- archive
- delete (default branch protected)

### POS Integration

- branches created here are used in POS device assignment dropdowns
- subscription branch counts and branch-related limits still reflect these branch records

## 5) Products Module Manual

Route: `/seller/products`

Powered by ProductManagement component.

### 5.1 Core Purpose

- product catalog CRUD for seller tenant
- integrates store config behavior (expiry tracking, tax defaults)

### 5.2 Main Contents

- searchable/filterable product table
- pagination controls
- product add/edit modal with fields:
  - name
  - barcode
  - expiry date (required when expiry tracking enabled)
  - price
  - stock
  - unit
  - category
  - status
  - tax type/rate
  - product image(s)

### 5.3 Tax and Store Behavior

- reads store config tax defaults and business tax type
- applies category tax defaults on create
- enforces non-VAT behavior when configured

## 6) Inventory Module Manual

Route: `/seller/inventory`

### 6.1 Purpose

- operational stock synchronization and correction for seller products

### 6.2 Contents

- inventory search input
- table columns:
  - product
  - category
  - unit
  - stock
  - status
  - update stock control
- per-row stock update + save action

## 7) Order Management Module Manual

Route: `/seller/orders`

Powered by SellerTrackingPanel.

### 7.1 Purpose

- monitor seller orders and rider movement
- perform seller-side order lifecycle actions

### 7.2 Main Contents

- live seller order list cards with status and totals
- track rider button for trackable statuses
- tracking map with rider/seller/buyer context
- live updates via delivery socket events
- automatic polling and query invalidation

### 7.3 Seller Order Action Flows

- prepare order
- mark ready for pickup
- decline order (requires reason)
- load pickup QR for rider handoff statuses

### 7.4 Seller Location Share

- shares seller location for delivery-relevant statuses
- uses geolocation permission
- pushes seller coordinates at interval while active order is tracked

## 8) Settings (Store Config) Manual

Route: `/seller/store-config`

### 8.1 Core Purpose

Tenant-level operational behavior control without hardcoding per seller.

### 8.2 Major Configuration Groups

1. Store Type and Preferred POS Mode
- store type selection
- max line items
- preferred POS device mode

2. Feature Flags
- barcode scanning
- expiry tracking
- prescription required
- bulk quantity input

3. Scanner Modes
- enabled scanner modes
- default scanner mode

4. Category Visuals
- category thumbnail shape
- category labels and images

5. Printer Setup (Adaptive)
- adapter selection (runtime-aware)
- paper size
- desktop printer name
- auto print toggle
- bridge health
- setup checklist with progress badges
- connect bridge
- test print
- reset checklist progress
- expand/collapse all sections
- persisted UI section state and checklist state per seller store

6. Access Control Overrides
- seller-level override editor for:
  - forced enabled features
  - forced disabled features
  - granted permission list
  - revoked permission list
- allows saving override payload to subscription access control API (`/subscription/access-control`)

7. Plan Feature Flags Diagnostics
- read-only effective feature visibility (enabled/locked)
- active permission chips for policy verification

## 9) Seller Pending Approval Page

Route: `/seller/pending`

### 9.1 Purpose

- post-registration holding screen while admin review is pending
- auto-retries login at interval with saved registration credentials

### 9.2 Contents

- status message
- last checked time
- next check countdown
- fallback links to login or landing
- auto-redirect to dashboard when seller becomes active

## 10) Module Locking and Placeholder Behavior

For module routes that exist in navigation but do not yet have dedicated implementation pages:

- dynamic route `/seller/[module]` handles rendering
- if module is locked by feature gate:
  - shows locked module panel
  - shows upgrade message
- if module is enabled but not implemented:
  - shows scaffold message indicating API/table integration pending

## 11) Recommended Daily Seller Workflow

1. Open Dashboard
- review subscription banner, KPI widgets, and notifications

2. Check Onboarding and Locked Modules
- identify next milestone or required upgrade

3. Process Orders
- use Order Management for active queue and rider tracking

4. Maintain Catalog and Stock
- update products and inventory stock levels

5. Manage POS Operations
- verify active devices, sessions, branches, and slot capacity

6. Review Settings
- adjust scanner/printing/store behavior as operations evolve

## 12) Quick Troubleshooting Guide

1. A module is visible but cannot be opened
- check feature flag lock for current plan
- review access-control overrides in Dashboard

2. Dashboard metrics look stale
- refresh seller dashboard summary query sources
- check API availability for `/sellers/dashboard-summary`

3. POS device cannot launch
- verify device status is active
- verify slots are available
- check active session policies

4. Printer setup shows unavailable
- verify runtime-adapter compatibility
- run Connect Bridge then Test Print in Settings

5. Seller still pending after approval
- re-login from `/login` if pending session credentials expired

---

Owner audience: Seller Admin / Store Owner / Operations Manager

Last updated: 2026-05-29
