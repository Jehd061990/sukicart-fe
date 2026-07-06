# POS-Centric Online Order Management Plan

## Scope
- Remove seller-side Order Management module entry points.
- Consolidate walk-in checkout and online order fulfillment inside POS.
- Support branch-shared queue, first-claim locking, rider dispatch lifecycle, and multi-terminal sync.

## Current Delivery In This Change
- Seller sidebar Order Management link removed.
- Seller dashboard module card for Orders removed.
- Legacy route /seller/orders redirected to /seller/pos.
- POS includes Online Orders panel in same interface as Walk-In Sales.
- POS Online Orders panel has status buckets, order details, lifecycle actions, optimistic status updates, and real-time refresh hooks.

## Target Database Schema (Backend)

### 1) orders
- _id: ObjectId
- tenantId: ObjectId (required, indexed)
- branchId: ObjectId (required, indexed)
- type: enum[ONLINE, POS]
- channel: enum[MARKETPLACE, WALK_IN, PHONE]
- status: enum[
  NEW_ORDER,
  PREPARING,
  READY_FOR_PICKUP,
  RIDER_ASSIGNED,
  RIDER_ARRIVED,
  PICKED_UP,
  DELIVERED,
  COMPLETED,
  CANCELLED
]
- paymentMethod: enum[CASH, GCASH, CARD, COD]
- totalAmount: number
- customer: {
  customerId?: ObjectId,
  name: string,
  phone: string,
  address: string,
  location?: { lat: number, lng: number }
}
- items: [{
  productId: ObjectId,
  name: string,
  quantity: number,
  unitPrice: number,
  lineTotal: number,
  notes?: string
}]
- assignedHandlerUserId?: ObjectId (cashier/staff who claimed)
- assignedHandlerAt?: Date
- assignedPosSessionId?: ObjectId
- assignedRiderId?: ObjectId
- riderEtaMinutes?: number
- version: number (optimistic concurrency)
- createdAt, updatedAt

Indexes:
- { tenantId: 1, branchId: 1, status: 1, createdAt: -1 }
- { tenantId: 1, branchId: 1, assignedHandlerUserId: 1, updatedAt: -1 }
- { tenantId: 1, branchId: 1, type: 1, createdAt: -1 }

### 2) order_timeline_events
- _id
- tenantId, branchId, orderId
- eventType: enum[CREATED, CLAIMED, STATUS_CHANGED, RIDER_ASSIGNED, TRANSFERRED, CANCELLED]
- fromStatus?: string
- toStatus?: string
- actorUserId?: ObjectId
- actorRole?: enum[POS, SELLER, ADMIN, SYSTEM]
- metadata?: object
- createdAt

Indexes:
- { tenantId: 1, branchId: 1, orderId: 1, createdAt: 1 }

### 3) rider_dispatch_state
- _id
- tenantId, branchId, orderId, riderId
- status: enum[
  AVAILABLE,
  ASSIGNED,
  ON_THE_WAY_TO_STORE,
  WAITING_FOR_PICKUP,
  PICKED_UP,
  OUT_FOR_DELIVERY,
  DELIVERED
]
- contactNumber: string
- etaMinutes?: number
- updatedAt

Indexes:
- { tenantId: 1, branchId: 1, orderId: 1 }
- { tenantId: 1, branchId: 1, riderId: 1, status: 1 }

## API Endpoints

### POS Online Queue
- GET /api/pos/orders/queue?branchId=&status=&limit=&cursor=
  - Returns branch-isolated online orders and counters.
- GET /api/pos/orders/:orderId
  - Full order detail + timeline + rider state.
- POST /api/pos/orders/:orderId/claim
  - First-claim lock endpoint (atomic).
  - Body: { expectedVersion }
- POST /api/pos/orders/:orderId/transfer
  - Manager-only reassignment.
  - Body: { targetUserId, reason }
- PATCH /api/pos/orders/:orderId/status
  - Body: { toStatus, expectedVersion }

### Rider Dispatch
- POST /api/pos/orders/:orderId/rider/assign
  - Body: { riderId }
