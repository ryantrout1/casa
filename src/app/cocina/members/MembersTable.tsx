"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type Member = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  punch_progress: number;
  last_visit_at: string | null;
  birth_month: number | null;
  birth_day: number | null;
};

type SortKey = "name" | "contact" | "card" | "visit" | "bday";

const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtBirthday(m: number | null, d: number | null): string {
  if (!m || !d || m < 1 || m > 12) return "—";
  return `${MON[m - 1]} ${d}`;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MembersTable({ members }: { members: Member[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("visit");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        (m.name ?? "").toLowerCase().includes(q) ||
        (m.email ?? "").toLowerCase().includes(q) ||
        (m.phone ?? "").toLowerCase().includes(q),
    );
  }, [members, query]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = (a.name ?? "").localeCompare(b.name ?? "", "en", {
          sensitivity: "base",
        });
      } else if (sortKey === "contact") {
        cmp = (a.email ?? a.phone ?? "").localeCompare(
          b.email ?? b.phone ?? "",
          "en",
          { sensitivity: "base" },
        );
      } else if (sortKey === "card") {
        cmp = a.punch_progress - b.punch_progress;
      } else if (sortKey === "bday") {
        const ak = a.birth_month && a.birth_day ? a.birth_month * 100 + a.birth_day : null;
        const bk = b.birth_month && b.birth_day ? b.birth_month * 100 + b.birth_day : null;
        if (ak === null && bk === null) cmp = 0;
        else if (ak === null) return 1; // no birthday always sorts last
        else if (bk === null) return -1;
        else cmp = ak - bk;
      } else {
        const av = a.last_visit_at ? new Date(a.last_visit_at).getTime() : 0;
        const bv = b.last_visit_at ? new Date(b.last_visit_at).getTime() : 0;
        cmp = av - bv;
      }
      return cmp * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  function sortBy(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "contact" ? "asc" : "desc");
    }
    setPage(1);
  }

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";
  const ariaSort = (key: SortKey): "ascending" | "descending" | "none" =>
    sortKey === key ? (sortDir === "asc" ? "ascending" : "descending") : "none";

  function open(id: string) {
    router.push(`/cocina/members/${id}`);
  }

  return (
    <>
      <h1>Members</h1>
      <p className="lede">
        {query.trim() ? `Results for “${query.trim()}” — ` : ""}
        {total} member{total === 1 ? "" : "s"}
        {query.trim() ? "" : " total"}.
      </p>

      <div className="search">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name, email, or phone"
          autoComplete="off"
        />
      </div>

      <div className="panel">
        <table className="t">
          <thead>
            <tr>
              <th
                className="th-sort"
                aria-sort={ariaSort("name")}
                onClick={() => sortBy("name")}
              >
                Name{arrow("name")}
              </th>
              <th
                className="th-sort"
                aria-sort={ariaSort("contact")}
                onClick={() => sortBy("contact")}
              >
                Contact{arrow("contact")}
              </th>
              <th
                className="th-sort"
                aria-sort={ariaSort("card")}
                onClick={() => sortBy("card")}
              >
                Card{arrow("card")}
              </th>
              <th
                className="th-sort"
                aria-sort={ariaSort("visit")}
                onClick={() => sortBy("visit")}
              >
                Last visit{arrow("visit")}
              </th>
              <th
                className="th-sort"
                aria-sort={ariaSort("bday")}
                onClick={() => sortBy("bday")}
              >
                Birthday{arrow("bday")}
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((m) => (
              <tr
                key={m.id}
                className="row-link"
                tabIndex={0}
                role="link"
                aria-label={`Open ${m.name ?? "member"}`}
                onClick={() => open(m.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open(m.id);
                  }
                }}
              >
                <td>
                  {m.name ?? <span className="muted">(no name)</span>}
                </td>
                <td>
                  {m.email ?? m.phone ?? <span className="muted">—</span>}
                </td>
                <td>{m.punch_progress} / 10</td>
                <td>{fmtDate(m.last_visit_at)}</td>
                <td>{fmtBirthday(m.birth_month, m.birth_day)}</td>
              </tr>
            ))}
            {total === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  No members match that search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {total > 0 ? (
          <div className="pager">
            <span className="pager-info">
              Showing {start + 1}–{Math.min(start + pageSize, total)} of {total}
            </span>
            <div className="pager-ctrls">
              <label className="pager-size">
                Per page
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                ‹ Prev
              </button>
              <span className="pager-page">
                Page {safePage} of {pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={safePage >= pageCount}
              >
                Next ›
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
