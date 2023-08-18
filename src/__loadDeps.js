const seen = new Map();

export function __loadDeps(baseImport, ...deps) {
  let result;
  if (seen.has(baseImport)) {
    result = seen.get(baseImport);
  } else {
    result = import(baseImport);
    seen.set(baseImport, result);
  }

  for (let dep of deps) {
    if (!seen.has(dep)) {
      seen.set(dep, import(dep));
    }
  }

  return result;
}
