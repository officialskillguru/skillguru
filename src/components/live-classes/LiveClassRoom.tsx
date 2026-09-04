import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MessageSquare,
  Users,
  ScreenShare,
  PhoneOff,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LiveClass } from "@/services/live-classes.service";

interface DemoChatMessage {
  id: string;
  author: string;
  content: string;
  isSelf: boolean;
}

interface DemoParticipant {
  id: string;
  name: string;
  role: "host" | "participant";
}

/**
 * DEMO-ONLY meeting room. No real video/audio/WebRTC connection exists — every
 * control here only changes local UI state (mute/camera/chat/participants).
 * Shared between the Teacher and Student "Join" flows so both see the same
 * experience; `selfName`/`selfRole` distinguish who is presenting.
 */
export function LiveClassRoom({
  liveClass,
  selfName,
  selfRole,
  backTo,
}: Readonly<{
  liveClass: LiveClass;
  selfName: string;
  selfRole: "host" | "participant";
  backTo: string;
}>) {
  const navigate = useNavigate();
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<DemoChatMessage[]>([
    { id: "seed-1", author: liveClass.mentorName ?? "Teacher", content: "Welcome — this is a demo live class room.", isSelf: false },
  ]);

  const participants: DemoParticipant[] = [
    { id: "host", name: liveClass.mentorName ?? "Teacher", role: "host" },
    { id: "self", name: selfName, role: selfRole },
  ];

  const handleSendMessage = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), author: selfName, content: trimmed, isSelf: true }]);
    setChatInput("");
  };

  const handleLeave = () => void navigate(backTo);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden rounded-2xl border border-border bg-slate-950 text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-black">{liveClass.title}</p>
            <Badge variant="warning" className="shrink-0">Demo</Badge>
          </div>
          <p className="truncate text-xs font-semibold text-white/60">{liveClass.courseTitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setParticipantsOpen((v) => !v)}
          aria-pressed={participantsOpen}
          aria-label={`${participantsOpen ? "Hide" : "Show"} participant list (${participants.length})`}
          className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <Users className="size-4" aria-hidden="true" /> {participants.length}
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2">
          {participants.map((p) => (
            <div key={p.id} className="relative flex aspect-video items-center justify-center rounded-xl bg-slate-900 ring-1 ring-white/10">
              {p.id === "self" && !cameraOn ? (
                <div className="flex size-16 items-center justify-center rounded-full bg-slate-700 text-lg font-black">
                  {p.name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/30 text-lg font-black">
                  {p.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-[11px] font-bold">
                {p.name} {p.role === "host" ? "(Host)" : ""}
              </span>
              {p.id === "self" && !micOn && (
                <span className="absolute bottom-2 right-2 rounded-md bg-red-600/80 p-1">
                  <MicOff className="size-3" aria-hidden="true" />
                </span>
              )}
            </div>
          ))}
          {screenSharing && (
            <div className="col-span-full flex aspect-video items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-slate-900 sm:col-span-2">
              <div className="text-center">
                <ScreenShare className="mx-auto size-8 text-white/40" aria-hidden="true" />
                <p className="mt-2 text-xs font-bold text-white/50">Screen share placeholder (demo)</p>
              </div>
            </div>
          )}
        </div>

        {participantsOpen && (
          <aside aria-label="Participants" className="w-64 shrink-0 border-l border-white/10 p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-white/60 mb-3">Participants ({participants.length})</h3>
            <ul className="space-y-2">
              {participants.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold">
                  <span>{p.name}</span>
                  {p.role === "host" && <Badge variant="info">Host</Badge>}
                </li>
              ))}
            </ul>
          </aside>
        )}

        {chatOpen && (
          <aside aria-label="Class chat" className="flex w-72 shrink-0 flex-col border-l border-white/10">
            <h3 className="border-b border-white/10 px-4 py-3 text-xs font-black uppercase tracking-wider text-white/60">Chat (demo)</h3>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages.map((m) => (
                <div key={m.id} className={m.isSelf ? "text-right" : ""}>
                  <p className={["inline-block max-w-[85%] rounded-lg px-3 py-1.5 text-xs", m.isSelf ? "bg-primary text-primary-foreground" : "bg-white/10"].join(" ")}>
                    {m.content}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold text-white/40">{m.author}</p>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="flex gap-2 border-t border-white/10 p-3"
            >
              <label htmlFor="live-class-chat-input" className="sr-only">Type a message</label>
              <input
                id="live-class-chat-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="h-9 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 text-xs text-white outline-none focus:border-primary"
              />
              <button type="submit" aria-label="Send message" className="rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90">
                <Send className="size-3.5" aria-hidden="true" />
              </button>
            </form>
          </aside>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-white/10 px-5 py-4">
        <button
          type="button"
          onClick={() => setMicOn((v) => !v)}
          aria-pressed={micOn}
          aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
          className={["flex size-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60", micOn ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-700"].join(" ")}
        >
          {micOn ? <Mic className="size-5" aria-hidden="true" /> : <MicOff className="size-5" aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={() => setCameraOn((v) => !v)}
          aria-pressed={cameraOn}
          aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
          className={["flex size-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60", cameraOn ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-700"].join(" ")}
        >
          {cameraOn ? <Video className="size-5" aria-hidden="true" /> : <VideoOff className="size-5" aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={() => setScreenSharing((v) => !v)}
          aria-pressed={screenSharing}
          aria-label={screenSharing ? "Stop screen share" : "Start screen share"}
          className={["flex size-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60", screenSharing ? "bg-primary" : "bg-white/10 hover:bg-white/20"].join(" ")}
        >
          <ScreenShare className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setChatOpen((v) => !v)}
          aria-pressed={chatOpen}
          aria-label={`${chatOpen ? "Close" : "Open"} chat`}
          className={["flex size-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60", chatOpen ? "bg-primary" : "bg-white/10 hover:bg-white/20"].join(" ")}
        >
          <MessageSquare className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={handleLeave}
          aria-label="Leave class"
          className="flex h-11 items-center gap-2 rounded-full bg-red-600 px-5 text-xs font-black uppercase tracking-wider hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <PhoneOff className="size-4" aria-hidden="true" /> Leave
        </button>
      </div>
    </div>
  );
}
