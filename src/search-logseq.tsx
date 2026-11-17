import {
  ActionPanel,
  Action,
  List,
  Icon,
  Keyboard,
  getPreferenceValues,
  openExtensionPreferences,
  LocalStorage,
} from "@raycast/api";
import { execFile } from "child_process";
import { homedir } from "os";
import { ReactElement, useEffect, useState } from "react";

interface Preferences {
  graphName?: string;
  logseqPath?: string;
  maxResults?: string;
}

interface LogseqPage {
  "block/uuid": string;
  "block/title": string;
  "block/name": string;
  "db/id": number;
}

const STORAGE_KEY = "selected-graph";
const DEFAULT_MAX_RESULTS = 20;
const SEARCH_DELAY_MS = 150;

function expandHome(path: string): string {
  return path === "~" || path.startsWith("~/")
    ? homedir() + path.slice(1)
    : path;
}

/**
 * Runs the bundled `logseq` CLI with `--output json` and returns the `data`
 * field. The CLI exits non-zero on errors but still prints a JSON error
 * object on stdout, so that is read first to give a useful message.
 */
function runLogseq(
  binary: string,
  args: string[],
  signal?: AbortSignal,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    execFile(
      binary,
      [...args, "--output", "json"],
      { maxBuffer: 10 * 1024 * 1024, signal },
      (err, stdout) => {
        let parsed: {
          status?: string;
          data?: unknown;
          error?: { message?: string } | string;
        } | null = null;
        try {
          parsed = JSON.parse(stdout);
        } catch {
          // fall through to the process error below
        }
        if (parsed?.status === "ok") {
          resolve(parsed.data);
          return;
        }
        if (parsed?.error) {
          const message =
            typeof parsed.error === "string"
              ? parsed.error
              : parsed.error.message || "Logseq CLI returned an error";
          reject(new Error(message));
          return;
        }
        reject(err ?? new Error("Unexpected output from the Logseq CLI"));
      },
    );
  });
}

function describeError(err: unknown): string {
  if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
    return "Cannot find the Logseq CLI. Check the path in the extension preferences.";
  }
  return err instanceof Error ? err.message : String(err);
}

function buildEdnQuery(raw: string): string {
  const needle = raw
    .trim()
    .toLowerCase()
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
  // Named pages whose name contains the text; journal pages are left out.
  return `[:find (pull ?p [:block/uuid :block/title :block/name :db/id]) :where [?p :block/name ?name] [(clojure.string/includes? ?name "${needle}")] (not [?p :block/journal-day])]`;
}

// Exact match first, then names that start with the text, then the rest;
// shorter names before longer ones, then alphabetical.
function rankPages(pages: LogseqPage[], raw: string): LogseqPage[] {
  const needle = raw.trim().toLowerCase();
  const rank = (p: LogseqPage) =>
    p["block/name"] === needle ? 0 : p["block/name"].startsWith(needle) ? 1 : 2;
  return [...pages].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      a["block/name"].length - b["block/name"].length ||
      a["block/name"].localeCompare(b["block/name"]),
  );
}

