import { db } from "./database.js";
import { initSchema } from "./schema.js";

export function seed() {
  initSchema();

  // Clear existing data in reverse dependency order
  db.exec(`
    DELETE FROM messages;
    DELETE FROM notifications;
    DELETE FROM transactions;
    DELETE FROM comments;
    DELETE FROM saves;
    DELETE FROM likes;
    DELETE FROM stories;
    DELETE FROM wishes;
    DELETE FROM users;
  `);

  console.log("Seeding database with rich data...");

  // 1. Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, handle, avatar, bio, total_paid, bills_sponsored, followers_count)
    VALUES (@id, @name, @handle, @avatar, @bio, @total_paid, @bills_sponsored, @followers_count)
  `);

  const users = [
    { id: "user_you", name: "You", handle: "you", avatar: "Y", bio: "Making tiny wishes come true · Bangalore, IN", total_paid: 4250, bills_sponsored: 5, followers_count: 218 },
    { id: "user_tanya", name: "Tanya Sharma", handle: "tanya_s", avatar: "T", bio: "Graphic designer, golden retriever mom & chai lover ☕", total_paid: 5400, bills_sponsored: 4, followers_count: 840 },
    { id: "user_rohan", name: "Rohan Varma", handle: "rohan_v", avatar: "R", bio: "Startup founder in recovery. Over-orders pasta. 🍝", total_paid: 8200, bills_sponsored: 6, followers_count: 1120 },
    { id: "user_aarav", name: "Aarav Patel", handle: "aarav_p", avatar: "A", bio: "Final year CS student @ BITS. Always at 12% battery ⚡", total_paid: 1200, bills_sponsored: 2, followers_count: 430 },
    { id: "user_priya", name: "Priya Nair", handle: "priya_n", avatar: "P", bio: "Architect & indie plant hoarder 🌿", total_paid: 9500, bills_sponsored: 7, followers_count: 670 },
    { id: "user_kunal", name: "Kunal Kapoor", handle: "kunal_k", avatar: "K", bio: "Drummer & audiophile. In pursuit of clean tone 🥁", total_paid: 3200, bills_sponsored: 3, followers_count: 510 },
    { id: "user_ananya", name: "Ananya Sen", handle: "ananya_s", avatar: "A", bio: "Medical intern running on black coffee and ICU rotations 🩺", total_paid: 2800, bills_sponsored: 2, followers_count: 980 },
    
    // Top leaderboard sponsors
    { id: "user_neha", name: "Neha Kapoor", handle: "neha_k", avatar: "N", bio: "Angel investor & micro-philanthropist. Funding student dreams.", total_paid: 48200, bills_sponsored: 37, followers_count: 3420 },
    { id: "user_kabir", name: "Kabir Singh", handle: "kabir_s", avatar: "K", bio: "Fintech builder. Spreading wealth one emergency bill at a time.", total_paid: 41750, bills_sponsored: 29, followers_count: 2890 },
    { id: "user_isha", name: "Isha Rao", handle: "isha_r", avatar: "I", bio: "Product Designer @ Stripe. Karma is real ✨", total_paid: 36900, bills_sponsored: 41, followers_count: 3100 },
    { id: "user_vikram", name: "Vikram Mehta", handle: "vik_m", avatar: "V", bio: "VP of Engineering. Chipping in so folks can stay focused.", total_paid: 28400, bills_sponsored: 18, followers_count: 1940 },
    { id: "user_sara", name: "Sara Khan", handle: "sara_k", avatar: "S", bio: "Creator & storyteller. Kindness is the ultimate luxury.", total_paid: 22150, bills_sponsored: 25, followers_count: 4210 },
    { id: "user_dev", name: "Dev Malhotra", handle: "dev_m", avatar: "D", bio: "Solopreneur. Supporting fellow hustlers & creators.", total_paid: 19800, bills_sponsored: 14, followers_count: 1540 },
    { id: "user_ananya_i", name: "Ananya Iyer", handle: "ananya_i", avatar: "A", bio: "Research Scientist. Believer in collective kindness.", total_paid: 15600, bills_sponsored: 22, followers_count: 1310 },
    { id: "user_arjun", name: "Arjun Nair", handle: "arjun_n", avatar: "A", bio: "Brand strategist. Paying forward every helping hand I had.", total_paid: 12300, bills_sponsored: 9, followers_count: 920 },
    { id: "user_meera", name: "Meera Joshi", handle: "meera_j", avatar: "M", bio: "Pediatrician & volunteer. Community first always.", total_paid: 9850, bills_sponsored: 12, followers_count: 870 },
    { id: "user_yash", name: "Yash Gupta", handle: "yash_g", avatar: "Y", bio: "Cloud architect. Micro-grants for real problems.", total_paid: 7400, bills_sponsored: 8, followers_count: 650 },
  ];

  for (const u of users) {
    insertUser.run(u);
  }

  // 2. Insert Wishes (Posts across multiple categories)
  const insertWish = db.prepare(`
    INSERT INTO wishes (id, user_id, title, body, tag, category, img, raised, goal, likes_count, comments_count, status, is_friend, created_at)
    VALUES (@id, @user_id, @title, @body, @tag, @category, @img, @raised, @goal, @likes_count, @comments_count, @status, @is_friend, @created_at)
  `);

  const wishes = [
    {
      id: "wish_1",
      user_id: "user_tanya",
      title: "My dog destroyed my new sneakers 🐶",
      body: "I bought them two days ago with my freelance paycheck. Left for 20 minutes and Bruno decided they were chew toys. Can someone help me replace them before my client meeting on Monday?",
      tag: "EMERGENCY DRIP",
      category: "Emergency Drip",
      img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80",
      raised: 1800,
      goal: 3000,
      likes_count: 144,
      comments_count: 20,
      status: "active",
      is_friend: 1,
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
    {
      id: "wish_2",
      user_id: "user_rohan",
      title: "The date went well. The bill didn't. 🍝",
      body: "She ordered the imported burrata, wild truffle ravioli, and two rounds of tiramisu. I smiled and said 'I come here every weekend.' Please save my month's grocery and electricity budget.",
      tag: "ROMANCE TAX",
      category: "Romance Tax",
      img: "https://images.unsplash.com/photo-1621996346565-e3d5d6281292?auto=format&fit=crop&w=1000&q=80",
      raised: 3150,
      goal: 4500,
      likes_count: 154,
      comments_count: 23,
      status: "active",
      is_friend: 1,
      created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    },
    {
      id: "wish_3",
      user_id: "user_aarav",
      title: "Exams are coming. My charger isn't. 🔌",
      body: "My 65W Type-C laptop charger sparked and gave up the ghost 3 days before engineering finals. Running on borrowed power banks, 14% battery and pure caffeine. Help an engineer graduate!",
      tag: "ACADEMIC CRISIS",
      category: "Academic Crisis",
      img: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=1000&q=80",
      raised: 900,
      goal: 1500,
      likes_count: 124,
      comments_count: 13,
      status: "active",
      is_friend: 1,
      created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    },
    {
      id: "wish_4",
      user_id: "user_priya",
      title: "Cat knocked over my custom ceramic mug & iPad 🐱",
      body: "Miso jumped for a fly and executed a 10/10 dive right onto my desk. Coffee flooded my Apple Pencil and broke my favorite handmade ceramic studio mug. Need replacement funds!",
      tag: "PET DAMAGE",
      category: "Pet Damage",
      img: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1000&q=80",
      raised: 2400,
      goal: 3800,
      likes_count: 98,
      comments_count: 16,
      status: "active",
      is_friend: 0,
      created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    },
    {
      id: "wish_5",
      user_id: "user_ananya",
      title: "Wisdom tooth extraction copay + soft food fund 🦷",
      body: "Impacted tooth woke me up at 3 AM. The dentist procedure wasn't fully covered by my student insurance and I need ice packs, painkillers, and 4 days of probiotic soups.",
      tag: "HEALTH CARE",
      category: "Medical & Wellness",
      img: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1000&q=80",
      raised: 2800,
      goal: 3500,
      likes_count: 87,
      comments_count: 9,
      status: "active",
      is_friend: 0,
      created_at: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
    },
    {
      id: "wish_6",
      user_id: "user_kunal",
      title: "Band amplifier fuse blew before Friday night gig 🎸",
      body: "We booked our first headline show in Indiranagar. During soundcheck yesterday our main Marshall bass head blew a transformer fuse. We need ₹2,200 for urgent repair parts by tomorrow noon!",
      tag: "LIVE GIG",
      category: "Tech & Tools",
      img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1000&q=80",
      raised: 1500,
      goal: 2200,
      likes_count: 112,
      comments_count: 15,
      status: "active",
      is_friend: 1,
      created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    },
    {
      id: "wish_7",
      user_id: "user_you",
      title: "Surprise midnight cake & flowers for Mom's 50th 🎂",
      body: "Mom has worked double shifts for years and never asks for anything. I'm organizing a midnight surprise with customized red velvet cake, marigolds, and her favorite playlist. Chipping in helps make it magical!",
      tag: "MOM'S SMILE",
      category: "Celebration & Birthday",
      img: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=80",
      raised: 1400,
      goal: 2000,
      likes_count: 76,
      comments_count: 11,
      status: "active",
      is_friend: 1,
      created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "wish_8",
      user_id: "user_rohan",
      title: "Broken luggage trolley wheel at railway station 🧳",
      body: "Rushing for the Shatabdi Express and the front wheel snapped off on the granite platform. Dragged 23kg for half a kilometer. Need a sturdy replacement before returning to base.",
      tag: "TRAVEL MISHAP",
      category: "Travel & Transit",
      img: "https://images.unsplash.com/photo-1581553680321-4fffae59fccd?auto=format&fit=crop&w=1000&q=80",
      raised: 1100,
      goal: 2400,
      likes_count: 65,
      comments_count: 8,
      status: "active",
      is_friend: 1,
      created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    },
    {
      id: "wish_9",
      user_id: "user_aarav",
      title: "Month-end student pantry restock 🛒",
      body: "Surviving on leftover Maggi and tap water. Just need essentials: rolled oats, 2 dozen eggs, whole wheat bread, and a jar of unsweetened peanut butter to power through project submissions.",
      tag: "GROCERY RUN",
      category: "Food & Groceries",
      img: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=80",
      raised: 850,
      goal: 1200,
      likes_count: 140,
      comments_count: 18,
      status: "active",
      is_friend: 1,
      created_at: new Date(Date.now() - 42 * 3600 * 1000).toISOString(),
    },
    {
      id: "wish_10",
      user_id: "user_priya",
      title: "Roommate vacated without notice, short on utility deposit 🏠",
      body: "My flatmate moved out to another city leaving 50% of the quarterly electricity, water and building maintenance pending. Landlord issued a 48h warning. Need immediate lifeline.",
      tag: "RENT LIFELINE",
      category: "Rent Lifeline",
      img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80",
      raised: 4200,
      goal: 6000,
      likes_count: 190,
      comments_count: 32,
      status: "active",
      is_friend: 0,
      created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    },
  ];

  for (const w of wishes) {
    insertWish.run(w);
  }

  // 3. Insert Stories
  const insertStory = db.prepare(`
    INSERT INTO stories (id, user_id, title, avatar_name, created_at)
    VALUES (@id, @user_id, @title, @avatar_name, @created_at)
  `);

  const storiesData = [
    { id: "story_1", user_id: "user_tanya", title: "Puppy vs...", avatar_name: "Puppy vs...", created_at: new Date().toISOString() },
    { id: "story_2", user_id: "user_rohan", title: "Date Bill 🍝", avatar_name: "Date Bill 🍝", created_at: new Date().toISOString() },
    { id: "story_3", user_id: "user_aarav", title: "Charger RIP", avatar_name: "Charger RIP", created_at: new Date().toISOString() },
    { id: "story_4", user_id: "user_you", title: "Mom's Cake", avatar_name: "Mom's Cake", created_at: new Date().toISOString() },
    { id: "story_5", user_id: "user_kunal", title: "Live Gig 🎸", avatar_name: "Live Gig 🎸", created_at: new Date().toISOString() },
    { id: "story_6", user_id: "user_priya", title: "Rent 🏠", avatar_name: "Rent 🏠", created_at: new Date().toISOString() },
    { id: "story_7", user_id: "user_ananya", title: "Dentist 🦷", avatar_name: "Dentist 🦷", created_at: new Date().toISOString() },
  ];

  for (const s of storiesData) {
    insertStory.run(s);
  }

  // 4. Insert Seed Comments
  const insertComment = db.prepare(`
    INSERT INTO comments (id, wish_id, user_id, text, created_at)
    VALUES (@id, @wish_id, @user_id, @text, @created_at)
  `);

  const commentsData = [
    { id: "c_1", wish_id: "wish_1", user_id: "user_neha", text: "Bruno looks completely innocent though! Chipped in ₹500 🐶", created_at: new Date(Date.now() - 3600 * 1000).toISOString() },
    { id: "c_2", wish_id: "wish_1", user_id: "user_kabir", text: "Get the anti-chew spray along with the new pair haha! Sent ₹300", created_at: new Date(Date.now() - 1800 * 1000).toISOString() },
    { id: "c_3", wish_id: "wish_2", user_id: "user_isha", text: "Truffle pasta will always get you. Been there brother 😂 Sent ₹500", created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString() },
    { id: "c_4", wish_id: "wish_3", user_id: "user_vikram", text: "No engineer should fail over a dead wire. Good luck on exams!", created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString() },
    { id: "c_5", wish_id: "wish_7", user_id: "user_sara", text: "Mom's 50th is huge! Wishing her the absolute happiest birthday! 🎂", created_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString() },
  ];

  for (const c of commentsData) {
    insertComment.run(c);
  }

  // 5. Insert Seed Transactions (Completed payments towards bills)
  const insertTxn = db.prepare(`
    INSERT INTO transactions (id, wish_id, sponsor_id, sponsor_name, sponsor_handle, amount, payment_method, payment_reference, message, is_anonymous, status, idempotency_key, created_at)
    VALUES (@id, @wish_id, @sponsor_id, @sponsor_name, @sponsor_handle, @amount, @payment_method, @payment_reference, @message, @is_anonymous, @status, @idempotency_key, @created_at)
  `);

  const txns = [
    {
      id: "txn_101",
      wish_id: "wish_1",
      sponsor_id: "user_neha",
      sponsor_name: "Neha Kapoor",
      sponsor_handle: "neha_k",
      amount: 1000,
      payment_method: "upi",
      payment_reference: "UPI/NEHA/992812",
      message: "Bruno is forgiven! New shoes coming your way.",
      is_anonymous: 0,
      status: "completed",
      idempotency_key: "seed-txn-101",
      created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    },
    {
      id: "txn_102",
      wish_id: "wish_2",
      sponsor_id: "user_kabir",
      sponsor_name: "Kabir Singh",
      sponsor_handle: "kabir_s",
      amount: 1500,
      payment_method: "upi",
      payment_reference: "UPI/KABIR/881231",
      message: "Rooting for date #2! Keep the truffle budget alive.",
      is_anonymous: 0,
      status: "completed",
      idempotency_key: "seed-txn-102",
      created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    },
    {
      id: "txn_103",
      wish_id: "wish_7",
      sponsor_id: "user_neha",
      sponsor_name: "Neha Kapoor",
      sponsor_handle: "neha_k",
      amount: 500,
      payment_method: "card",
      payment_reference: "CARD/NEHA/77123",
      message: "Happy birthday to your Mom! Have a wonderful celebration.",
      is_anonymous: 0,
      status: "completed",
      idempotency_key: "seed-txn-103",
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      id: "txn_104",
      wish_id: "wish_7",
      sponsor_id: "user_sara",
      sponsor_name: "Sara Khan",
      sponsor_handle: "sara_k",
      amount: 250,
      payment_method: "upi",
      payment_reference: "UPI/SARA/66128",
      message: "Chipped in for flowers 💐",
      is_anonymous: 0,
      status: "completed",
      idempotency_key: "seed-txn-104",
      created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    },
  ];

  for (const t of txns) {
    insertTxn.run(t);
  }

  // 6. Insert Notifications for user_you
  const insertNotification = db.prepare(`
    INSERT INTO notifications (id, user_id, actor_id, actor_name, actor_avatar, type, wish_id, wish_title, amount, text, is_read, created_at)
    VALUES (@id, @user_id, @actor_id, @actor_name, @actor_avatar, @type, @wish_id, @wish_title, @amount, @text, @is_read, @created_at)
  `);

  const notifications = [
    {
      id: "notif_1",
      user_id: "user_you",
      actor_id: "user_neha",
      actor_name: "Neha Kapoor",
      actor_avatar: "N",
      type: "contribution",
      wish_id: "wish_7",
      wish_title: "Surprise midnight cake & flowers for Mom's 50th 🎂",
      amount: 500,
      text: "chipped in ₹500 to your wish “Surprise midnight cake”",
      is_read: 0,
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      id: "notif_2",
      user_id: "user_you",
      actor_id: "user_rohan",
      actor_name: "Rohan Varma",
      actor_avatar: "R",
      type: "like",
      wish_id: "wish_7",
      wish_title: "Surprise midnight cake & flowers for Mom's 50th 🎂",
      amount: null,
      text: "liked your wish “Surprise midnight cake & flowers”",
      is_read: 0,
      created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    },
    {
      id: "notif_3",
      user_id: "user_you",
      actor_id: "user_isha",
      actor_name: "Isha Rao",
      actor_avatar: "I",
      type: "comment",
      wish_id: "wish_7",
      wish_title: "Surprise midnight cake & flowers for Mom's 50th 🎂",
      amount: null,
      text: "commented: “Mom's 50th is huge! Wishing her happiness ❤️”",
      is_read: 0,
      created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    },
    {
      id: "notif_4",
      user_id: "user_you",
      actor_id: "user_kabir",
      actor_name: "Kabir Singh",
      actor_avatar: "K",
      type: "follow",
      wish_id: null,
      wish_title: null,
      amount: null,
      text: "started following you",
      is_read: 1,
      created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "notif_5",
      user_id: "user_you",
      actor_id: "user_sara",
      actor_name: "Sara Khan",
      actor_avatar: "S",
      type: "contribution",
      wish_id: "wish_7",
      wish_title: "Surprise midnight cake & flowers for Mom's 50th 🎂",
      amount: 250,
      text: "chipped in ₹250 to your wish “Surprise midnight cake”",
      is_read: 1,
      created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    },
  ];

  for (const n of notifications) {
    insertNotification.run(n);
  }

  // 7. Insert Messages
  const insertMessage = db.prepare(`
    INSERT INTO messages (id, sender_id, recipient_id, text, created_at)
    VALUES (@id, @sender_id, @recipient_id, @text, @created_at)
  `);

  const messagesData = [
    { id: "m_1", sender_id: "user_tanya", recipient_id: "user_you", text: "Thank you so much for the help!! Bruno promised good behavior 🐶", created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
    { id: "m_2", sender_id: "user_rohan", recipient_id: "user_you", text: "Bro I owe you one! Next time she picks the cheaper café haha", created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
    { id: "m_3", sender_id: "user_neha", recipient_id: "user_you", text: "Sent ₹500, good luck on Mom's party! Make sure to take pictures ✨", created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString() },
    { id: "m_4", sender_id: "user_aarav", recipient_id: "user_you", text: "Charger arrived! Passed the OS exam today ⚡", created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString() },
  ];

  for (const m of messagesData) {
    insertMessage.run(m);
  }

  // 8. Seed Likes & Saves
  const insertLike = db.prepare(`INSERT INTO likes (id, user_id, wish_id) VALUES (?, ?, ?)`);
  insertLike.run("l_1", "user_you", "wish_1");
  insertLike.run("l_2", "user_you", "wish_2");

  const insertSave = db.prepare(`INSERT INTO saves (id, user_id, wish_id) VALUES (?, ?, ?)`);
  insertSave.run("s_1", "user_you", "wish_3");

  console.log("Database seeded successfully with all categories and live test data!");
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seed();
}
