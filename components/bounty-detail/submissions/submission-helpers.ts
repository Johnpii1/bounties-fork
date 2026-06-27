export function getStatusBadgeColor(status: string) {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-100 text-emerald-900";
    case "REJECTED":
      return "bg-red-100 text-red-900";
    case "PENDING":
    default:
      return "bg-gray-100 text-gray-900";
  }
}

export function isSafeHttpUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
