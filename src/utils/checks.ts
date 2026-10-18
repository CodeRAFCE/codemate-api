function isNonEmptyObject(obj: Object) {
  return (
    obj !== null &&
    typeof obj === "object" &&
    !Array.isArray(obj) &&
    Object.keys(obj).length > 0
  );
}

export default isNonEmptyObject;
