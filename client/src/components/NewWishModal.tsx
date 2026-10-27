import { useState } from "react";
import { X, Sparkles, Image as ImageIcon, ArrowRight } from "lucide-react";
import { api, type PostT } from "@/lib/api";

interface NewWishModalProps {
  onClose: () => void;
  onSuccess: (newWish: PostT) => void;
}

const CATEGORIES = [
  { name: "Romance Tax", tag: "ROMANCE TAX", icon: "🍝", img: "https://images.unsplash.com/photo-1621996346565-e3d5d6281292?auto=format&fit=crop&w=1000&q=80" },
  { name: "Emergency Drip", tag: "EMERGENCY DRIP", icon: "🐶", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80" },
  { name: "Academic Crisis", tag: "ACADEMIC CRISIS", icon: "🔌", img: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=1000&q=80" },
  { name: "Pet Damage", tag: "PET DAMAGE", icon: "🐱", img: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1000&q=80" },
  { name: "Food & Groceries", tag: "GROCERY RUN", icon: "🛒", img: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=80" },
  { name: "Medical & Wellness", tag: "HEALTH CARE", icon: "🦷", img: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1000&q=80" },
  { name: "Tech & Tools", tag: "TECH RESCUE", icon: "🎸", img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1000&q=80" },
  { name: "Rent Lifeline", tag: "RENT LIFELINE", icon: "🏠", img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80" },
  { name: "Celebration & Birthday", tag: "CELEBRATION", icon: "🎂", img: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=80" },
  { name: "Travel & Transit", tag: "TRAVEL MISHAP", icon: "🧳", img: "https://images.unsplash.com/photo-1581553680321-4fffae59fccd?auto=format&fit=crop&w=1000&q=80" },
];

export function NewWishModal({ onClose, onSuccess }: NewWishModalProps) {
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [goal, setGoal] = useState("");
  const [customImg, setCustomImg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeImg = customImg || selectedCat.img;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please add a title for your wish");
      return;
    }
    if (!body.trim()) {
      setError("Please explain the story behind this bill");
      return;
    }
    const numGoal = parseInt(goal, 10);
    if (isNaN(numGoal) || numGoal <= 0) {
      setError("Please provide a valid bill amount in INR");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await api.createWish({
        title: title.trim(),
        body: body.trim(),
        category: selectedCat.name,
        tag: selectedCat.tag,
        goal: numGoal,
        img: activeImg,
      });

      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create wish");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl [scrollbar-width:none]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-display text-2xl font-extrabold">Create a New Wish</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Share an everyday mishap, bill, or wish with friends and sponsors.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Category selection */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Select Category
            </label>
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
              {CATEGORIES.map((c) => {
                const isSelected = selectedCat.name === c.name;
                return (
                  <button
                    type="button"
                    key={c.name}
                    onClick={() => setSelectedCat(c)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    <span>{c.icon}</span>
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Wish Title
            </label>
            <input
              type="text"
              maxLength={80}
              placeholder="e.g. My puppy chewed my study notes & headphones 🎧"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              The Story / Details
            </label>
            <textarea
              rows={3}
              maxLength={300}
              placeholder="Tell friends what happened and why you need help with this bill..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1.5 w-full resize-none rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Target Bill Amount (INR ₹)
            </label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 2500"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          {/* Image preview & custom url */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Photo Preview
              </label>
              <button
                type="button"
                onClick={() => setCustomImg(customImg ? "" : "https://images.unsplash.com/")}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                {customImg ? "Use category default" : "Use custom image URL"}
              </button>
            </div>

            <div className="relative mt-2 overflow-hidden rounded-2xl border border-border">
              <img
                src={activeImg}
                alt="Wish preview"
                className="aspect-[16/9] w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = selectedCat.img;
                }}
              />
              <span className="absolute left-3 top-3 rounded-full bg-card/90 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider backdrop-blur">
                {selectedCat.tag}
              </span>
            </div>

            {customImg !== "" && (
              <input
                type="url"
                placeholder="Paste image URL (https://...)"
                value={customImg}
                onChange={(e) => setCustomImg(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-muted/50 px-4 py-2 text-xs outline-none focus:border-primary"
              />
            )}
          </div>

          {error && <p className="text-xs font-bold text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-display text-base font-extrabold text-primary-foreground shadow-lg transition hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Publishing..." : "Publish Wish →"}
          </button>
        </form>
      </div>
    </div>
  );
}
