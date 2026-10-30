"use client";

import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ClipboardCheck,
  ImageOff,
  MapPin,
  RotateCcw,
  UserPlus,
} from "lucide-react";
import { MapContainer } from "@/components/ui/MapContainer";
import type { MapPoint } from "@/components/ui/map-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectOptions,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { inspectionStatus } from "@/lib/inspection-status";
import {
  assignAction,
  commentAction,
  loadInspectionDrawer,
  transitionAction,
  type InspectionDrawerData,
} from "./actions";

type Loaded = Extract<InspectionDrawerData, { ok: true }>;

/** Primary footer action per status, in preference order, with its button label. */
const PRIMARY: Record<string, string> = {
  approve: "Approve record",
  close: "Close record",
  start_review: "Start review",
};

function fmt(ts: unknown): string {
  if (typeof ts !== "string" || !ts) return "—";
  return new Date(ts).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const humanize = (s: string) =>
  s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function formValue(v: unknown): string {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return fmt(v);
  if (Array.isArray(v)) return v.map(formValue).join(", ");
  // Option codes such as partially_compliant read as words.
  if (typeof v === "string" && /^[a-z]+(_[a-z]+)+$/.test(v)) return humanize(v);
  if (v && typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/**
 * Inspection detail in a right-hand drawer on the list route (`?inspection=<id>`):
 * Overview (assignment, GPS, field notes, activity), Evidence and Review (remarks and
 * comments). Workflow actions sit in the footer; every write goes through the same
 * authorized RPCs as the full detail page, then the drawer and list refresh.
 */
export function InspectionDrawer({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignee, setAssignee] = useState("");
  const [pending, startSaving] = useTransition();

  const load = useCallback((target: string) => {
    void loadInspectionDrawer(target).then((res) =>
      startTransition(() => {
        setLoadedId(target);
        if (res.ok) {
          setData(res);
          setError(null);
        } else {
          setData(null);
          setError(res.error);
        }
      }),
    );
  }, []);

  // A different inspection starts on Overview with a clean review form.
  useEffect(() => {
    if (!id) return;
    startTransition(() => {
      setNote("");
      setComment("");
      setShowMap(false);
      setTab("overview");
    });
    load(id);
  }, [id, load]);

  const loading = id != null && loadedId !== id;
  const insp = !loading ? data?.detail.inspection : undefined;

  const mapPoints = useMemo<MapPoint[]>(() => {
    if (!data) return [];
    const i = data.detail.inspection;
    const lat = i.gps_latitude ?? i.latitude;
    const lon = i.gps_longitude ?? i.longitude;
    const points: MapPoint[] = [];
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      points.push({
        id: "inspection",
        lat: lat as number,
        lon: lon as number,
        label: `${i.ref_no} — inspection location`,
      });
    }
    for (const e of data.detail.evidence) {
      if (e.latitude != null && e.longitude != null) {
        points.push({
          id: e.id,
          lat: e.latitude,
          lon: e.longitude,
          label: `Evidence (${e.media_type})`,
        });
      }
    }
    return points;
  }, [data]);

  function afterWrite(message: string) {
    toast.success(message);
    if (id) load(id);
    router.refresh();
  }

  function runTransition(action: string) {
    if (!id) return;
    if (action === "rework" && !note.trim()) {
      setTab("review");
      toast.error("Enter a review comment explaining the rework");
      return;
    }
    const fd = new FormData();
    fd.set("id", id);
    fd.set("action", action);
    if (note.trim()) fd.set("note", note.trim());
    startSaving(async () => {
      const res = await transitionAction({ ok: false, error: null }, fd);
      if (res.ok) {
        setNote("");
        afterWrite(
          action === "rework"
            ? "Sent back for rework"
            : `${humanize(action)} applied`,
        );
      } else toast.error(res.error ?? "Action failed");
    });
  }

  function submitAssign() {
    if (!id || !assignee) return;
    const fd = new FormData();
    fd.set("id", id);
    fd.set("assignee", assignee);
    startSaving(async () => {
      const res = await assignAction({ ok: false, error: null }, fd);
      if (res.ok) {
        setAssignOpen(false);
        afterWrite("Inspection assigned");
      } else toast.error(res.error ?? "Assignment failed");
    });
  }

  function submitComment() {
    if (!id || !comment.trim()) return;
    const fd = new FormData();
    fd.set("id", id);
    fd.set("body", comment.trim());
    startSaving(async () => {
      const res = await commentAction({ ok: false, error: null }, fd);
      if (res.ok) {
        setComment("");
        afterWrite("Comment added");
      } else toast.error(res.error ?? "Could not add comment");
    });
  }

  const actions = data?.actions ?? [];
  const primary = Object.keys(PRIMARY).find((a) =>
    actions.some((x) => x.action === a),
  );
  const canRework = actions.some((a) => a.action === "rework");
  const canAssign =
    Boolean(data?.detail.can_manage) &&
    actions.some((a) => a.action === "assign");
  const staffItems = (data?.staff ?? []).map((s) => ({
    value: s.user_id,
    label: s.employee_id ? `${s.full_name} (${s.employee_id})` : s.full_name,
  }));
  const status = insp ? inspectionStatus(insp.status) : null;
  const formEntries = insp
    ? Object.entries(insp.form_data ?? {}).filter(
        ([, v]) => v !== null && v !== undefined && v !== "",
      )
    : [];
  const lat = insp ? (insp.gps_latitude ?? insp.latitude) : null;
  const lon = insp ? (insp.gps_longitude ?? insp.longitude) : null;

  return (
    <Sheet
      open={id != null}
      onOpenChange={(open) => !open && !pending && onClose()}
    >
      <SheetContent
        className="w-full gap-0 p-0 data-[side=right]:sm:max-w-xl"
        data-testid="inspection-drawer"
      >
        <SheetHeader className="border-b px-6 py-5">
          <p className="text-[0.6875rem] font-bold tracking-widest text-info uppercase">
            Inspection detail
          </p>
          <SheetTitle
            className="text-xl font-normal text-primary"
            data-testid="inspection-ref"
          >
            {insp?.ref_no ?? (error ? "Inspection" : "Loading…")}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Inspection overview, evidence and review.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error || !insp || !data ? (
          <p className="m-6 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error ?? "Could not load this inspection."}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3 px-6 pt-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info">
                <ClipboardCheck className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {insp.type_name ?? "Inspection"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {insp.location_name || insp.title}
                  {insp.department_name ? ` · ${insp.department_name}` : ""}
                </p>
              </div>
              {status && (
                <Badge variant={status.variant} data-testid="detail-status">
                  {status.label}
                </Badge>
              )}
            </div>

            <Tabs
              value={tab}
              onValueChange={(v) => setTab(String(v))}
              className="min-h-0 flex-1 gap-0"
            >
              <TabsList
                variant="line"
                className="mt-4 h-11 w-full justify-start gap-5 border-b px-6"
              >
                <TabsTrigger value="overview" className="flex-none px-0">
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="evidence"
                  className="flex-none px-0"
                  data-testid="tab-evidence"
                >
                  Evidence ({data.detail.evidence.length})
                </TabsTrigger>
                <TabsTrigger
                  value="review"
                  className="flex-none px-0"
                  data-testid="tab-review"
                >
                  Review
                </TabsTrigger>
              </TabsList>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <TabsContent value="overview" className="space-y-6">
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Assignment</h3>
                      {canAssign && (
                        <Dialog
                          open={assignOpen}
                          onOpenChange={(o) => !pending && setAssignOpen(o)}
                        >
                          <DialogTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-info"
                                data-testid="assign-open"
                              />
                            }
                          >
                            <UserPlus />{" "}
                            {insp.assignee_name ? "Reassign" : "Assign"}
                          </DialogTrigger>
                          <DialogContent
                            className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
                          >
                            <DialogHeader>
                              <DialogTitle>Assign inspection</DialogTitle>
                              <DialogDescription>
                                The officer receives it on the mobile app.
                              </DialogDescription>
                            </DialogHeader>
                            <Field>
                              <FieldLabel htmlFor="drawer-assignee">
                                Assign to
                              </FieldLabel>
                              <Select
                                items={staffItems}
                                value={assignee || null}
                                onValueChange={(v) => setAssignee(v ?? "")}
                              >
                                <SelectTrigger
                                  id="drawer-assignee"
                                  className="w-full"
                                  data-testid="assign-select"
                                >
                                  <SelectValue placeholder="Select field officer" />
                                </SelectTrigger>
                                <SelectContent alignItemWithTrigger={false}>
                                  <SelectOptions items={staffItems} />
                                </SelectContent>
                              </Select>
                            </Field>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setAssignOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={submitAssign}
                                disabled={pending || !assignee}
                                data-testid="assign-submit"
                              >
                                {pending ? "Assigning…" : "Assign"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                    <dl className="grid grid-cols-2 overflow-hidden rounded-lg border text-sm [&>div]:border-border [&>div]:p-3 [&>div:nth-child(-n+2)]:border-b [&>div:nth-child(odd)]:border-r">
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Assigned officer
                        </dt>
                        <dd
                          className="font-semibold"
                          data-testid="detail-assignee"
                        >
                          {insp.assignee_name ?? "Unassigned"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Priority
                        </dt>
                        <dd className="font-semibold capitalize">
                          {insp.priority}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Scheduled
                        </dt>
                        <dd className="font-semibold">
                          {fmt(insp.scheduled_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Department
                        </dt>
                        <dd className="font-semibold">
                          {insp.department_name ?? "—"}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-medium">GPS coordinates</h3>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="flex items-center gap-3">
                        <MapPin className="size-4 shrink-0 text-info" />
                        <div className="min-w-0 flex-1 text-xs">
                          <p className="font-semibold">
                            {insp.gps_latitude != null
                              ? "Location captured"
                              : "Planned location"}
                          </p>
                          <p className="text-muted-foreground">
                            {Number.isFinite(lat) && Number.isFinite(lon)
                              ? `${(lat as number).toFixed(5)}, ${(lon as number).toFixed(5)}`
                              : "No coordinates"}
                            {typeof insp.gps_accuracy_m === "number"
                              ? ` · accuracy within ${Math.round(insp.gps_accuracy_m)} m`
                              : ""}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-info"
                          onClick={() => setShowMap((v) => !v)}
                          data-testid="view-map"
                        >
                          {showMap ? "Hide map" : "View map"}
                        </Button>
                      </div>
                      {showMap && (
                        <div className="mt-3">
                          <MapContainer
                            label={`${insp.ref_no} location`}
                            height={220}
                            points={mapPoints}
                          />
                        </div>
                      )}
                    </div>
                  </section>

                  <section
                    className="space-y-2"
                    data-testid="inspection-form-data"
                  >
                    <h3 className="text-sm font-medium">Inspection notes</h3>
                    {formEntries.length === 0 && !insp.supervisor_remarks ? (
                      <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                        No field observations submitted yet.
                      </p>
                    ) : (
                      <dl className="space-y-3 rounded-lg bg-muted p-3 text-sm">
                        {formEntries.map(([key, value]) => (
                          <div key={key}>
                            <dt className="text-xs text-muted-foreground">
                              {humanize(key)}
                            </dt>
                            <dd className="whitespace-pre-wrap">
                              {formValue(value)}
                            </dd>
                          </div>
                        ))}
                        {insp.supervisor_remarks && (
                          <div>
                            <dt className="text-xs text-muted-foreground">
                              Supervisor remarks
                            </dt>
                            <dd className="whitespace-pre-wrap">
                              {insp.supervisor_remarks}
                            </dd>
                          </div>
                        )}
                      </dl>
                    )}
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-sm font-medium">Activity</h3>
                    <ol
                      className="space-y-3 border-l pl-4 text-sm"
                      data-testid="event-timeline"
                    >
                      {data.detail.events.map((ev) => (
                        <li key={ev.id} className="relative">
                          <span className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-info" />
                          <p>
                            <span className="font-medium">
                              {humanize(ev.action)}
                            </span>
                            {ev.to_status && (
                              <span className="text-muted-foreground">
                                {" "}
                                → {inspectionStatus(ev.to_status).label}
                              </span>
                            )}
                            {ev.actor_name && (
                              <span className="text-muted-foreground">
                                {" "}
                                by {ev.actor_name}
                              </span>
                            )}
                          </p>
                          {ev.note && (
                            <p className="text-muted-foreground">{ev.note}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {fmt(ev.created_at)}
                          </p>
                        </li>
                      ))}
                      {data.detail.events.length === 0 && (
                        <li className="text-muted-foreground">
                          No activity yet.
                        </li>
                      )}
                    </ol>
                  </section>
                </TabsContent>

                <TabsContent value="evidence" className="space-y-2">
                  <h3 className="text-sm font-medium">Evidence files</h3>
                  {data.detail.evidence.length === 0 ? (
                    <div className="flex h-36 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted text-sm text-muted-foreground">
                      <ImageOff className="size-5" />
                      No evidence captured yet.
                    </div>
                  ) : (
                    <ul
                      className="grid grid-cols-2 gap-3"
                      data-testid="evidence-list"
                    >
                      {data.detail.evidence.map((e) => {
                        const url = data.signedUrls[e.storage_path];
                        return (
                          <li
                            key={e.id}
                            data-testid={`evidence-${e.id}`}
                            className="overflow-hidden rounded-lg border border-dashed bg-muted"
                          >
                            <div className="aspect-video">
                              {url && e.media_type === "photo" ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={url}
                                    alt={`Evidence captured ${fmt(e.captured_at)}`}
                                    data-testid={`evidence-img-${e.id}`}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                </a>
                              ) : url && e.media_type === "video" ? (
                                <video
                                  src={url}
                                  controls
                                  data-testid={`evidence-video-${e.id}`}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                  {e.media_type} unavailable
                                </div>
                              )}
                            </div>
                            <div className="space-y-1 bg-card p-2 text-xs">
                              <p>
                                <span className="font-medium capitalize">
                                  {e.media_type}
                                </span>
                                <span className="text-muted-foreground">
                                  {" "}
                                  · {fmt(e.captured_at)}
                                </span>
                              </p>
                              {(e.is_mocked || e.clock_suspect) && (
                                <div className="flex gap-1">
                                  {e.is_mocked && (
                                    <Badge variant="destructive">mocked</Badge>
                                  )}
                                  {e.clock_suspect && (
                                    <Badge variant="warning">
                                      clock suspect
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </TabsContent>

                <TabsContent value="review" className="space-y-6">
                  {data.detail.can_manage && (primary || canRework) ? (
                    <section className="space-y-2">
                      <h3 className="text-sm font-medium">Supervisor review</h3>
                      <Field>
                        <FieldLabel htmlFor="review-note" className="text-xs">
                          Review comment
                          {canRework && " (required to send back for rework)"}
                        </FieldLabel>
                        <Textarea
                          id="review-note"
                          rows={4}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Add an audit-ready review comment…"
                          data-testid="transition-note"
                        />
                      </Field>
                    </section>
                  ) : data.detail.can_manage ? (
                    <p
                      className="rounded-lg bg-muted p-3 text-sm text-muted-foreground"
                      data-testid="no-review"
                    >
                      No review step is open while the inspection is{" "}
                      {status?.label.toLowerCase()}.
                    </p>
                  ) : (
                    <p
                      className="text-sm text-muted-foreground"
                      data-testid="no-manage"
                    >
                      You have view-only access to this inspection.
                    </p>
                  )}

                  <section className="space-y-2">
                    <h3 className="text-sm font-medium">
                      Comments ({data.detail.comments.length})
                    </h3>
                    <ul
                      className="space-y-2 text-sm"
                      data-testid="comment-list"
                    >
                      {data.detail.comments.map((c) => (
                        <li key={c.id} className="rounded-lg bg-muted p-3">
                          <p className="whitespace-pre-wrap">{c.body}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {c.author_name ?? "—"} · {fmt(c.created_at)}
                          </p>
                        </li>
                      ))}
                      {data.detail.comments.length === 0 && (
                        <li className="text-muted-foreground">
                          No comments yet.
                        </li>
                      )}
                    </ul>
                    {data.detail.can_manage && (
                      <div className="space-y-2" data-testid="comment-form">
                        <Textarea
                          rows={2}
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Message to field staff…"
                          aria-label="Comment"
                          data-testid="comment-body"
                        />
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            onClick={submitComment}
                            disabled={pending || !comment.trim()}
                            data-testid="comment-submit"
                          >
                            Post comment
                          </Button>
                        </div>
                      </div>
                    )}
                  </section>
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}

        <SheetFooter className="flex-row items-center justify-end border-t px-6 py-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={onClose}
              disabled={pending}
              data-testid="drawer-close"
            >
              Close
            </Button>
            {canRework && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => runTransition("rework")}
                disabled={pending}
                data-testid="action-rework"
              >
                <RotateCcw /> Rework
              </Button>
            )}
            {primary && (
              <Button
                size="lg"
                onClick={() => runTransition(primary)}
                disabled={pending}
                data-testid={`action-${primary}`}
              >
                <CheckCircle2 /> {pending ? "Saving…" : PRIMARY[primary]}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
