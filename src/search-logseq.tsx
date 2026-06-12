import {
  ActionPanel,
  Action,
  List,
  Icon,
  getPreferenceValues,
  showToast,
  Toast,
  openExtensionPreferences,
  LocalStorage,
} from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { useEffect, useState } from "react";

const execFileAsync = promisify(execFile);

interface Preferences {
  graphName?: string;
  logseqPath?: string;
  maxResults: string;
}

interface LogseqPage {
  "block/uuid": string;
  "block/title": string;
  "block/name": string;
  "db/id": number;
}

const STORAGE_KEY = "selected-graph";

function buildEdnQuery(raw: string): string {
  const needle = raw.toLowerCase().replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  // Exclude journal pages: (not [?p :block/journal-day]) drops any page that has a journal day.
  return `[:find (pull ?p [:block/uuid :block/title :block/name :db/id]) :where [?p :block/name ?name] [(clojure.string/includes? ?name "${needle}")] (not [?p :block/journal-day])]`;
}

export default function SearchLogseq() {
  const preferences = getPreferenceValues<Preferences>();
  const logseqPath =
    preferences.logseqPath || "/Users/niyaro/.local/bin/logseq";
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<LogseqPage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGraph, setSelectedGraph] = useState<string>("");
  const [availableGraphs, setAvailableGraphs] = useState<string[]>([]);
  const [isLoadingGraphs, setIsLoadingGraphs] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initialGraph, setInitialGraph] = useState<string | null>(null);
  const [firstGraph, setFirstGraph] = useState<string | null>(null);

  // Fetch available graphs from CLI
  useEffect(() => {
    async function fetchGraphs() {
      try {
        const { stdout } = await execFileAsync(
          logseqPath,
          ["graph", "list", "--output", "json"],
          {
            maxBuffer: 10 * 1024 * 1024,
          },
        );

        const parsed: any = JSON.parse(stdout);

        if (parsed.status !== "ok") {
          throw new Error(parsed.error || "logseq graph list failed");
        }

        const graphNames: string[] = parsed.data.graphs || [];

        setAvailableGraphs(graphNames);

        // Load saved graph selection from LocalStorage
        const savedGraph = await LocalStorage.getItem<string>(STORAGE_KEY);

        let graphToUse = "";
        if (savedGraph && graphNames.includes(savedGraph)) {
          // Use saved graph from previous session
          graphToUse = savedGraph;
        } else if (graphNames.length > 0) {
          // No saved selection - default to first graph but DON'T save it
          // Only save when user explicitly selects from dropdown
          graphToUse = graphNames[0];
        }

        // Store the first graph to detect Dropdown initialization calls
        setFirstGraph(graphNames[0]);

        // Store the initial graph value to prevent onChange from firing for the same value
        setInitialGraph(graphToUse);
        setSelectedGraph(graphToUse);

        // Mark initialization as complete
        setIsInitialized(true);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";

        if (
          (err instanceof Error &&
            (err as NodeJS.ErrnoException).code === "ENOENT") ||
          errorMessage.includes("ENOENT") ||
          errorMessage.includes("command not found")
        ) {
          setError(
            "Cannot run logseq CLI. Check the binary path in extension preferences.",
          );
        } else {
          setError(`Failed to load graphs: ${errorMessage}`);
        }
      } finally {
        setIsLoadingGraphs(false);
      }
    }

    fetchGraphs();
  }, [logseqPath]);

  // Handle graph selection change
  async function handleGraphChange(newGraph: string) {
    // If this is trying to set the initial graph value during initialization, ignore it
    if (!isInitialized && newGraph === initialGraph) {
      return;
    }

    // If this is trying to set the first graph when we already have a different selection, ignore it
    // This handles the case where Dropdown calls onChange with first graph during render
    if (
      isInitialized &&
      newGraph === firstGraph &&
      selectedGraph !== firstGraph
    ) {
      return;
    }

    setSelectedGraph(newGraph);

    // Only save to LocalStorage if component is initialized (not during initial setup)
    if (isInitialized) {
      await LocalStorage.setItem(STORAGE_KEY, newGraph);
    }

    // Clear results when changing graphs
    setResults([]);
    setSearchText("");
  }

  // Search functionality
  useEffect(() => {
    if (!searchText.trim() || !selectedGraph) {
      setResults([]);
      setError(null);
      return;
    }

    async function search() {
      setIsLoading(true);
      setError(null);

      try {
        const maxResults = parseInt(preferences.maxResults || "20");

        const ednQuery = buildEdnQuery(searchText);
        const { stdout } = await execFileAsync(
          logseqPath,
          [
            "query",
            "--graph",
            selectedGraph,
            "--query",
            ednQuery,
            "--output",
            "json",
          ],
          { maxBuffer: 10 * 1024 * 1024 },
        );

        const parsed: any = JSON.parse(stdout);

        if (parsed.status !== "ok") {
          throw new Error(parsed.error || "logseq query failed");
        }

        const rows: LogseqPage[] = (parsed.data?.result || []).map(
          (row: LogseqPage[]) => row[0],
        );

        // Limit results
        const pages = rows.slice(0, maxResults);
        setResults(pages);

        if (pages.length === 0) {
          setError("No results found");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";

        // Check if it's a missing binary error
        if (
          (err instanceof Error &&
            (err as NodeJS.ErrnoException).code === "ENOENT") ||
          errorMessage.includes("ENOENT") ||
          errorMessage.includes("command not found")
        ) {
          setError(
            "Cannot run logseq CLI. Check the binary path in extension preferences.",
          );
        } else {
          setError(errorMessage);
        }

        setResults([]);

        await showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    // Debounce search
    const timeoutId = setTimeout(search, 300);
    return () => clearTimeout(timeoutId);
  }, [searchText, selectedGraph, logseqPath, preferences.maxResults]);

  const openInLogseq = (page: LogseqPage) => {
    const uuid = page["block/uuid"];
    // Encode graph name to handle spaces and special characters
    const encodedGraph = encodeURIComponent(selectedGraph);
    const url = `logseq://graph/${encodedGraph}?block-id=${uuid}`;
    return url;
  };

  return (
    <List
      isLoading={isLoading || isLoadingGraphs}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={
        selectedGraph ? `Search in ${selectedGraph}...` : "Loading graphs..."
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Graph"
          value={selectedGraph}
          onChange={handleGraphChange}
          isLoading={isLoadingGraphs}
        >
          {availableGraphs.length === 0 ? (
            <List.Dropdown.Item title="No graphs available" value="" />
          ) : (
            availableGraphs.map((graph) => (
              <List.Dropdown.Item key={graph} title={graph} value={graph} />
            ))
          )}
        </List.Dropdown>
      }
      throttle
    >
      {error && !isLoading ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                onAction={openExtensionPreferences}
                icon={Icon.Gear}
              />
            </ActionPanel>
          }
        />
      ) : searchText && !isLoading && results.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No results found"
          description={
            selectedGraph
              ? `No pages matching "${searchText}" in ${selectedGraph}`
              : "No graph selected"
          }
        />
      ) : !searchText ? (
        <List.EmptyView
          icon={Icon.Book}
          title="Search Logseq"
          description={
            selectedGraph
              ? `Start typing to search pages in ${selectedGraph}`
              : "Select a graph from the dropdown and start typing"
          }
        />
      ) : (
        results.map((page) => (
          <List.Item
            key={page["block/uuid"]}
            title={page["block/title"] || page["block/name"]}
            subtitle={
              page["block/name"] !== page["block/title"]
                ? page["block/name"]
                : undefined
            }
            accessories={[{ icon: Icon.Document }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Logseq"
                  url={openInLogseq(page)}
                  icon={Icon.Book}
                />
                <Action.CopyToClipboard
                  title="Copy Page Link"
                  content={openInLogseq(page)}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Page Title"
                  content={page["block/title"]}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action
                  title="Open Preferences"
                  onAction={openExtensionPreferences}
                  icon={Icon.Gear}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
