import { useState, useEffect } from "react";
import { X, Send, MessageCircle, Heart, Sparkles } from "lucide-react";
import { api, type CommentT, type PostT } from "@/lib/api";
import { toast } from "sonner";

interface CommentsModalProps {
  post: PostT | null;
  onClose: () => void;
  onCommentAdded?: () => void;
}

const QUICK_COMMENTS = [
  "Rooting for you! 🌟",
  "Sending good vibes ✨",
  "Chipped in! ⚡",
  "Bruno is forgiven 🐶",
  "Stay strong! 💖",
];

export function CommentsModal({ post, onClose, onCommentAdded }: CommentsModalProps) {
  if (!post) return null;

  const [comments, setComments] = useState<CommentT[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.getComments(post.id)
      .then((data) => {
        if (mounted) setComments(data);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [post.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    try {
      const added = await api.addComment(post.id, text.trim());
      setComments((prev) => [...prev, added]);
      setText("");
      toast.success("Comment posted!");
      if (onCommentAdded) onCommentAdded();
    } catch (err) {
      console.error(err);
      toast.error("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl sm:rounded-3xl border border-border bg-card p-5 shadow-2xl">
        {/* Mobile Drag Indicator */}
        <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-muted-foreground/30 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="story-ring rounded-full p-[1.5px]">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-card">
                <MessageCircle className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="font-display text-base font-black text-foreground">
                Encouragements & Comments
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {comments.length} people cheering on {post.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Comment List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 [scrollbar-width:none]">
          {loading ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Loading comments...</p>
          ) : comments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Sparkles className="mx-auto h-6 w-6 text-primary mb-1.5 opacity-80" />
              <p className="text-sm font-bold text-foreground">No comments yet</p>
              <p className="text-xs">Be the first to drop an encouraging line!</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5 text-xs">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-rose-500/20 to-purple-500/20 font-display font-black text-primary border border-primary/20">
                  {c.avatar || c.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 rounded-2xl bg-muted/50 p-3 border border-border/40">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-black text-foreground">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground">{c.time}</span>
                  </div>
                  <p className="mt-1 text-foreground/90 text-[13px] leading-relaxed">{c.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex gap-1.5 overflow-x-auto py-2 [scrollbar-width:none]">
          {QUICK_COMMENTS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setText(chip)}
              className="shrink-0 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:border-primary/50 transition active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Post Comment Input */}
        <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border pt-3">
          <input
            type="text"
            placeholder={`Say something encouraging...`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 rounded-2xl border border-border bg-muted/40 px-4 py-2.5 text-sm outline-none focus:border-primary transition"
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            aria-label="Send Comment"
            className="rounded-2xl brand-gradient-bg p-3 text-white transition hover:brightness-110 disabled:opacity-40 active:scale-95 shadow-md shadow-rose-500/20"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
