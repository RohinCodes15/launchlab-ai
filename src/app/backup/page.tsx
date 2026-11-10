"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Button, Confirm, Panel, StatusMessage, inputBase } from "@/components/ui";
import { MAX_BACKUP_BYTES, createBackup, parseBackup, type ImportMode } from "@/lib/backup";
import type { Project } from "@/lib/schema";
import { clearRecoveryCopy, importProjects, useProjects, useRecoveryCopy } from "@/lib/store";

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const today = () => new Date().toISOString().slice(0, 10);
const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "project";
const exportFile = (projects: Project[]) =>
  JSON.stringify(createBackup(projects, new Date().toISOString()), null, 2);

type Preview = { fileName: string; projects: Project[]; dropped: number; exportedAt?: string };

export default function BackupPage() {
  const { projects, ready } = useProjects();
  const recovery = useRecoveryCopy();
  const fileInput = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState("");
  const [preview, setPreview] = useState<Preview>();
  const [mode, setMode] = useState<ImportMode>("merge");
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [isConfirming, setIsConfirming] = useState(false);

  const single = projects.find((p) => p.id === selected) ?? projects[0];

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreview(undefined);
    setMessage(undefined);
    setError(undefined);
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setError("That file is too large to be a LaunchLab backup (limit 5 MB).");
      return;
    }
    const result = parseBackup(await file.text());
    if (result.ok)
      setPreview({
        fileName: file.name,
        projects: result.projects,
        dropped: result.dropped,
        exportedAt: result.exportedAt,
      });
    else setError(result.error);
  }

  function runImport() {
    if (!preview) return;
    importProjects(preview.projects, mode);
    setMessage(
      `${mode === "merge" ? "Added" : "Restored"} ${preview.projects.length} ${preview.projects.length === 1 ? "project" : "projects"} from ${preview.fileName}.`,
    );
    setPreview(undefined);
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="font-display text-5xl">Backup Center</h1>
        <p className="mt-2 text-muted">
          Your projects live only in this browser. Export them to a file to keep a copy, move them
          to another computer, or share one with a teacher.
        </p>
      </div>

      <Panel
        level="h2"
        title="Export"
        description="Files are saved to your computer. Nothing is uploaded."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={!ready || projects.length === 0}
            onClick={() => download(`launchlab-backup-${today()}.json`, exportFile(projects))}
          >
            Export all projects ({projects.length})
          </Button>
        </div>
        {projects.length > 0 && single && (
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Project to export"
              value={single.id}
              onChange={(e) => setSelected(e.target.value)}
              className={`${inputBase} max-w-full`}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Button
              onClick={() =>
                download(`launchlab-${slug(single.name)}-${today()}.json`, exportFile([single]))
              }
            >
              Export this project
            </Button>
          </div>
        )}
      </Panel>

      <Panel
        level="h2"
        title="Import"
        description="Every project in the file is checked before anything is saved. Damaged projects are skipped and reported."
      >
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Backup file (.json)</span>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            onChange={handleFile}
            className="text-sm file:mr-3 file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-2 file:text-fg"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {preview && (
          <div className="flex flex-col gap-3 rounded-xl bg-raised p-4 text-sm">
            <p>
              <span className="font-medium">{preview.fileName}</span> contains{" "}
              {preview.projects.length} readable{" "}
              {preview.projects.length === 1 ? "project" : "projects"}
              {preview.exportedAt
                ? `, exported ${new Date(preview.exportedAt).toLocaleDateString()}`
                : ""}
              .
            </p>
            <ul className="list-disc pl-5 text-muted">
              {preview.projects.slice(0, 10).map((p) => (
                <li key={p.id}>{p.name}</li>
              ))}
              {preview.projects.length > 10 && <li>and {preview.projects.length - 10} more</li>}
            </ul>
            {preview.dropped > 0 && (
              <p className="text-warn">
                {preview.dropped} damaged {preview.dropped === 1 ? "project was" : "projects were"}{" "}
                skipped because {preview.dropped === 1 ? "it" : "they"} could not be read.
              </p>
            )}
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 font-medium">How should it be imported?</legend>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "merge"}
                  onChange={() => setMode("merge")}
                  className="mt-1 accent-accent"
                />
                <span>
                  <span className="font-medium">Merge</span>: keep your current projects and add
                  these. A project that already exists here is added as a separate “(imported)”
                  copy, so nothing is overwritten.
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "replace"}
                  onChange={() => setMode("replace")}
                  className="mt-1 accent-accent"
                />
                <span>
                  <span className="font-medium">Replace</span>: delete all {projects.length}{" "}
                  projects in this browser and keep only the ones in this file.
                </span>
              </label>
            </fieldset>
            <Button
              variant="primary"
              className="self-start"
              onClick={() => (mode === "replace" ? setIsConfirming(true) : runImport())}
            >
              {mode === "merge" ? "Import and merge" : "Replace my projects"}
            </Button>
          </div>
        )}
        {message && <StatusMessage>{message}</StatusMessage>}
      </Panel>

      {recovery && (
        <Panel
          level="h2"
          title="Recovered data"
          description="When this browser last loaded your projects, some could not be read and were hidden. The original data was kept here so it is not lost."
        >
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => download(`launchlab-recovered-${today()}.json`, recovery)}>
              Download the original data
            </Button>
            <Button variant="ghost" onClick={clearRecoveryCopy}>
              Discard it
            </Button>
          </div>
          <p className="text-xs text-muted">
            You can import the downloaded file above: any projects that are still readable will be
            restored.
          </p>
        </Panel>
      )}

      <Confirm
        open={isConfirming}
        title="Replace all projects?"
        confirmLabel="Replace my projects"
        danger
        onClose={() => setIsConfirming(false)}
        onConfirm={runImport}
      >
        <p>
          All {projects.length} projects in this browser will be deleted and replaced with the{" "}
          {preview?.projects.length} from the file. This cannot be undone.
        </p>
        <Button
          size="sm"
          className="mt-3"
          onClick={() => download(`launchlab-backup-${today()}.json`, exportFile(projects))}
        >
          Export my current projects first
        </Button>
      </Confirm>
    </div>
  );
}
