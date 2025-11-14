/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Default Graph Name (Optional) - Default graph name - you can also select from the dropdown in the search interface */
  "graphName"?: string,
  /** Server URL - URL of the Logseq HTTP server */
  "serverUrl": string,
  /** Max Results - Maximum number of search results to display */
  "maxResults": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-logseq` command */
  export type SearchLogseq = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-logseq` command */
  export type SearchLogseq = {}
}

