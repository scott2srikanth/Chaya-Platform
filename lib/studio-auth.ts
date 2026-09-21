export const STUDIO_COOKIE = "chaya-studio-access";
export function safeReturnPath(value: string | null) {
  return value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\r\n]/.test(value)
    ? value
    : "/studio";
}
