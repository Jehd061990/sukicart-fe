import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminRiderAssignment } from "@/types/admin";

interface RiderAssignmentDebugPanelProps {
  assignments: AdminRiderAssignment[];
  isLoading: boolean;
  error: string;
  filterValue: string;
  activeFilter: string;
  onFilterChange: (value: string) => void;
  onApplyFilter: () => void;
  onClearFilter: () => void;
  onRefresh: () => void;
}

const toSeconds = (ms: number | null) => {
  if (!Number.isFinite(ms)) {
    return "-";
  }

  return `${Math.ceil(Number(ms) / 1000)}s`;
};

export function RiderAssignmentDebugPanel({
  assignments,
  isLoading,
  error,
  filterValue,
  activeFilter,
  onFilterChange,
  onApplyFilter,
  onClearFilter,
  onRefresh,
}: RiderAssignmentDebugPanelProps) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Rider Assignment Debug
          </p>
          <h2 className="mt-1 text-lg font-semibold">Live Rotation Sessions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Auto-refreshes every 10 seconds while this page is open.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={onRefresh}>
          Refresh now
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="w-full max-w-md space-y-1">
          <label
            htmlFor="assignment-order-filter"
            className="text-xs font-medium text-muted-foreground"
          >
            Filter by order id
          </label>
          <Input
            id="assignment-order-filter"
            value={filterValue}
            onChange={(event) => onFilterChange(event.target.value)}
            placeholder="Paste order id (optional)"
          />
        </div>

        <Button variant="outline" size="sm" onClick={onApplyFilter}>
          Apply
        </Button>
        <Button variant="ghost" size="sm" onClick={onClearFilter}>
          Clear
        </Button>
      </div>

      {activeFilter ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Showing assignment state for order: {activeFilter}
        </p>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {isLoading && assignments.length === 0 ? (
        <div className="mt-4 rounded-lg border bg-background p-4 text-sm text-muted-foreground">
          Loading active assignment sessions...
        </div>
      ) : null}

      {!isLoading && assignments.length === 0 ? (
        <div className="mt-4 rounded-lg border bg-background p-4 text-sm text-muted-foreground">
          No active rider assignment sessions found.
        </div>
      ) : null}

      {assignments.length > 0 ? (
        <div className="mt-4 space-y-3">
          {assignments.map((session) => (
            <article
              key={session.orderId}
              className="rounded-xl border bg-background p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Order
                  </p>
                  <p className="font-mono text-sm font-medium">
                    {session.orderId}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    Offer left: {toSeconds(session.remainingOfferMs)}
                  </Badge>
                  <Badge variant="warning">
                    Fallback: {session.fallbackStatus}
                  </Badge>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <p>Current index: {session.currentIndex}</p>
                <p>Current rider: {session.currentRiderId || "-"}</p>
                <p>Candidates: {session.candidateCount}</p>
              </div>

              <div className="mt-3 overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Turn</th>
                      <th className="px-3 py-2">Rider</th>
                      <th className="px-3 py-2">Distance</th>
                      <th className="px-3 py-2">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.candidates.map((candidate) => {
                      const isCurrent =
                        candidate.index === session.currentIndex;

                      return (
                        <tr
                          key={`${session.orderId}-${candidate.riderId}-${candidate.index}`}
                          className={isCurrent ? "bg-emerald-50/70" : ""}
                        >
                          <td className="px-3 py-2 font-mono text-xs">
                            {candidate.index + 1}
                          </td>
                          <td className="px-3 py-2">
                            <p className="font-medium">
                              {candidate.riderName || "Unnamed"}
                            </p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {candidate.riderId}
                            </p>
                          </td>
                          <td className="px-3 py-2">
                            {candidate.distanceKm.toFixed(2)} km
                          </td>
                          <td className="px-3 py-2">
                            {isCurrent ? (
                              <Badge variant="success">Offering now</Badge>
                            ) : (
                              <Badge variant="secondary">Queued</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
