function detailFromData(data: unknown): string | undefined {
  if (
    typeof data === "object" &&
    data !== null &&
    "detail" in data &&
    typeof (data as { detail: unknown }).detail === "string"
  ) {
    return (data as { detail: string }).detail;
  }
  return undefined;
}

/** Best-effort message for RTK Query `error` / `.unwrap()` rejections. */
export function rtkErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const detail = detailFromData(
      "data" in error ? (error as { data: unknown }).data : error
    );
    if (detail) return detail;
    if (
      "error" in error &&
      typeof (error as { error: unknown }).error === "string"
    ) {
      return (error as { error: string }).error;
    }
    if (
      "status" in error &&
      typeof (error as { status: unknown }).status === "number"
    ) {
      return `Request failed (${(error as { status: number }).status})`;
    }
  }
  return "Request failed";
}
