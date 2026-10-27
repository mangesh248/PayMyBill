import { useState, useEffect } from "react";
import { X, Send, MessageCircle } from "lucide-react";
import { api, type CommentT, type PostT } from "@/lib/api";

interface CommentsModalProps {
  post: PostT | null;
  onClose: () => void;
  onCommentAdded?: () => void;
}

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
      if (onCommentAdded) onCommentAdded();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl border border-border bg-card p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-extrabold">Comments</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Comment List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 [scrollbar-width:none]">
          {loading ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Loading comments...</p>
          ) : comments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-sm font-semibold">No comments yet</p>
              <p className="text-xs">Be the first to say something encouraging!</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5 text-xs">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent font-display font-extrabold text-accent-foreground">
                  {c.avatar || c.name[0]}
                </div>
                <div className="min-w-0 flex-1 rounded-2xl bg-muted/60 p-3">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-foreground">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground">{c.time}</span>
                  </div>
                  <p className="mt-1 text-foreground/90 text-[13px] leading-relaxed">{c.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Post Comment Input */}
        <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border pt-3">
          <input
            type="text"
            placeholder="Write an encouraging comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 rounded-full bg-muted/70 px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="rounded-full bg-primary p-2.5 text-primary-foreground disabled:opacity-50 transition hover:opacity-90"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
