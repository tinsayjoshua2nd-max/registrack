import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileBadge,
  FileText,
  GraduationCap,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

type Request = {
  id: string;
  name: string;
  sub: string;
  status: "Processing" | "Ready soon";
  date: string;
  progress: number;
  icon: typeof FileText;
  tone: string;
};

const requests: Request[] = [
  {
    id: "RT-20481",
    name: "Transcript of Records",
    sub: "2 copies · Official",
    status: "Processing",
    date: "Ready Jun 18",
    progress: 68,
    icon: FileBadge,
    tone: "#d8ebe1",
  },
  {
    id: "RT-20436",
    name: "Certificate of Enrollment",
    sub: "1 copy · For scholarship",
    status: "Ready soon",
    date: "Ready Jun 12",
    progress: 91,
    icon: GraduationCap,
    tone: "#f4e6c9",
  },
];

export function StudentHome() {
  const [activeTab, setActiveTab] = useState("Home");
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const [noticeOpen, setNoticeOpen] = useState(false);

  const submitMessage = () => {
    const next = message.trim();
    if (!next) return;
    setSentMessages((items) => [...items, next]);
    setMessage("");
  };

  return (
    <main className="min-h-[100dvh] bg-[#e8eee7] text-[#21362e] flex justify-center selection:bg-[#bfdcc9]">
      <div className="relative w-full max-w-[430px] min-h-[100dvh] overflow-hidden bg-[#f8f8f2] shadow-[0_18px_70px_rgba(42,66,50,0.14)]">
        <header className="bg-[#174d3a] px-6 pt-5 pb-6 text-[#f5f4e9]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#d9e8d6] text-[#174d3a]">
                <GraduationCap size={21} strokeWidth={1.8} />
              </span>
              <div>
                <div className="text-[15px] font-bold tracking-[-0.035em]">RegisTrack</div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#b9d2c2]">Student portal</div>
              </div>
            </div>
            <button
              aria-label="Notifications"
              onClick={() => setNoticeOpen((open) => !open)}
              className="relative grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/[0.07] text-[#edf4e8] transition hover:bg-white/15"
            >
              <Bell size={18} />
              <span className="absolute right-[9px] top-[8px] h-[6px] w-[6px] rounded-full bg-[#e9b963] ring-2 ring-[#174d3a]" />
            </button>
          </div>
          {noticeOpen && (
            <div className="absolute right-5 top-[72px] z-20 w-[260px] rounded-2xl border border-[#dbe6d8] bg-[#fffef8] p-4 text-[#274438] shadow-xl">
              <div className="mb-1 text-xs font-bold">You’re all caught up</div>
              <p className="text-[11px] leading-5 text-[#718176]">We’ll let you know when a document is ready for release.</p>
            </div>
          )}
          <div className="mt-7 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-medium tracking-wide text-[#c3d8c9]">MONDAY, JUNE 9</p>
              <h1 className="mt-1 text-[27px] font-semibold leading-tight tracking-[-0.055em]">Good morning, Stevie</h1>
              <p className="mt-1.5 text-[12px] text-[#d1e0d3]">Your registrar updates, all in one place.</p>
            </div>
            <div className="mb-1 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#a5c6af] bg-[#dce9dc] text-sm font-bold text-[#28543e]">
              SR
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-[#0f422f]/55 px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={16} className="text-[#c1d9bf]" />
              <div>
                <div className="text-[11px] font-semibold">Stevie Ray Rotulo</div>
                <div className="mt-0.5 font-mono text-[9px] tracking-[0.08em] text-[#a9c8b2]">2023 · STUDENT NO. 20231492</div>
              </div>
            </div>
            <MoreHorizontal size={19} className="text-[#b3cdb9]" />
          </div>
        </header>

        <section className="px-5 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#75877a]">Your documents</p>
              <h2 className="mt-1 text-[19px] font-bold tracking-[-0.04em]">In progress <span className="ml-1 text-[13px] font-medium text-[#8d9c8e]">02</span></h2>
            </div>
            <button onClick={() => setActiveTab("Requests")} className="flex items-center gap-1 text-[11px] font-semibold text-[#286449]">
              All requests <ChevronRight size={14} />
            </button>
          </div>

          <div className="mt-3.5 space-y-2.5">
            {requests.map((request) => {
              const Icon = request.icon;
              return (
                <button
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className="w-full rounded-[17px] border border-[#e7e8dd] bg-[#fffef9] px-3.5 py-3.5 text-left shadow-[0_3px_10px_rgba(44,70,48,0.035)] transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] text-[#325d44]" style={{ background: request.tone }}>
                      <Icon size={19} strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-[12px] font-bold tracking-[-0.015em]">{request.name}</h3>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${request.status === "Processing" ? "bg-[#e8f0e7] text-[#39704c]" : "bg-[#f7edda] text-[#8c6425]"}`}>{request.status}</span>
                      </div>
                      <p className="mt-1 text-[10px] text-[#829085]">{request.sub} <span className="px-0.5">·</span> {request.id}</p>
                    </div>
                  </div>
                  <div className="mt-3.5 flex items-center gap-2.5">
                    <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-[#e9ece4]">
                      <div className="h-full rounded-full bg-[#518563]" style={{ width: `${request.progress}%` }} />
                    </div>
                    <span className="min-w-[74px] text-right text-[10px] font-semibold text-[#64786a]">{request.date}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setActiveTab("Requests")}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[13px] border border-dashed border-[#bdcbbd] py-3 text-[11px] font-bold text-[#386b4e] transition hover:bg-[#eff4eb]"
          >
            <Plus size={15} /> Start a document request
          </button>
        </section>

        <section className="px-5 pt-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#75877a]">Plan ahead</p>
              <h2 className="mt-1 text-[19px] font-bold tracking-[-0.04em]">Release dates</h2>
            </div>
            <button onClick={() => setActiveTab("Dates")} className="text-[10px] font-semibold text-[#66806d]">June 2025</button>
          </div>
          <div className="mt-3 flex gap-2.5">
            <div className="flex flex-1 items-center gap-2.5 rounded-[15px] bg-[#e9f0e7] px-3 py-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fffef7] text-center">
                <span className="text-[8px] font-bold uppercase leading-none text-[#7b8d7d]">Jun</span><span className="text-[14px] font-bold leading-tight text-[#315d42]">12</span>
              </div>
              <div className="min-w-0">
                <div className="truncate text-[10px] font-bold">Enrollment cert.</div>
                <div className="mt-0.5 text-[9px] text-[#6e8373]">Window 3 · after 10 am</div>
              </div>
            </div>
            <div className="flex flex-1 items-center gap-2.5 rounded-[15px] bg-[#f3ecda] px-3 py-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fffdf6] text-center">
                <span className="text-[8px] font-bold uppercase leading-none text-[#95815a]">Jun</span><span className="text-[14px] font-bold leading-tight text-[#806633]">18</span>
              </div>
              <div className="min-w-0">
                <div className="truncate text-[10px] font-bold">Transcript · 2</div>
                <div className="mt-0.5 text-[9px] text-[#93815e]">Window 4 · after 1 pm</div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pt-4 pb-24">
          <div className="relative overflow-hidden rounded-[18px] bg-[#e0ebe0] px-4 py-4">
            <div className="absolute -right-5 -top-7 h-24 w-24 rounded-full border-[12px] border-[#d2e1d2]" />
            <div className="relative flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#fffef8] text-[#286044]"><MessageCircle size={19} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-bold">Need a hand, Stevie?</div>
                <div className="mt-1 text-[10px] text-[#6d816f]">The Registrar’s Office is online until 5 pm.</div>
              </div>
              <button onClick={() => setChatOpen(true)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#24593f] text-white transition hover:bg-[#17452f]" aria-label="Open registrar chat">
                <ArrowUpRight size={17} />
              </button>
            </div>
            <div className="relative mt-3 flex items-center gap-1.5 text-[9px] font-medium text-[#59715f]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#70a07b]" /> Typical reply in 8 minutes
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[9px] text-[#94a093]">
            <CircleHelp size={11} /> Help with your request? <span className="font-semibold text-[#567562]">Visit the help center</span>
          </div>
        </section>

        <nav className="absolute bottom-0 left-0 right-0 flex h-[68px] items-center justify-around border-t border-[#e8e9df] bg-[#fffef9]/95 px-3 backdrop-blur">
          {[
            { label: "Home", icon: Sparkles },
            { label: "Requests", icon: FileText },
            { label: "Dates", icon: CalendarDays },
            { label: "Messages", icon: MessageCircle },
          ].map(({ label, icon: Icon }) => (
            <button key={label} onClick={() => label === "Messages" ? setChatOpen(true) : setActiveTab(label)} className={`flex min-w-[58px] flex-col items-center gap-1 text-[9px] font-semibold ${activeTab === label ? "text-[#286044]" : "text-[#98a197]"}`}>
              <span className={`grid h-7 w-10 place-items-center rounded-full transition ${activeTab === label ? "bg-[#e4eee2]" : ""}`}><Icon size={17} strokeWidth={activeTab === label ? 2.2 : 1.8} /></span>
              {label}
            </button>
          ))}
        </nav>

        {selectedRequest && (
          <div className="absolute inset-0 z-30 flex items-end bg-[#163d2c]/35" onClick={() => setSelectedRequest(null)}>
            <div className="w-full rounded-t-[26px] bg-[#fffef8] p-5 pb-8 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[#d8dfd5]" />
              <div className="flex items-start justify-between">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#75877a]">Request {selectedRequest.id}</p><h3 className="mt-1 text-[20px] font-bold tracking-[-0.04em]">{selectedRequest.name}</h3></div>
                <button aria-label="Close request details" onClick={() => setSelectedRequest(null)} className="grid h-8 w-8 place-items-center rounded-full bg-[#eff2eb]"><X size={16} /></button>
              </div>
              <p className="mt-2 text-[12px] text-[#718074]">{selectedRequest.sub} · Requested June 3, 2025</p>
              <div className="mt-5 rounded-2xl bg-[#edf3e9] p-4">
                <div className="flex items-center gap-2 text-[12px] font-bold text-[#315b40]"><Clock3 size={15} /> {selectedRequest.status}</div>
                <div className="mt-3 space-y-3 border-l border-[#c3d2c1] pl-4 text-[11px]">
                  <div><b className="text-[#3c5944]">Request received</b><span className="ml-2 text-[#819083]">Jun 3 · Complete</span></div>
                  <div><b className="text-[#3c5944]">Registrar verification</b><span className="ml-2 text-[#819083]">In progress</span></div>
                  <div><b className="text-[#718074]">Ready for release</b><span className="ml-2 text-[#9aa59a]">{selectedRequest.date.replace("Ready ", "")}</span></div>
                </div>
              </div>
              <button onClick={() => { setSelectedRequest(null); setChatOpen(true); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#20553b] py-3.5 text-[12px] font-bold text-white"><MessageCircle size={15} /> Ask the registrar</button>
            </div>
          </div>
        )}

        {chatOpen && (
          <div className="absolute inset-0 z-40 flex flex-col bg-[#f8f8f2]">
            <div className="flex items-center gap-3 bg-[#174d3a] px-5 pb-5 pt-6 text-[#f5f4e9]">
              <button aria-label="Close chat" onClick={() => setChatOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-white/10"><ArrowDownLeft size={17} /></button>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#dce9dc] text-[11px] font-bold text-[#28543e]">UR</div>
              <div className="flex-1"><div className="text-[13px] font-bold">Registrar’s Office</div><div className="mt-0.5 flex items-center gap-1.5 text-[9px] text-[#c2d8c8]"><span className="h-1.5 w-1.5 rounded-full bg-[#87ba8e]" /> Online · Window 2</div></div>
              <MoreHorizontal size={20} />
            </div>
            <div className="flex-1 space-y-3 overflow-auto px-5 py-5">
              <p className="mx-auto w-fit rounded-full bg-[#edf0e8] px-3 py-1.5 text-[9px] text-[#879386]">Today · 9:14 AM</p>
              <div className="max-w-[82%] rounded-2xl rounded-tl-md bg-white px-3.5 py-3 text-[11px] leading-[1.65] text-[#45584a] shadow-sm">Good morning, Stevie! I’m Maria from the Registrar’s Office. What can I help you with today?</div>
              {sentMessages.map((text, index) => <div key={`${index}-${text}`} className="ml-auto max-w-[82%] rounded-2xl rounded-tr-md bg-[#dcebdc] px-3.5 py-3 text-[11px] leading-[1.65] text-[#31543a]">{text}</div>)}
              {sentMessages.length > 0 && <div className="flex items-center justify-end gap-1 text-[9px] text-[#8a988a]"><Check size={11} /> Delivered</div>}
            </div>
            <div className="border-t border-[#e5e8df] bg-[#fffef9] p-4">
              <div className="flex items-center gap-2 rounded-full border border-[#e2e7de] bg-[#f8f8f2] py-1.5 pl-4 pr-1.5">
                <input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitMessage(); }} placeholder="Write a message…" className="min-w-0 flex-1 bg-transparent text-[11px] text-[#304436] outline-none placeholder:text-[#a4aea3]" />
                <button aria-label="Send message" onClick={submitMessage} className="grid h-8 w-8 place-items-center rounded-full bg-[#20553b] text-white"><Send size={14} /></button>
              </div>
              <p className="mt-2 text-center text-[9px] text-[#9ba49a]">Replies usually arrive within 8 minutes</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}