import { useState } from "react";
import {
  Bell,
  CalendarDays,
  CircleHelp,
  FileText,
  GraduationCap,
  MessageCircle,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function StudentHome() {
  const [noticeOpen, setNoticeOpen] = useState(false);

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
              aria-label="Notifications & Updates"
              aria-expanded={noticeOpen}
              onClick={() => setNoticeOpen((open) => !open)}
              className="relative grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/[0.07] text-[#edf4e8] transition hover:bg-white/15"
            >
              <Bell size={18} />
            </button>
          </div>
          {noticeOpen && (
            <div className="absolute right-4 top-[72px] z-20 w-[min(340px,calc(100%-2rem))] overflow-hidden rounded-[18px] border border-[#dbe6d8] bg-[#fffef8] text-[#274438] shadow-[0_16px_40px_rgba(23,55,36,0.2)]">
              <div className="flex items-start justify-between border-b border-[#e8ece3] px-4 pb-3 pt-4">
                <div>
                  <div className="text-[13px] font-bold tracking-[-0.02em]">Notifications &amp; Updates</div>
                  <p className="mt-1 max-w-[240px] text-[10px] leading-[1.55] text-[#718176]">
                    Only updates for your account and document requests appear here—not office-wide or other students’ activity.
                  </p>
                </div>
              </div>
              <div className="max-h-[270px] overflow-y-auto p-2">
                <div className="rounded-xl px-2.5 py-5 text-center">
                  <p className="text-[10px] font-semibold text-[#52695a]">No notifications yet</p>
                  <p className="mt-1 text-[10px] leading-[1.5] text-[#829085]">
                    Updates for your account and document requests will appear here.
                  </p>
                </div>
              </div>
              <div className="border-t border-[#e8ece3] px-4 py-2 text-center text-[8px] font-medium tracking-wide text-[#9aa598]">
                NEW STUDENT PORTAL · EMPTY ACCOUNT
              </div>
            </div>
          )}
          <div className="mt-7 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-medium tracking-wide text-[#c3d8c9]">STUDENT PORTAL</p>
              <h1 className="mt-1 text-[27px] font-semibold leading-tight tracking-[-0.055em]">Your student home</h1>
              <p className="mt-1.5 text-[12px] text-[#d1e0d3]">Your registrar updates, all in one place.</p>
            </div>
            <div className="mb-1 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#a5c6af] bg-[#dce9dc] text-sm font-bold text-[#28543e]">
              <GraduationCap size={20} />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-[#0f422f]/55 px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={16} className="text-[#c1d9bf]" />
              <div>
                <div className="text-[11px] font-semibold">Student account</div>
                <div className="mt-0.5 font-mono text-[9px] tracking-[0.08em] text-[#a9c8b2]">PROFILE DETAILS WILL APPEAR HERE</div>
              </div>
            </div>
          </div>
        </header>

        <section className="px-5 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#75877a]">Your documents</p>
              <h2 className="mt-1 text-[19px] font-bold tracking-[-0.04em]">In progress <span className="ml-1 text-[13px] font-medium text-[#8d9c8e]">00</span></h2>
            </div>
            <span className="text-[11px] font-semibold text-[#829085]">All requests</span>
          </div>

          <div className="mt-3.5 rounded-[17px] border border-[#e7e8dd] bg-[#fffef9] px-4 py-5 text-center shadow-[0_3px_10px_rgba(44,70,48,0.035)]">
            <div className="mx-auto grid h-10 w-10 place-items-center rounded-[13px] bg-[#e8f0e7] text-[#325d44]">
              <FileText size={19} strokeWidth={1.8} />
            </div>
            <h3 className="mt-2.5 text-[12px] font-bold tracking-[-0.015em]">No document requests yet</h3>
            <p className="mt-1 text-[10px] text-[#829085]">Your requests and their status will appear here.</p>
          </div>

          <button
            type="button"
            disabled
            title="Request submission is not connected in this preview."
            className="mt-3 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-[13px] border border-dashed border-[#bdcbbd] py-3 text-[11px] font-bold text-[#829085]"
          >
            <Plus size={15} /> Request form unavailable in preview
          </button>
        </section>

        <section className="px-5 pt-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#75877a]">Plan ahead</p>
              <h2 className="mt-1 text-[19px] font-bold tracking-[-0.04em]">Release dates</h2>
            </div>
            <span className="text-[10px] font-semibold text-[#829085]">No scheduled releases</span>
          </div>
          <div className="mt-3 flex items-center gap-2.5 rounded-[15px] bg-[#e9f0e7] px-3 py-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fffef7] text-[#315d42]">
              <CalendarDays size={17} />
            </div>
            <p className="text-[10px] leading-[1.5] text-[#6e8373]">Release dates will appear here after a document request is scheduled.</p>
          </div>
        </section>

        <section className="px-5 pt-4 pb-24">
          <div className="relative overflow-hidden rounded-[18px] bg-[#e0ebe0] px-4 py-4">
            <div className="absolute -right-5 -top-7 h-24 w-24 rounded-full border-[12px] border-[#d2e1d2]" />
            <div className="relative flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#fffef8] text-[#286044]"><MessageCircle size={19} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-bold">Need a hand?</div>
                <div className="mt-1 text-[10px] text-[#6d816f]">Registrar contact options will appear here when available.</div>
              </div>
            </div>
            <div className="relative mt-3 flex items-center gap-1.5 text-[9px] font-medium text-[#59715f]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#a0aaa0]" /> Messaging is not connected in this preview
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[9px] text-[#94a093]">
            <CircleHelp size={11} /> Help and support information will be available here.
          </div>
        </section>

        <nav className="absolute bottom-0 left-0 right-0 flex h-[68px] items-center justify-around border-t border-[#e8e9df] bg-[#fffef9]/95 px-3 backdrop-blur">
            <button type="button" aria-current="page" className="flex min-w-[58px] flex-col items-center gap-1 text-[9px] font-semibold text-[#286044]">
              <span className="grid h-7 w-10 place-items-center rounded-full bg-[#e4eee2]"><Sparkles size={17} strokeWidth={2.2} /></span>
              Home
            </button>
            {[
              { label: "Requests", icon: FileText },
              { label: "Dates", icon: CalendarDays },
              { label: "Messages", icon: MessageCircle },
            ].map(({ label, icon: Icon }) => (
              <button key={label} type="button" disabled title={`${label} will be available when the portal is connected.`} className="flex min-w-[58px] cursor-not-allowed flex-col items-center gap-1 text-[9px] font-semibold text-[#98a197]">
                <span className="grid h-7 w-10 place-items-center rounded-full"><Icon size={17} strokeWidth={1.8} /></span>
                {label}
              </button>
            ))}
        </nav>
      </div>
    </main>
  );
}