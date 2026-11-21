// Keep MANUAL_FILE_TYPE in sync with source_files_file_type_check in the
// database (see the add_manual_source_type migration).
export const MANUAL_FILE_TYPE = "manual";

// How the per-cruise pseudo-source is named wherever sources are shown.
export const MANUAL_SOURCE_NAME = "Manual entries";

// source_snippet is required and non-blank in the database, so manually
// added events carry this placeholder. Manual events are identified by
// their source's file_type, never by matching this text.
export const MANUAL_SNIPPET = "Added manually";