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
import { useEffect, useState } from "react";

interface Preferences {
  graphName?: string;
  serverUrl: string;
  maxResults: string;
}

interface LogseqPage {
  "block/uuid": string;
  "block/title": string;
  "block/name": string;
  "db/id": number;
  "block/journal-day"?: number;
}

interface SearchResponse {
  success: boolean;
  data?: LogseqPage[];
  error?: string;
  stderr?: string;
}

interface ListGraphsResponse {
  success: boolean;
  stdout?: string;
  error?: string;
  stderr?: string;
}

const STORAGE_KEY = "selected-graph";

export default function SearchLogseq() {
  const preferences = getPreferenceValues<Preferences>();
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

  // Fetch available graphs from server
  useEffect(() => {
    async function fetchGraphs() {
      try {
        const serverUrl = preferences.serverUrl || "http://localhost:8765";
        const response = await fetch(`${serverUrl}/list`);

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const data: ListGraphsResponse = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to fetch graphs");
        }

        // Parse graph names from stdout
        const lines = (data.stdout || "").split("\n");
        const graphNames = lines
          .filter(
            (line) =>
              line.trim() &&
              !line.includes(":") &&
              line.trim() !== "DB Graphs" &&
              line.trim() !== "File Graphs"
          )
          .map((line) => line.trim());

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
        const errorMessage = err instanceof Error ? err.message : "Unknown error";

        if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
          setError("Cannot connect to Logseq HTTP server. Make sure it's running.");
        } else {
          setError(`Failed to load graphs: ${errorMessage}`);
        }
      } finally {
        setIsLoadingGraphs(false);
      }
    }

    fetchGraphs();
  }, [preferences.serverUrl]);

  // Handle graph selection change
  async function handleGraphChange(newGraph: string) {
    // If this is trying to set the initial graph value during initialization, ignore it
    if (!isInitialized && newGraph === initialGraph) {
      return;
    }
    
    // If this is trying to set the first graph when we already have a different selection, ignore it
    // This handles the case where Dropdown calls onChange with first graph during render
    if (isInitialized && newGraph === firstGraph && selectedGraph !== firstGraph) {
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
        const serverUrl = preferences.serverUrl || "http://localhost:8765";
        const maxResults = parseInt(preferences.maxResults || "20");

        const url = `${serverUrl}/search?q=${encodeURIComponent(searchText)}&graph=${encodeURIComponent(
          selectedGraph
        )}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const data: SearchResponse = await response.json();

        if (!data.success) {
          throw new Error(data.error || data.stderr || "Search failed");
        }

        // Limit results
        const pages = (data.data || []).slice(0, maxResults);
        setResults(pages);

        if (pages.length === 0) {
          setError("No results found");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";

        // Check if it's a connection error
        if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
          setError("Cannot connect to Logseq HTTP server. Make sure it's running.");
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
  }, [searchText, selectedGraph, preferences.serverUrl, preferences.maxResults]);

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
      searchBarPlaceholder={selectedGraph ? `Search in ${selectedGraph}...` : "Loading graphs..."}
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
            availableGraphs.map((graph) => <List.Dropdown.Item key={graph} title={graph} value={graph} />)
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
              <Action title="Open Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      ) : searchText && !isLoading && results.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No results found"
          description={selectedGraph ? `No pages matching "${searchText}" in ${selectedGraph}` : "No graph selected"}
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
            subtitle={page["block/name"] !== page["block/title"] ? page["block/name"] : undefined}
            accessories={[
              {
                tag: page["block/journal-day"] ? "Journal" : undefined,
                icon: page["block/journal-day"] ? Icon.Calendar : Icon.Document,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Logseq" url={openInLogseq(page)} icon={Icon.Book} />
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
                  shortcut={{ modifiers: ["cmd"], key: "," }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
