//Avoid: let data: Object;
// too vague. Prefer Record<string, unknown> or specific shapes.
export function isNonEmptyObject(obj: Record<string, unknown>): boolean {
  return (
    obj !== null &&
    typeof obj === "object" &&
    !Array.isArray(obj) &&
    Object.keys(obj).length > 0
  );
}