export default function SearchLogseq() {
  const preferences = getPreferenceValues<Preferences>();
  const logseqPath = expandHome(
    preferences.logseqPath?.trim() || "~/.local/bin/logseq",
  );
  const parsedMax = parseInt(preferences.maxResults || "", 10);
  const maxResults = parsedMax > 0 ? parsedMax : DEFAULT_MAX_RESULTS;

  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<LogseqPage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [graphs, setGraphs] = useState<string[]>([]);
  const [selectedGraph, setSelectedGraph] = useState("");
  const [isLoadingGraphs, setIsLoadingGraphs] = useState(true);
  const [graphError, setGraphError] = useState<string | null>(null);

  // Load the graph list, then pick the saved graph, the preferred graph, or the first one.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = (await runLogseq(logseqPath, ["graph", "list"])) as {
          graphs?: string[];
        };
        const names = data?.graphs ?? [];
        const saved = await LocalStorage.getItem<string>(STORAGE_KEY);
        const preferred = preferences.graphName?.trim();
        const initial =
          (saved && names.includes(saved) && saved) ||
          (preferred && names.includes(preferred) && preferred) ||
          names[0] ||
          "";
        if (cancelled) return;
        // Graphs and selection are set together so the dropdown first
        // appears with its items and its value already in place.
        setGraphs(names);
        setSelectedGraph(initial);
        setGraphError(names.length === 0 ? "No Logseq DB graphs found." : null);
      } catch (err) {
        if (!cancelled) setGraphError(describeError(err));
      } finally {
        if (!cancelled) setIsLoadingGraphs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [logseqPath]);

  function handleGraphChange(newGraph: string) {
    // The dropdown reports its current value when it appears; that is not a choice.
    if (newGraph === selectedGraph || !graphs.includes(newGraph)) return;
    setSelectedGraph(newGraph);
    LocalStorage.setItem(STORAGE_KEY, newGraph);
  }

  // Search whenever the text or the graph changes. Each new search cancels
  // the one before it, so an older, slower answer never replaces a newer one.
  useEffect(() => {
    const text = searchText.trim();
    if (!text || !selectedGraph) {
      setResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = (await runLogseq(
          logseqPath,
          ["query", "--graph", selectedGraph, "--query", buildEdnQuery(text)],
          controller.signal,
        )) as { result?: LogseqPage[][] };
        if (controller.signal.aborted) return;
        const pages = (data?.result ?? []).map((row) => row[0]);
        setResults(rankPages(pages, text).slice(0, maxResults));
        setSearchError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setResults([]);
        setSearchError(describeError(err));
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, SEARCH_DELAY_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchText, selectedGraph, logseqPath, maxResults]);

  const pageUrl = (page: LogseqPage) =>
    `logseq://graph/${encodeURIComponent(selectedGraph)}?block-id=${page["block/uuid"]}`;

  const preferencesAction = (
    <Action
      title="Open Extension Preferences"
      onAction={openExtensionPreferences}
      icon={Icon.Gear}
    />
  );

  const error = graphError ?? searchError;
  let emptyView: ReactElement | null = null;
  if (error) {
    emptyView = (
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="Something went wrong"
        description={error}
        actions={<ActionPanel>{preferencesAction}</ActionPanel>}
      />
    );
  } else if (!searchText.trim()) {
    emptyView = (
      <List.EmptyView
        icon={Icon.Book}
        title="Search Logseq"
        description={
          selectedGraph
            ? `Start typing to search pages in ${selectedGraph}`
            : "Loading graphs…"
        }
      />
    );
  } else if (!isSearching && results.length === 0) {
    emptyView = (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No pages found"
        description={`No pages matching "${searchText.trim()}" in ${selectedGraph}`}
      />
    );
  }

  return (
    <List
      isLoading={isSearching || isLoadingGraphs}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={
        selectedGraph ? `Search in ${selectedGraph}…` : "Loading graphs…"
      }
      searchBarAccessory={
        graphs.length > 0 ? (
          <List.Dropdown
            tooltip="Select Graph"
            value={selectedGraph}
            onChange={handleGraphChange}
          >
            {graphs.map((graph) => (
              <List.Dropdown.Item key={graph} title={graph} value={graph} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {emptyView ??
        results.map((page) => (
          <List.Item
            key={page["block/uuid"]}
            title={page["block/title"] || page["block/name"]}
            icon={Icon.Document}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Logseq"
                  url={pageUrl(page)}
                  icon={Icon.Book}
                />
                <Action.CopyToClipboard
                  title="Copy Page Link"
                  content={pageUrl(page)}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Page Title"
                  content={page["block/title"] || page["block/name"]}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                {preferencesAction}
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
