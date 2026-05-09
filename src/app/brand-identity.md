# SukiGo Brand Identity

SukiGo should feel fresh, trustworthy, and approachable for local wet market buyers and sellers.

## Brand Personality

- Friendly: easy, human, and non-intimidating interactions.
- Local: practical, community-first tone.
- Trustworthy: clear hierarchy, predictable patterns, readable text.
- Affordable & Active: subtle warmth for deals, urgency, and momentum.

## Core Palette

### Fresh Green (Primary)

- `brand-50`: `#f3faf5`
- `brand-100`: `#e3f4e8`
- `brand-200`: `#c5e8d0`
- `brand-300`: `#9bd7b0`
- `brand-400`: `#6fc58f`
- `brand-500`: `#45b06f`
- `brand-600`: `#2f9257` (Primary default)
- `brand-700`: `#247245`
- `brand-800`: `#1f5b38`
- `brand-900`: `#1c4a31`

### Warm Orange (Accent)

- `deal-50`: `#fff6ee`
- `deal-100`: `#ffe9d6`
- `deal-200`: `#ffd1ab`
- `deal-300`: `#ffb87f`
- `deal-400`: `#ff9e56`
- `deal-500`: `#f58a2a` (Deals/notification highlight)
- `deal-600`: `#d96f15`
- `deal-700`: `#b55a14`
- `deal-800`: `#924816`
- `deal-900`: `#783d17`

## Semantic Roles

- Primary actions: `primary` (`brand-600`) with `primary-foreground` white.
- Secondary surfaces: `secondary` (`brand-100`) with dark green text.
- Deal/urgency surfaces: `accent` (`deal-100`) with warm deep brown text.
- Notification chips/discount tags: `deal` (`deal-500`) with dark foreground.
- Borders/inputs: soft green-neutral (`#dce7df`) to avoid harsh contrast.

## Accessibility Guardrails

- Keep normal body text contrast at least WCAG AA ($4.5:1$).
- Use `primary-foreground` on filled primary buttons, never light gray text.
- Prefer `deal-100` for larger highlighted surfaces and `deal-500` for compact emphasis (badges, counters).
- For disabled states, reduce saturation and increase tonal separation instead of only lowering opacity.
- Always keep focus-visible ring states enabled for keyboard users.

## Usage by Product Areas

- Buyer flow: emphasize trust and clarity with `brand` tones; use `deal` for promos and flash offers.
- Seller flow: use `brand` hierarchy for forms, status, and action confidence.
- Rider flow: keep status urgency subtle with `deal` accents and high-contrast text.
- Admin flow: mostly neutral + `brand` utility; reserve `deal` for alerts or action-required items.

## Practical Tailwind Usage

- Backgrounds: `bg-brand-50`, `bg-brand-100`, `bg-deal-50`
- Primary actions: `bg-brand-600 hover:bg-brand-700 text-white`
- Accent actions: `bg-deal-500 hover:bg-deal-600 text-white`
- Borders: `border-brand-200`
- Informational text: `text-gray-600` / `text-gray-700` with brand accents only where meaningful