- PATCH /api/pos/orders/:orderId/rider/status
  - Body: { status, etaMinutes? }
- GET /api/pos/orders/:orderId/rider

### Metrics
- GET /api/pos/orders/metrics?branchId=&from=&to=
  - pendingCount
  - preparingCount
  - readyCount
  - waitingRiderCount
  - completedToday
  - cancelledToday
  - avgPrepMinutes
  - avgDeliveryMinutes

## Socket.IO Events

### Rooms
- tenant:{tenantId}:branch:{branchId}:orders
- order:{orderId}

### Server -> Client
- pos.order.created
- pos.order.claimed
- pos.order.status.changed
- pos.order.transferred
- pos.order.rider.assigned
- pos.order.rider.status.changed
- pos.order.metrics.updated

### Client -> Server
- pos.orders.subscribe { branchId }
- pos.order.subscribe { orderId }
- pos.order.claim { orderId, expectedVersion }
- pos.order.status.change { orderId, toStatus, expectedVersion }
- pos.order.transfer { orderId, targetUserId, reason }

Ack payload for mutation events:
- { ok: boolean, code?: "VERSION_CONFLICT" | "ALREADY_CLAIMED" | "FORBIDDEN", data?: any }

## POS Workflow
1. POS terminal subscribes to branch orders room.
2. New online order appears in New Orders for all terminals in same branch.
3. First cashier taps Prepare Order.
4. Backend atomically sets assignedHandlerUserId + PREPARING (if still NEW_ORDER).
5. Server broadcasts claimed+status events to branch room.
6. Other terminals disable Prepare and show assigned cashier.
7. Progress continues READY_FOR_PICKUP -> RIDER_ASSIGNED -> PICKED_UP -> DELIVERED -> COMPLETED.

## Rider Workflow
1. Store assigns rider or auto-dispatch selects rider.
2. Rider app receives assignment.
3. Rider updates statuses: ON_THE_WAY_TO_STORE -> WAITING_FOR_PICKUP -> PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED.
4. POS sees live updates on order cards and detail timeline.

## Multi-Branch Architecture
- Every order mutation is tenant + branch scoped.
- Middleware enforces branch visibility from POS session branchId.
- Socket subscriptions only join branch rooms user is authorized for.
- No cross-branch reads or writes.

## State Management (Frontend)
- TanStack Query:
  - pos-online-orders queue
  - pos-online-order-detail
  - pos-online-order-metrics
- Optimistic updates for claim/status/transfer.
- Rollback on conflict codes.
- Socket events invalidate or patch query cache.
- Offline:
  - queue intended actions in IndexedDB
  - replay when online
  - resolve conflicts with version checks

## Role Permissions
- POS Cashier:
  - view branch queue
  - claim order
  - update allowed statuses
  - cannot transfer unless manager scope granted
- Branch Manager:
  - all cashier actions
  - transfer/reassign handler
  - assign rider
- Seller Owner/Admin:
  - cross-branch reporting
  - policy and SLA configuration

## UI/UX Design Notes
- Keep a single POS shell with tabs:
  - Walk-In Sales
  - Online Orders
- Large touch targets for action buttons.
- Color-coded status badges.
- Sticky live counters.
- New-order toast + sound on branch room event.
- Desktop/tablet responsive two-pane order list + details.

## Implementation Phases

### Phase 1 (Now)
- Route ownership move to POS.
- POS Online Orders tab and baseline queue UI.
- Realtime invalidation wiring.

### Phase 2
- Backend branch queue endpoints + atomic claim lock.
- POS calls new endpoints and expectedVersion concurrency.
- Timeline event persistence.

### Phase 3
- Rider dispatch endpoints + rider status cards.
- Transfer order flow with manager permission checks.

### Phase 4
- Metrics endpoint + dashboard widgets.
- SLA alarms and delayed-order indicators.
- Offline mutation queue replay with conflict UI.

## Migration Notes
- Keep /seller/orders as redirect during transition.
- Remove redirect route only after all user bookmarks and docs are updated.
- Backfill branchId on legacy online orders before strict branch scoping.
