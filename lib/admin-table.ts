export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "superadmin";
  lastSignInAt: string | null;
  postCount: number;
  voteCount: number;
  streakDays: number;
  averageDistance: number | null;
};

export type AdminContent = {
  id: string;
  imageUrl: string | null;
  caption: string;
  prompt: string;
  createdAt: string;
  authorName: string;
  authorEmail: string;
  voteCount: number;
  averageRating: number | null;
  deletedAt: string | null;
};

export type UserSort = "name" | "recent" | "votes" | "streak";
export type ContentSort = "name" | "recent" | "votes";

function matches(query: string, fields: string[]): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = fields.join(" ").toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

function byName(a: string, b: string): number {
  return a.localeCompare(b, "en", { sensitivity: "base" });
}

// Missing timestamps (users who never signed in) sort last.
function newestFirst(a: string | null, b: string | null): number {
  return (b ? Date.parse(b) : -Infinity) - (a ? Date.parse(a) : -Infinity) || 0;
}

export function filterUsers(users: AdminUser[], query: string, sort: UserSort): AdminUser[] {
  const compare: Record<UserSort, (a: AdminUser, b: AdminUser) => number> = {
    name: (a, b) => byName(a.name, b.name),
    recent: (a, b) => newestFirst(a.lastSignInAt, b.lastSignInAt),
    votes: (a, b) => b.voteCount - a.voteCount,
    streak: (a, b) => b.streakDays - a.streakDays,
  };
  return users
    .filter((user) => matches(query, [user.name, user.email, user.role]))
    .sort((a, b) => compare[sort](a, b) || byName(a.name, b.name));
}

export function filterContent(content: AdminContent[], query: string, sort: ContentSort, showDeleted: boolean): AdminContent[] {
  const compare: Record<ContentSort, (a: AdminContent, b: AdminContent) => number> = {
    name: (a, b) => byName(a.caption, b.caption),
    recent: (a, b) => newestFirst(a.createdAt, b.createdAt),
    votes: (a, b) => b.voteCount - a.voteCount,
  };
  return content
    .filter((item) => showDeleted || !item.deletedAt)
    .filter((item) => matches(query, [item.caption, item.prompt, item.authorName, item.authorEmail]))
    .sort((a, b) => compare[sort](a, b) || newestFirst(a.createdAt, b.createdAt));
}
