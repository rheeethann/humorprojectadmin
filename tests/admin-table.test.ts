import { describe, expect, it } from "vitest";
import { filterContent, filterUsers, type AdminContent, type AdminUser } from "@/lib/admin-table";

const user = (overrides: Partial<AdminUser>): AdminUser => ({
  id: "id", email: "x@columbia.edu", name: "X", role: "user", lastSignInAt: null,
  postCount: 0, voteCount: 0, streakDays: 0, averageDistance: null, ...overrides,
});

const item = (overrides: Partial<AdminContent>): AdminContent => ({
  id: "id", imageUrl: null, caption: "Caption", prompt: "prompt", createdAt: "2026-10-01T00:00:00Z",
  authorName: "Author", authorEmail: "a@columbia.edu", voteCount: 0, averageRating: null, deletedAt: null, ...overrides,
});

const users = [
  user({ id: "a", name: "bea Lee", email: "bl1@columbia.edu", lastSignInAt: "2026-10-02T00:00:00Z", voteCount: 4, streakDays: 1 }),
  user({ id: "b", name: "Ava Kim", email: "ak2@columbia.edu", lastSignInAt: null, voteCount: 9, streakDays: 0 }),
  user({ id: "c", name: "Cal Moe", email: "cm3@columbia.edu", lastSignInAt: "2026-10-05T00:00:00Z", voteCount: 1, streakDays: 6 }),
];

describe("filterUsers", () => {
  it.each([
    ["name", ["b", "a", "c"]],
    ["recent", ["c", "a", "b"]],
    ["votes", ["b", "a", "c"]],
    ["streak", ["c", "a", "b"]],
  ] as const)("sorts by %s", (sort, ids) => {
    expect(filterUsers(users, "", sort).map((u) => u.id)).toEqual(ids);
  });

  it("searches names and emails case-insensitively with every term", () => {
    expect(filterUsers(users, "CM3", "name").map((u) => u.id)).toEqual(["c"]);
    expect(filterUsers(users, "ava kim", "name").map((u) => u.id)).toEqual(["b"]);
    expect(filterUsers(users, "ava lee", "name")).toEqual([]);
  });
});

describe("filterContent", () => {
  const content = [
    item({ id: "1", caption: "Pig farm", createdAt: "2026-10-03T00:00:00Z", voteCount: 2 }),
    item({ id: "2", caption: "apple orchard", createdAt: "2026-10-01T00:00:00Z", voteCount: 7, prompt: "orchard in fall" }),
    item({ id: "3", caption: "Zoo", createdAt: "2026-10-04T00:00:00Z", voteCount: 5, deletedAt: "2026-10-05T00:00:00Z", authorName: "Dee" }),
  ];

  it("hides deleted content unless asked", () => {
    expect(filterContent(content, "", "recent", false).map((c) => c.id)).toEqual(["1", "2"]);
    expect(filterContent(content, "", "recent", true).map((c) => c.id)).toEqual(["3", "1", "2"]);
  });

  it.each([
    ["name", ["2", "1", "3"]],
    ["votes", ["2", "3", "1"]],
  ] as const)("sorts by %s", (sort, ids) => {
    expect(filterContent(content, "", sort, true).map((c) => c.id)).toEqual(ids);
  });

  it("searches caption, prompt, and author", () => {
    expect(filterContent(content, "fall", "recent", true).map((c) => c.id)).toEqual(["2"]);
    expect(filterContent(content, "dee", "recent", true).map((c) => c.id)).toEqual(["3"]);
  });
});
