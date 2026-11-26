import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, Video, VideoOff, MessageSquare, Users, ScreenShare, PhoneOff, Send, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LiveClass } from "@/services/live-classes.service";
import { useLiveClassMessages, useLiveClassRoster, useSendLiveClassMessage } from "@/hooks/useLiveClasses";
import { formatIstTime } from "@/lib/date";

/**
 * SIMULATED classroom. There is no video/audio/WebRTC provider: camera, mic and
 * screen share only change local UI state and the room is labelled as simulated.
 * What IS real (shared through the database): who is in the class (attendance,
 * visible to the host), the class chat, and the class status - when the host
 * ends the class every participant's room switches to the ended state.
 */
export function LiveClassRoom({
  liveClass,
  selfId,
  selfName,
  selfRole,
  backTo,
  onEndClass,
  ending = false,
}: Readonly<{
  liveClass: LiveClass;
  selfId: string;
  selfName: string;
  selfRole: "host" | "participant";
  backTo: string;
  onEndClass?: () => void;
  ending?: boolean;
}>) {
  const navigate = useNavigate();
  const isHost = selfRole === "host";
  const isLive = liveClass.status === "live";
  const [micOn, setMicOn] = useState(isHost);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [participantsOpen, setParticipantsOpen] = useState(isHost);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // The room replaces the waiting/start view when a class goes live; move focus
  // to its title so keyboard and screen reader users are not left on <body>.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const { data: messages = [] } = useLiveClassMessages(liveClass.id, true);
  const send = useSendLiveClassMessage(liveClass.id);
  const { data: roster = [] } = useLiveClassRoster(liveClass.id, { enabled: isHost, poll: isHost });
  const present = roster.filter((r) => r.attendanceStatus === "present");

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const participants = isHost
    ? [{ id: "host", name: `${selfName} (you)`, host: true }, ...present.map((p) => ({ id: p.studentId, name: p.fullName ?? "Student", host: false }))]
    : [{ id: "host", name: liveClass.mentorName ?? "Teacher", host: true }, { id: "self", name: `${selfName} (you)`, host: false }];

  const handleSendMessage = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    send.mutate(trimmed, {
      onSuccess: () => setChatInput(""),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Message not sent."),
    });
  };

  const controlClass = (active: boolean, danger = false) =>
    [
      "flex size-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
      danger ? "bg-red-600 hover:bg-red-700" : active ? "bg-primary" : "bg-white/10 hover:bg-white/20",
    ].join(" ");

  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-border bg-slate-950 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 ref={titleRef} tabIndex={-1} className="truncate text-sm font-black focus:outline-none">{liveClass.title}</h1>
            <Badge variant={isLive ? "success" : "muted"} className="shrink-0">{isLive ? "Live" : liveClass.status}</Badge>
            <Badge variant="warning" className="shrink-0">Simulated room</Badge>
          </div>
          <p className="truncate text-xs font-semibold text-white/70">
            {liveClass.courseTitle} · {formatIstTime(liveClass.start_time)} – {formatIstTime(liveClass.end_time)} IST
          </p>
        </div>
        <button
          type="button"
          onClick={() => setParticipantsOpen((v) => !v)}
          aria-pressed={participantsOpen}
          aria-label={`Participants panel (${participants.length})`}
          className="flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Users className="size-4" aria-hidden="true" /> {participants.length}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="grid flex-1 auto-rows-min grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2">
          {participants.slice(0, 4).map((p) => (
            <div key={p.id} className="relative flex aspect-video items-center justify-center rounded-xl bg-slate-900 ring-1 ring-white/10">
              <div className={["flex size-14 items-center justify-center rounded-full text-lg font-black", p.id === "self" && !cameraOn ? "bg-slate-700" : "bg-primary/40"].join(" ")} aria-hidden="true">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-bold">
                {p.name} {p.host ? "· Host" : ""}
              </span>
            </div>
          ))}
          {screenSharing && (
            <div className="col-span-full flex aspect-video items-center justify-center rounded-xl border-2 border-dashed border-white/25 bg-slate-900">
              <p className="text-xs font-bold text-white/70">Screen share (simulated)</p>
            </div>
          )}
        </div>

        {participantsOpen && (
          <aside aria-label={isHost ? "Attendance" : "Participants"} className="max-h-48 shrink-0 overflow-y-auto border-t border-white/10 p-4 md:max-h-none md:w-64 md:border-l md:border-t-0">
            <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-white/70">
              {isHost ? `Attendance · ${present.length} of ${roster.length} enrolled` : `Participants (${participants.length})`}
            </h2>
            <ul className="space-y-2">
              {(isHost ? roster.map((r) => ({ id: r.studentId, name: r.fullName ?? "Student", here: r.attendanceStatus === "present" })) : participants.map((p) => ({ id: p.id, name: p.name, here: true }))).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold">
                  <span className="truncate">{p.name}</span>
                  {isHost && <span className={p.here ? "text-emerald-300" : "text-white/50"}>{p.here ? "Joined" : "Not joined"}</span>}
                </li>
              ))}
              {isHost && roster.length === 0 && <li className="text-xs text-white/60">No students are enrolled yet.</li>}
            </ul>
          </aside>
        )}

        {chatOpen && (
          <aside aria-label="Class chat" className="flex max-h-72 shrink-0 flex-col border-t border-white/10 md:max-h-none md:w-80 md:border-l md:border-t-0">
            <h2 className="border-b border-white/10 px-4 py-3 text-xs font-black uppercase tracking-wider text-white/70">Class chat</h2>
            <div className="flex-1 space-y-2 overflow-y-auto p-4" role="log" aria-live="polite" aria-label="Chat messages">
              {messages.length === 0 && <p className="text-xs text-white/60">No messages yet. Questions you post here are visible to everyone in the class.</p>}
              {messages.map((m) => {
                const mine = m.authorId === selfId;
                return (
                  <div key={m.id} className={mine ? "text-right" : ""}>
                    <p className={["inline-block max-w-[85%] rounded-lg px-3 py-1.5 text-left text-xs", mine ? "bg-primary text-primary-foreground" : "bg-white/10"].join(" ")}>{m.body}</p>
                    <p className="mt-0.5 text-[10px] font-bold text-white/60">{m.authorName}</p>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2 border-t border-white/10 p-3">
              <label htmlFor={`chat-${liveClass.id}`} className="sr-only">Message the class</label>
              <input
                id={`chat-${liveClass.id}`}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={1000}
                disabled={!isLive}
                placeholder={isLive ? "Ask a question…" : "Chat is closed"}
                className="h-9 flex-1 rounded-lg border border-white/20 bg-white/5 px-3 text-xs text-white outline-none placeholder:text-white/50 focus:border-primary focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-60"
              />
              <button type="submit" aria-label="Send message" disabled={!isLive || send.isPending} className="rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-60">
                <Send className="size-3.5" aria-hidden="true" />
              </button>
            </form>
          </aside>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 px-4 py-3 sm:py-4">
        <button type="button" onClick={() => setMicOn((v) => !v)} aria-pressed={micOn} aria-label="Microphone (simulated)" className={controlClass(false, !micOn)}>
          {micOn ? <Mic className="size-5" aria-hidden="true" /> : <MicOff className="size-5" aria-hidden="true" />}
        </button>
        <button type="button" onClick={() => setCameraOn((v) => !v)} aria-pressed={cameraOn} aria-label="Camera (simulated)" className={controlClass(false, !cameraOn)}>
          {cameraOn ? <Video className="size-5" aria-hidden="true" /> : <VideoOff className="size-5" aria-hidden="true" />}
        </button>
        <button type="button" onClick={() => setScreenSharing((v) => !v)} aria-pressed={screenSharing} aria-label="Screen share (simulated)" className={controlClass(screenSharing)}>
          <ScreenShare className="size-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => setChatOpen((v) => !v)} aria-pressed={chatOpen} aria-label="Chat panel" className={controlClass(chatOpen)}>
          <MessageSquare className="size-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => void navigate(backTo)} className="flex h-11 items-center gap-2 rounded-full bg-white/10 px-5 text-xs font-black uppercase tracking-wider hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
          <PhoneOff className="size-4" aria-hidden="true" /> Leave
        </button>
        {isHost && onEndClass && isLive && (
          <button type="button" onClick={() => setConfirmEnd(true)} className="flex h-11 items-center gap-2 rounded-full bg-red-600 px-5 text-xs font-black uppercase tracking-wider hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
            <Square className="size-4" aria-hidden="true" /> End class
          </button>
        )}
      </div>

      {isHost && onEndClass && (
        <Dialog open={confirmEnd} onOpenChange={setConfirmEnd}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>End this class for everyone?</DialogTitle>
              <DialogDescription>
                {liveClass.title} will be marked completed. Students are moved out of the room and attendance is final ({present.length} joined).
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmEnd(false)} disabled={ending}>Keep teaching</Button>
              <Button type="button" variant="destructive" onClick={onEndClass} disabled={ending} aria-busy={ending} className="gap-2">
                {ending ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Ending…</> : "End class"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
