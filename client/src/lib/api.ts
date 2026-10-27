const API_BASE = typeof window !== "undefined" ? "/api" : "http://localhost:5000/api";

export interface PostT {
  id: string;
  user_id: string;
  name: string;
  handle: string;
  avatar: string;
  title: string;
  body: string;
  tag: string;
  category: string;
  img: string;
  raised: number;
  goal: number;
  likes: number;
  comments: number;
  status: string;
  liked: boolean;
  saved: boolean;
  time: string;
  created_at?: string;
}

export interface SponsorT {
  id?: string;
  name: string;
  handle: string;
  avatar?: string;
  total: number;
  bills: number;
}

export interface NotificationT {
  id: string;
  who: string;
  avatar: string;
  text: string;
  type: string;
  wish_id?: string;
  wish_title?: string;
  amount?: number;
  is_read: boolean;
  time: string;
}

export interface MessageT {
  id: string;
  sender_id: string;
  is_me: boolean;
  text: string;
  time: string;
}

export interface ConversationT {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  last: string;
  time: string;
}

export interface CommentT {
  id: string;
  text: string;
  user_id: string;
  name: string;
  handle: string;
  avatar: string;
  time: string;
}

export interface ProfileT {
  user: {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    bio: string;
    total_paid: number;
    bills_sponsored: number;
    followers_count: number;
  };
  stats: {
    wishes_count: number;
    total_paid: number;
    bills_sponsored: number;
    followers: number;
  };
  myWishes: PostT[];
  sponsoredWishes: PostT[];
  savedWishes: PostT[];
}

export const inr = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Wishes
  getWishes: (params?: { category?: string; tab?: string; q?: string; userId?: string }) => {
    const qry = new URLSearchParams();
    if (params?.category) qry.set("category", params.category);
    if (params?.tab) qry.set("tab", params.tab);
    if (params?.q) qry.set("q", params.q);
    if (params?.userId) qry.set("userId", params.userId);
    const qs = qry.toString();
    return request<PostT[]>(`/wishes${qs ? `?${qs}` : ""}`);
  },

  getWish: (id: string) => request<PostT & { comments: CommentT[]; sponsors: any[] }>(`/wishes/${id}`),

  createWish: (data: { title: string; body: string; tag?: string; category?: string; goal: number; img?: string }) =>
    request<PostT>("/wishes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteWish: (id: string) => request<{ success: boolean }>(`/wishes/${id}`, { method: "DELETE" }),

  toggleLike: (id: string) => request<{ liked: boolean; likes: number }>(`/wishes/${id}/like`, { method: "POST" }),

  toggleSave: (id: string) => request<{ saved: boolean }>(`/wishes/${id}/save`, { method: "POST" }),

  getComments: (id: string) => request<CommentT[]>(`/wishes/${id}/comments`),

  addComment: (id: string, text: string) =>
    request<CommentT>(`/wishes/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  // Payments / Helping a bill
  payBill: (data: {
    wish_id: string;
    amount: number;
    payment_method?: string;
    message?: string;
    is_anonymous?: boolean;
    idempotency_key?: string;
  }) =>
    request<{
      success: boolean;
      message: string;
      transaction: any;
      updatedWish: { id: string; raised: number; goal: number; status: string; pct: number };
    }>("/payments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getPaymentHistory: () => request<any[]>("/payments/history"),

  getReceipt: (id: string) => request<any>(`/payments/receipt/${id}`),

  // Leaderboard
  getLeaderboard: (period = "All time") =>
    request<{ period: string; totalContributed: number; totalBills: number; sponsors: SponsorT[]; topThree: SponsorT[] }>(
      `/leaderboard?period=${encodeURIComponent(period)}`
    ),

  // Notifications
  getNotifications: () => request<{ notifications: NotificationT[]; unreadCount: number }>("/notifications"),

  markAllNotificationsRead: () => request<{ success: boolean }>("/notifications/read-all", { method: "POST" }),

  markNotificationRead: (id: string) => request<{ success: boolean }>(`/notifications/${id}/read`, { method: "POST" }),

  // Messages
  getConversations: () => request<ConversationT[]>("/messages"),

  getMessageThread: (partnerId: string) =>
    request<{ partner: { id: string; name: string; handle: string; avatar: string }; messages: MessageT[] }>(
      `/messages/thread/${encodeURIComponent(partnerId)}`
    ),

  sendMessage: (data: { recipient_id?: string; recipient_name?: string; text: string }) =>
    request<MessageT>("/messages", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Stories
  getStories: () => request<{ id: string; title: string; name: string; user_id: string }[]>("/stories"),

  createStory: (title: string) =>
    request<{ id: string; title: string; name: string }>("/stories", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  // Profile
  getProfile: () => request<ProfileT>("/users/me"),

  getUser: (id: string) => request<{ user: any; wishes: PostT[] }>(`/users/${id}`),
};
