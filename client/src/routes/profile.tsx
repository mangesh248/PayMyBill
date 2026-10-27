import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Shell, Post, inr, Empty } from "@/components/social";
import { api, type ProfileT, type PostT } from "@/lib/api";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — HelpMePay" },
      { name: "description", content: "Your published wishes, sponsored bills, and community statistics." },
      { property: "og:title", content: "Profile — HelpMePay" },
      { property: "og:description", content: "Your wishes and sponsorships." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const [tab, setTab] = useState<"Wishes" | "Sponsored" | "Saved">("Wishes");
  const [data, setData] = useState<ProfileT | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = () => {
    setLoading(true);
    api.getProfile()
      .then((res) => setData(res))
      .catch((err) => console.error("Error fetching profile:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdate = (updated: PostT) => {
    if (!data) return;
    setData({
      ...data,
      myWishes: data.myWishes.map((w) => (w.id === updated.id ? updated : w)),
      sponsoredWishes: data.sponsoredWishes.map((w) => (w.id === updated.id ? updated : w)),
    });
  };

  const user = data?.user;
  const stats = data?.stats;

  return (
    <Shell title="Profile">
      {/* Banner */}
      <div className="story-ring h-32 w-full" />

      {/* User Header */}
      <div className="px-4">
        <div className="-mt-12 grid h-24 w-24 place-items-center rounded-full border-4 border-background bg-accent font-display text-3xl font-extrabold shadow-md">
          {user?.avatar || "Y"}
        </div>
        <h2 className="mt-3 font-display text-2xl font-extrabold text-foreground">
          {user?.name || "You"}
        </h2>
        <p className="text-sm text-muted-foreground">
          @{user?.handle || "you"} · {user?.bio || "Making tiny wishes come true"}
        </p>

        {/* Stats Row */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border border-border bg-card py-3 shadow-xs">
            <p className="font-display text-lg font-extrabold text-foreground">{stats?.wishes_count ?? 0}</p>
            <p className="text-xs text-muted-foreground">Wishes</p>
          </div>
          <div className="rounded-2xl border border-border bg-card py-3 shadow-xs">
            <p className="font-display text-lg font-extrabold text-primary">{inr(stats?.total_paid ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Paid to Others</p>
          </div>
          <div className="rounded-2xl border border-border bg-card py-3 shadow-xs">
            <p className="font-display text-lg font-extrabold text-foreground">{stats?.followers ?? 0}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="mt-5 flex border-b border-border">
        {(["Wishes", "Sponsored", "Saved"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-extrabold transition ${
              tab === t ? "border-b-4 border-primary text-foreground" : "text-muted-foreground hover:bg-muted/30"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading profile items...</div>
      ) : tab === "Wishes" ? (
        data?.myWishes && data.myWishes.length > 0 ? (
          data.myWishes.map((p) => <Post key={p.id} p={p} onUpdate={handleUpdate} />)
        ) : (
          <Empty>You haven't created any wishes yet. Tap "New Wish" to share your first bill!</Empty>
        )
      ) : tab === "Sponsored" ? (
        data?.sponsoredWishes && data.sponsoredWishes.length > 0 ? (
          data.sponsoredWishes.map((p) => <Post key={p.id} p={p} onUpdate={handleUpdate} />)
        ) : (
          <Empty>You haven't sponsored any bills yet. Help someone on the feed to become a sponsor!</Empty>
        )
      ) : (
        data?.savedWishes && data.savedWishes.length > 0 ? (
          data.savedWishes.map((p) => <Post key={p.id} p={p} onUpdate={handleUpdate} />)
        ) : (
          <Empty>Nothing saved yet. Tap the bookmark icon on any wish to save it for later.</Empty>
        )
      )}
    </Shell>
  );
}
