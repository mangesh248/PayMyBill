import { useState, useEffect } from "react";
import { X, Sparkles, Heart, ChevronLeft, ChevronRight, ShieldCheck, Zap } from "lucide-react";
import { inr, type PostT } from "@/lib/api";
import { toast } from "sonner";

interface StoryModalProps {
  stories: { id: string; title: string; name: string }[];
  initialIndex?: number;
  onClose: () => void;
  onOpenPayment: (post: any) => void;
}

const STORY_IMAGES: Record<string, string> = {
  "Puppy vs...": "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1000&q=80",
  "Date Bill 🍝": "https://images.unsplash.com/photo-1621996346565-e3d5d6281292?auto=format&fit=crop&w=1000&q=80",
  "Charger RIP": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=1000&q=80",
  "Mom's Cake": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=80",
  "Live Gig 🎸": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1000&q=80",
  "Rent 🏠": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80",
  "Goa Trip": "https://images.unsplash.com/photo-1581553680321-4fffae59fccd?auto=format&fit=crop&w=1000&q=80",
  "Dentist 🦷": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1000&q=80",
};

export function StoryModal({
  stories,
  initialIndex = 0,
  onClose,
  onOpenPayment,
}: StoryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);

  const current = stories[currentIndex] || stories[0];
  const storyImage =
    STORY_IMAGES[current.title] ||
    "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1000&q=80";

  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((c) => c + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, stories.length, onClose]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) setCurrentIndex((c) => c - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((c) => c + 1);
    } else {
      onClose();
    }
  };

  const sendReaction = (_emoji: string) => {
    // Silent in-place reaction without noisy toast
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex h-[88vh] max-h-[780px] w-full max-w-[420px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 text-white shadow-2xl">
        {/* Top Progress Bars */}
        <div className="absolute inset-x-3 top-3 z-20 flex gap-1.5">
          {stories.map((s, idx) => (
            <div
              key={s.id || idx}
              className="h-1 flex-1 overflow-hidden rounded-full bg-white/30 backdrop-blur-xs"
            >
              <div
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{
                  width:
                    idx < currentIndex
                      ? "100%"
                      : idx === currentIndex
                      ? `${progress}%`
                      : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Header */}
        <div className="absolute inset-x-4 top-6 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="story-ring rounded-full p-[2px]">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-zinc-900 font-display text-xs font-black">
                {current.name ? current.name[0]?.toUpperCase() : "U"}
              </div>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs font-black leading-tight drop-shadow">
                {current.name}
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              </p>
              <p className="text-[10px] text-white/80">Spotlight Wish · Active Now</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Story"
            className="rounded-full bg-black/40 p-2 text-white/90 backdrop-blur hover:bg-black/60 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Background Image */}
        <div className="relative h-full w-full">
          <img
            src={storyImage}
            alt={current.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60" />

          {/* Navigation Tap Zones */}
          <button
            onClick={handlePrev}
            aria-label="Previous Story"
            className="absolute inset-y-0 left-0 w-1/3 cursor-pointer"
          />
          <button
            onClick={handleNext}
            aria-label="Next Story"
            className="absolute inset-y-0 right-0 w-1/3 cursor-pointer"
          />
        </div>

        {/* Story Bottom Content */}
        <div className="absolute inset-x-0 bottom-0 z-20 space-y-3.5 p-5 bg-gradient-to-t from-black/95 via-black/80 to-transparent">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-300 border border-rose-500/30">
              <Sparkles className="h-3 w-3" /> Urgent Community Wish
            </span>
            <h3 className="mt-1.5 font-display text-xl font-black text-white">
              {current.title}
            </h3>
            <p className="text-xs text-white/80">
              {current.name} is looking for quick micro-funding for this everyday bill.
            </p>
          </div>

          {/* Quick Reaction Bar */}
          <div className="flex items-center gap-2">
            {["🔥", "🥺", "❤️", "👏", "💸"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className="flex-1 rounded-full bg-white/10 py-1.5 text-base hover:scale-125 hover:bg-white/20 transition active:scale-95 backdrop-blur-xs"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* CTA Button */}
          <button
            onClick={() => {
              onClose();
              onOpenPayment({
                id: current.id || "wish_story",
                name: current.name,
                title: current.title,
                raised: 750,
                goal: 2000,
                tag: "COMMUNITY BILL",
              });
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl brand-gradient-bg py-3 font-display text-sm font-black text-white shadow-lg shadow-rose-500/30 transition hover:brightness-110 active:scale-98"
          >
            <Zap className="h-4 w-4 fill-current" />
            Sponsor {current.name.split(" ")[0]}'s Bill Now
          </button>
        </div>
      </div>
    </div>
  );
}
