"use client";

/* eslint-disable @next/next/no-img-element -- Generated images are stored as short-lived private URLs. */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteContent, setUserRole } from "./admin-actions";
import { signOut } from "./auth/actions";
import { filterContent, filterUsers, type AdminContent, type AdminUser, type ContentSort, type UserSort } from "@/lib/admin-table";

type Tab = "users" | "content";
type Notice = { text: string; error: boolean } | null;

function formatDateTime(value: string | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function Toolbar<T extends string>({ label, query, onQuery, sort, onSort, options, children }: {
  label: string;
  query: string;
  onQuery: (value: string) => void;
  sort: T;
  onSort: (value: T) => void;
  options: [T, string][];
  children?: React.ReactNode;
}) {
  return (
    <div className="toolbar">
      <label className="search-field">
        <span className="sr-only">Search {label}</span>
        <input type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder={`Search ${label}…`} />
      </label>
      <label className="sort-field">
        <span>Sort by</span>
        <select value={sort} onChange={(event) => onSort(event.target.value as T)}>
          {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
        </select>
      </label>
      {children}
    </div>
  );
}

function UsersTable({ users, viewerId, onNotice }: { users: AdminUser[]; viewerId: string; onNotice: (notice: Notice) => void }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<UserSort>("recent");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const rows = filterUsers(users, query, sort);

  function changeRole(user: AdminUser) {
    const role = user.role === "superadmin" ? "user" : "superadmin";
    const verb = role === "superadmin" ? "Promote" : "Demote";
    if (!window.confirm(`${verb} ${user.name} (${user.email})?`)) return;
    setPendingId(user.id);
    startTransition(async () => {
      const response = await setUserRole(user.id, role);
      onNotice({ text: response.error ?? `${user.name}: ${response.success}`, error: Boolean(response.error) });
      setPendingId(null);
      if (response.success) router.refresh();
    });
  }

  return (
    <>
      <Toolbar label="users" query={query} onQuery={setQuery} sort={sort} onSort={setSort}
        options={[["recent", "Most recent visit"], ["name", "Name (A–Z)"], ["votes", "Most votes cast"], ["streak", "Longest streak"]]} />
      <p className="result-count">{rows.length} of {users.length} users</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>User</th><th>Role</th><th className="num">Posts</th><th className="num">Votes</th><th className="num">Streak</th><th className="num" title="Average distance between the user's votes and each image's average score">Avg. distance</th><th>Last sign-in</th></tr>
          </thead>
          <tbody>
            {rows.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.name}</strong><span className="sub">{user.email}</span></td>
                <td>
                  <span className={user.role === "superadmin" ? "role-badge super" : "role-badge"}>{user.role === "superadmin" ? "Superadmin" : "User"}</span>
                  {!(user.id === viewerId && user.role === "superadmin") && (
                    <button type="button" className="text-button" onClick={() => changeRole(user)} disabled={pendingId === user.id}>
                      {pendingId === user.id ? "Saving…" : user.role === "superadmin" ? "Demote" : "Promote"}
                    </button>
                  )}
                </td>
                <td className="num">{user.postCount}</td>
                <td className="num">{user.voteCount}</td>
                <td className="num">{user.streakDays} {user.streakDays === 1 ? "day" : "days"}</td>
                <td className="num">{user.averageDistance === null ? "—" : `±${user.averageDistance.toFixed(2)}`}</td>
                <td className="nowrap">{formatDateTime(user.lastSignInAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="empty">No users match “{query}”.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ContentTable({ content, onNotice }: { content: AdminContent[]; onNotice: (notice: Notice) => void }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ContentSort>("recent");
  const [showDeleted, setShowDeleted] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const rows = filterContent(content, query, sort, showDeleted);
  const liveCount = content.filter((item) => !item.deletedAt).length;

  function remove(item: AdminContent) {
    if (!window.confirm(`Delete “${item.caption}” by ${item.authorName}? It will disappear from the app.`)) return;
    setPendingId(item.id);
    startTransition(async () => {
      const response = await deleteContent(item.id);
      onNotice({ text: response.error ?? `“${item.caption}” deleted.`, error: Boolean(response.error) });
      setPendingId(null);
      if (response.success) router.refresh();
    });
  }

  return (
    <>
      <Toolbar label="content" query={query} onQuery={setQuery} sort={sort} onSort={setSort}
        options={[["recent", "Most recent"], ["name", "Caption (A–Z)"], ["votes", "Most votes"]]}>
        <label className="check-field"><input type="checkbox" checked={showDeleted} onChange={(event) => setShowDeleted(event.target.checked)} /> Show deleted</label>
      </Toolbar>
      <p className="result-count">{rows.length} shown · {liveCount} live, {content.length - liveCount} deleted</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Image</th><th>Caption</th><th>Prompt</th><th>Author</th><th>Created</th><th className="num">Votes</th><th className="num">Avg.</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className={item.deletedAt ? "deleted-row" : undefined}>
                <td>{item.imageUrl ? <a href={item.imageUrl} target="_blank" rel="noreferrer"><img className="thumb" src={item.imageUrl} alt={item.caption} /></a> : <span className="thumb missing">No image</span>}</td>
                <td><strong>{item.caption}</strong></td>
                <td className="prompt-cell">{item.prompt}</td>
                <td>{item.authorName}<span className="sub">{item.authorEmail}</span></td>
                <td className="nowrap">{formatDateTime(item.createdAt)}</td>
                <td className="num">{item.voteCount}</td>
                <td className="num">{item.averageRating === null ? "—" : item.averageRating.toFixed(1)}</td>
                <td>
                  {item.deletedAt
                    ? <span className="deleted-label" title={formatDateTime(item.deletedAt)}>Deleted</span>
                    : <button type="button" className="text-button danger" onClick={() => remove(item)} disabled={pendingId === item.id}>{pendingId === item.id ? "Deleting…" : "Delete"}</button>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="empty">{query ? `No content matches “${query}”.` : "No content yet."}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function AdminDashboard({ users, content, viewerId, viewerName, appUrl }: {
  users: AdminUser[];
  content: AdminContent[];
  viewerId: string;
  viewerName: string;
  appUrl?: string;
}) {
  const [tab, setTab] = useState<Tab>("users");
  const [notice, setNotice] = useState<Notice>(null);

  return (
    <main>
      <nav className="site-nav">
        <span className="wordmark">Reality <i>Check</i> <small>Admin</small></span>
        <div className="nav-actions">
          <span className="member-name">{viewerName}</span>
          {appUrl && <a className="nav-link" href={appUrl}>Back to app</a>}
          <form action={signOut}><button type="submit" className="nav-link">Sign out</button></form>
        </div>
      </nav>
      <section className="admin-shell">
        <div className="tabs" role="tablist" aria-label="Admin sections">
          <button type="button" role="tab" aria-selected={tab === "users"} className={tab === "users" ? "tab active" : "tab"} onClick={() => setTab("users")}>Users <span>{users.length}</span></button>
          <button type="button" role="tab" aria-selected={tab === "content"} className={tab === "content" ? "tab active" : "tab"} onClick={() => setTab("content")}>Content <span>{content.filter((item) => !item.deletedAt).length}</span></button>
        </div>
        {notice && <p className={notice.error ? "form-message error" : "form-message success"} role={notice.error ? "alert" : "status"}>{notice.text}</p>}
        <div role="tabpanel">
          {tab === "users" ? <UsersTable users={users} viewerId={viewerId} onNotice={setNotice} /> : <ContentTable content={content} onNotice={setNotice} />}
        </div>
      </section>
    </main>
  );
}
