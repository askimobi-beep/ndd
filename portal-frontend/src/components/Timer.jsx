import { ClockIcon } from "@heroicons/react/24/outline";

export default function TimerBox() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString([], { hour12: true });
  const dateString = time.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const location = "Virginia, USA";

  return (
    <div className="bg-blue-900 text-white px-4 py-2 rounded-md flex items-center gap-3 min-w-[220px]">
      <ClockIcon className="h-5 w-5" />
      <div className="flex flex-col text-right">
        <span className="text-lg font-medium">{timeString}</span>
        <span className="text-xs">{`${dateString} · ${location}`}</span>
      </div>
    </div>
  );
}