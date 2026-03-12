import { useState, useEffect } from "react";
import {
  ClockIcon,
  MapPinIcon,
  MegaphoneIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

export default function TopNavbar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const dateString = time.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const location = "Virginia, USA";

  return (
    <div className="w-full px-6 pt-6 lg:px-8">
      <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-6 px-6 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-4">
            <img
              src={`${process.env.PUBLIC_URL}/ndd logo with bg.jpeg`}
              alt="NDD"
              className="h-14 w-40 rounded-2xl bg-white p-1 object-contain"
            />

            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                <SparklesIcon className="h-4 w-4" />
                NDD Portal
              </div>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Lahore Office Dashboard</h2>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <MapPinIcon className="h-4 w-4 text-primary" />
                Lahore · Connected to {location}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Today</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{dateString}</p>
            </div>

            <div className="min-w-[280px] rounded-2xl bg-gradient-to-r from-primary via-secondary to-[#1f3c97] px-5 py-4 text-white shadow-[0_18px_40px_rgba(0,87,231,0.28)]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white/15 p-2.5 backdrop-blur-sm">
                    <ClockIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-100">Live Timer</p>
                    <p className="mt-1 text-2xl font-semibold leading-none">{timeString}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-blue-100">
                  <p>Real-time sync</p>
                  <p className="mt-1">{location}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-gradient-to-r from-[#eef4ff] to-white px-6 py-4 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-primary p-2.5 text-white shadow-md">
                <MegaphoneIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Announcement</p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  Welcome to the upgraded NDD portal experience. All systems are available and ready for use.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <span className="h-2.5 w-2.5 rounded-full bg-primary"></span>
              <span className="h-2.5 w-2.5 rounded-full bg-primary/40"></span>
              <span className="h-2.5 w-2.5 rounded-full bg-primary/20"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}