import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, Clock } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { calendarService, type CalendarEvent } from "@/services/mentor-invite.service";

const EVENT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#f97316",
];

const EVENT_TYPE_COLORS: Record<string, string> = {
  class:       "#6366f1",
  meeting:     "#3b82f6",
  demo:        "#8b5cf6",
  followup:    "#f59e0b",
  holiday:     "#10b981",
  deadline:    "#ef4444",
  other:       "#94a3b8",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function EventModal({ event, onClose }: { event?: Partial<CalendarEvent>; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<CalendarEvent>>(event ?? {
    title: "",
    event_type: "other",
    starts_at: new Date().toISOString().slice(0, 16),
    color: "#6366f1",
    all_day: false,
  });

  const save = useMutation({
    mutationFn: async () => {
      const r = event?.id
        ? await calendarService.updateEvent(event.id, form)
        : await calendarService.createEvent(form);
      if (!r.success) throw r.error;
    },
    onSuccess: () => {
      toast.success(event?.id ? "Event updated" : "Event created");
      void qc.invalidateQueries({ queryKey: ["calendar-events"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!event?.id) return;
      const r = await calendarService.deleteEvent(event.id);
      if (!r.success) throw r.error;
    },
    onSuccess: () => {
      toast.success("Event deleted");
      void qc.invalidateQueries({ queryKey: ["calendar-events"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-lg font-black text-foreground">{event?.id ? "Edit Event" : "New Event"}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label htmlFor="event-title" className="mb-1.5 block text-xs font-bold text-muted-foreground">Title *</label>
            <input
              id="event-title"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.title ?? ""}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Event title…"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="event-type" className="mb-1.5 block text-xs font-bold text-muted-foreground">Type</label>
              <select
                id="event-type"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.event_type ?? "other"}
                onChange={e => setForm(f => ({ ...f, event_type: e.target.value, color: EVENT_TYPE_COLORS[e.target.value] ?? "#94a3b8" }))}
              >
                {Object.keys(EVENT_TYPE_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-bold text-muted-foreground">Color</span>
              <div role="group" aria-label="Event color" className="flex flex-wrap gap-2 mt-1">
                {EVENT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    aria-label={`Color ${c}`}
                    aria-pressed={form.color === c}
                    className={`size-6 rounded-full transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${form.color === c ? "scale-125 ring-2 ring-offset-2 ring-primary" : ""}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="event-start" className="mb-1.5 block text-xs font-bold text-muted-foreground">Start Date & Time *</label>
            <input
              id="event-start"
              type="datetime-local"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.starts_at?.slice(0, 16) ?? ""}
              onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="event-end" className="mb-1.5 block text-xs font-bold text-muted-foreground">End Date & Time</label>
            <input
              id="event-end"
              type="datetime-local"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.ends_at?.slice(0, 16) ?? ""}
              onChange={e => setForm(f => ({ ...f, ends_at: e.target.value || null }))}
            />
          </div>
          <div>
            <label htmlFor="event-description" className="mb-1.5 block text-xs font-bold text-muted-foreground">Description</label>
            <textarea
              id="event-description"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
              value={form.description ?? ""}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.all_day ?? false} onChange={e => setForm(f => ({ ...f, all_day: e.target.checked }))} className="rounded" />
            <span className="text-sm font-semibold">All day event</span>
          </label>
        </div>
        <div className="flex items-center justify-between border-t border-border p-5">
          <div>
            {event?.id && (
              <button
                onClick={() => remove.mutate()}
                disabled={remove.isPending}
                className="rounded-xl border border-destructive/30 px-4 py-2 text-sm font-bold text-destructive-text hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Cancel</button>
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || !form.title || !form.starts_at}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {save.isPending ? "Saving…" : event?.id ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [modal, setModal] = useState<Partial<CalendarEvent> | null | "new">(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const startDate = new Date(year, month, 1).toISOString();
  const endDate = new Date(year, month + 1, 0).toISOString();

  const { data: events = [] } = useQuery({
    queryKey: ["calendar-events", year, month],
    queryFn: async () => {
      const r = await calendarService.getEvents(startDate, endDate);
      if (!r.success) return [];
      return r.data;
    },
  });

  // Group events by day
  const eventsByDay = events.reduce<Record<number, CalendarEvent[]>>((acc, evt) => {
    const d = new Date(evt.starts_at).getDate();
    if (!acc[d]) acc[d] = [];
    acc[d].push(evt);
    return acc;
  }, {});

  const today = new Date();
  const todayDay = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : -1;

  const selectedDayEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage classes, meetings, and institutional events.</p>
        </div>
        <button
          onClick={() => setModal("new")}
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-4" aria-hidden="true" /> New Event
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Calendar Grid */}
        <div className="xl:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
          {/* Navigation */}
          <div className="mb-5 flex items-center justify-between">
            <button
              onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              aria-label="Previous month"
              className="rounded-xl p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <h2 className="text-lg font-black text-foreground">
              {MONTHS[month]} {year}
            </h2>
            <button
              onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              aria-label="Next month"
              className="rounded-xl p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>

          {/* Day headers */}
          <div className="mb-2 grid grid-cols-7 text-center">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-xs font-black uppercase tracking-wider text-muted-foreground">{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-card h-20 p-2" />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = eventsByDay[day] ?? [];
              const isToday = day === todayDay;
              const isSelected = day === selectedDay;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  aria-current={isToday ? "date" : undefined}
                  aria-pressed={isSelected}
                  className={`bg-card h-20 p-2 text-left transition-all hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${isSelected ? "ring-2 ring-inset ring-primary" : ""}`}
                >
                  <span className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                  }`}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map(evt => (
                      <div
                        key={evt.id}
                        className="truncate rounded px-1 py-0.5 text-xs font-semibold text-white"
                        style={{ background: evt.color ?? "#6366f1" }}
                      >
                        {evt.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-muted-foreground">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Events */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 font-black text-foreground">
            {selectedDay
              ? `${MONTHS[month]} ${selectedDay}`
              : "Events This Month"}
          </h3>
          <div className="space-y-3">
            {(selectedDay ? selectedDayEvents : events.slice(0, 10)).map((evt: CalendarEvent) => (
              <button
                key={evt.id}
                onClick={() => setModal(evt)}
                className="w-full text-left rounded-xl border border-border p-3 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 size-3 rounded-full flex-none" style={{ background: evt.color ?? "#6366f1" }} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{evt.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="size-3" aria-hidden="true" />
                      {new Date(evt.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" · "}
                      <span className="capitalize">{evt.event_type}</span>
                    </p>
                  </div>
                </div>
              </button>
            ))}
            {(selectedDay ? selectedDayEvents : events).length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <CalendarIcon className="mx-auto mb-3 size-10 opacity-30" aria-hidden="true" />
                <p>No events {selectedDay ? "on this day" : "this month"}</p>
                <button
                  onClick={() => setModal("new")}
                  className="mt-2 rounded text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Create one
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {modal !== null && (
          <EventModal
            event={modal === "new" ? undefined : modal}
            onClose={() => { setModal(null); setSelectedDay(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
