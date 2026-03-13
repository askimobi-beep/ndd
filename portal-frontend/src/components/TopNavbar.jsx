import { useState, useEffect } from "react";
import {
  ClockIcon,
  MegaphoneIcon,
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

  return (
    <div className="w-full px-6 pt-6 lg:px-8">
      <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-3 px-5 py-3 lg:flex-row lg:items-stretch lg:justify-between lg:px-6">
          <div className="flex min-h-[64px] items-center justify-center rounded-xl bg-slate-50 px-5 py-2 lg:min-w-[240px]">
            <img
              src={`${process.env.PUBLIC_URL}/ndd logo with bg.jpeg`}
              alt="NDD"
              className="h-16 w-44 rounded-xl bg-white p-1 object-contain"
            />
          </div>

          <div className="min-h-[64px] min-w-[240px] rounded-xl bg-gradient-to-r from-primary via-secondary to-[#1f3c97] px-4 py-3 text-white shadow-[0_10px_28px_rgba(0,87,231,0.25)]">
            <div className="flex h-full items-center gap-3">
              <div className="rounded-lg bg-white/15 p-2 backdrop-blur-sm">
                <ClockIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-100">Live Time</p>
                <p className="mt-0.5 text-xl font-semibold leading-none">{timeString}</p>
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