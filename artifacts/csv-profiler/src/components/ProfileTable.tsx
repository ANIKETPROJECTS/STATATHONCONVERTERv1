import { useState } from "react";
import { ChevronUp, ChevronDown, Search } from "lucide-react";
import type { DataProfile, ColumnProfile } from "@/lib/csv-profiler";
import { formatNumber } from "@/lib/csv-profiler";

type SortKey = "index" | "name" | "type" | "fillRate" | "uniqueCount" | "totalCount";

interface Props {
  profile: DataProfile;
  selectedColumn: ColumnProfile | null;
  onSelectColumn: (col: ColumnProfile | null) => void;
}

const TYPE_COLORS: Record<string, string> = {
  numeric: "bg-blue-100 text-blue-700",
  text: "bg-violet-100 text-violet-700",
  boolean: "bg-emerald-100 text-emerald-700",
  date: "bg-amber-100 text-amber-700",
  mixed: "bg-gray-100 text-gray-600",
};

function FillBar({ rate }: { rate: number }) {
  const color = rate >= 95 ? "bg-emerald-500" : rate >= 80 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${rate}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-10 text-right">{rate.toFixed(1)}%</span>
    </div>
  );
}

export function ProfileTable({ profile, selectedColumn, onSelectColumn }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("index");
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const types = Array.from(new Set(profile.columns.map((c) => c.type)));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = profile.columns
    .filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "all" || c.type === typeFilter;
      return matchSearch && matchType;
    })
    .sort((a, b) => {
      let diff = 0;
      if (sortKey === "index") diff = a.index - b.index;
      else if (sortKey === "name") diff = a.name.localeCompare(b.name);
      else if (sortKey === "type") diff = a.type.localeCompare(b.type);
      else if (sortKey === "fillRate") diff = a.fillRate - b.fillRate;
      else if (sortKey === "uniqueCount") diff = a.uniqueCount - b.uniqueCount;
      else if (sortKey === "totalCount") diff = a.totalCount - b.totalCount;
      return sortAsc ? diff : -diff;
    });

  const SortIcon = ({ k }: { k: SortKey }) => (
    sortKey === k
      ? sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3 opacity-30" />
  );

  const Th = ({ k, children, className = "" }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th
      className={`px-3 py-2.5 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none ${className}`}
      onClick={() => toggleSort(k)}
    >
      <div className="flex items-center gap-1">
        {children}
        <SortIcon k={k} />
      </div>
    </th>
  );

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search columns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted rounded-lg border border-transparent focus:border-ring focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setTypeFilter("all")}
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
              typeFilter === "all" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                typeFilter === t ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {profile.totalColumns} columns</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <Th k="index" className="w-12">#</Th>
              <Th k="name">Column Name</Th>
              <Th k="type" className="w-24">Type</Th>
              <Th k="totalCount" className="w-28">Count</Th>
              <Th k="fillRate" className="w-40">Fill Rate</Th>
              <Th k="uniqueCount" className="w-28">Unique</Th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-48">Sample Values</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground w-48">Stats</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((col) => {
              const isSelected = selectedColumn?.index === col.index;
              return (
                <tr
                  key={col.index}
                  onClick={() => onSelectColumn(isSelected ? null : col)}
                  className={`border-b border-border/60 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary/5 border-l-2 border-l-primary"
                      : "hover:bg-accent/30"
                  }`}
                >
                  <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">{col.index + 1}</td>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-foreground">{col.name}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[col.type] ?? "bg-gray-100 text-gray-600"}`}>
                      {col.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">
                    {col.nonNullCount.toLocaleString()}
                    {col.nullCount > 0 && (
                      <span className="text-red-400 ml-1">(-{col.nullCount})</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <FillBar rate={col.fillRate} />
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">
                    {col.uniqueCount.toLocaleString()}
                    <span className="text-muted-foreground/60 ml-1">({col.uniqueRate.toFixed(0)}%)</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {col.sampleValues.slice(0, 3).map((v, i) => (
                        <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono max-w-[80px] truncate">
                          {v || <span className="italic text-muted-foreground">empty</span>}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">
                    {col.type === "numeric" && col.min !== undefined ? (
                      <span>{formatNumber(col.min)} – {formatNumber(col.max!)}</span>
                    ) : col.type === "text" && col.minLength !== undefined ? (
                      <span>len {col.minLength}–{col.maxLength}</span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">No columns match your filters</div>
        )}
      </div>
    </div>
  );
}
