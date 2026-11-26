export interface ArchiveWorkspaceInBackgroundOptions {
  key: string;
  inFlight: Set<string>;
  archive: () => Promise<{ error: string | null }>;
  onPendingChange: (pending: ReadonlySet<string>) => void;
  closeDialog: () => void;
  showError: (message: string) => void;
}

export async function archiveWorkspaceInBackground({
  key,
  inFlight,
  archive,
  onPendingChange,
  closeDialog,
  showError,
}: ArchiveWorkspaceInBackgroundOptions): Promise<void> {
  if (inFlight.has(key)) return;
  inFlight.add(key);
  onPendingChange(new Set(inFlight));
  closeDialog();
  try {
    const result = await archive();
    if (result.error) throw new Error(result.error);
  } catch (error) {
    showError(error instanceof Error ? error.message : "Unknown error");
  } finally {
    inFlight.delete(key);
    onPendingChange(new Set(inFlight));
  }
}
