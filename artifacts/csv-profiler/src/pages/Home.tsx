import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import { Upload, FileText, X, BarChart2, Table2, Info } from "lucide-react";
import { profileData, type DataProfile, type ColumnLayout, formatFileSize } from "@/lib/csv-profiler";
import { ColumnDetailPanel } from "@/components/ColumnDetailPanel";
import { DataPreviewTable } from "@/components/DataPreviewTable";
import { SummaryCards } from "@/components/SummaryCards";
import { ProfileTable } from "@/components/ProfileTable";

type ViewMode = "profile" | "preview";

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<DataProfile | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<ColumnLayout | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("profile");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".tsv") && file.type !== "text/csv") {
      setError("Please upload a CSV or TSV file.");
      return;
    }
    setError(null);
    setIsLoading(true);
    setProfile(null);
    setSelectedColumn(null);

    const delimiter = name.endsWith(".tsv") ? "\t" : undefined;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        const data = results.data as Record<string, string>[];
        const p = profileData(data, headers, file.name, file.size);
        setProfile(p);
        setIsLoading(false);
      },
      error: (err) => {
        setError(`Failed to parse file: ${err.message}`);
        setIsLoading(false);
      },
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleReset = () => {
    setProfile(null);
    setSelectedColumn(null);
    setError(null);
    setViewMode("profile");
  };

  const handleUpdateQRef = (
    colIndex: number,
    sec: string,
    item: string,
    col: string,
    remarks: string
  ) => {
    if (!profile) return;
    const updated = { ...profile };
    updated.columns = profile.columns.map((c, i) =>
      i === colIndex ? { ...c, qSec: sec, qItem: item, qCol: col, remarks } : c
    );
    setProfile(updated);
    if (selectedColumn && selectedColumn.srlNo === colIndex + 1) {
      setSelectedColumn({ ...selectedColumn, qSec: sec, qItem: item, qCol: col, remarks });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground leading-tight">CSV Data Profiler</h1>
              <p className="text-xs text-muted-foreground">Auto-generate data layout tables from any CSV file</p>
            </div>
          </div>
          {profile && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
              Load new file
            </button>
          )}
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Upload area */}
        {!profile && !isLoading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div
              className={`w-full max-w-2xl border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-accent/30"
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Drop your CSV file here</h2>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse — supports CSV and TSV files of any size
              </p>
              <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg">
                <FileText className="w-4 h-4" />
                Choose file
              </div>
            </div>

            {error && (
              <div className="mt-4 text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="mt-8 text-center max-w-xl">
              <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">What this tool generates</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: "📋", label: "Layout table", desc: "Srl. no., Item, Length, Byte positions" },
                  { icon: "📐", label: "Field widths", desc: "Auto-computed from actual data" },
                  { icon: "💬", label: "Remarks", desc: "Auto-inferred from value patterns" },
                ].map((item) => (
                  <div key={item.label} className="bg-card border border-border rounded-xl p-3 text-left">
                    <div className="text-lg mb-1">{item.icon}</div>
                    <div className="text-xs font-medium text-foreground">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Profiling your dataset...</p>
          </div>
        )}

        {/* Results */}
        {profile && (
          <div className="space-y-6">
            {/* File info + view toggle */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{profile.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {profile.totalRows.toLocaleString()} rows &times; {profile.totalColumns} columns
                    {profile.fileSize ? ` · ${formatFileSize(profile.fileSize)}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <button
                  onClick={() => setViewMode("profile")}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                    viewMode === "profile"
                      ? "bg-card text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  Layout Table
                </button>
                <button
                  onClick={() => setViewMode("preview")}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                    viewMode === "preview"
                      ? "bg-card text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Table2 className="w-3.5 h-3.5" />
                  Data Preview
                </button>
              </div>
            </div>

            {/* Summary cards */}
            <SummaryCards profile={profile} />

            {viewMode === "profile" && (
              <div className={`grid gap-6 ${selectedColumn ? "grid-cols-[1fr_340px]" : "grid-cols-1"}`}>
                <ProfileTable
                  profile={profile}
                  selectedColumn={selectedColumn}
                  onSelectColumn={setSelectedColumn}
                  onUpdateQRef={handleUpdateQRef}
                />
                {selectedColumn && (
                  <ColumnDetailPanel
                    column={selectedColumn}
                    onClose={() => setSelectedColumn(null)}
                  />
                )}
              </div>
            )}

            {viewMode === "preview" && (
              <DataPreviewTable profile={profile} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
