function groupBy<T>(elements: Array<T>, selector: (x: T) => string | number): Record<string, Array<T>> {
  const map: Record<string, Array<T>> = {};

  for (const x of elements) {
    const key = selector(x);

    if (!key) continue;

    if (!map[key]) {
      map[key] = [];
    }

    map[key].push(x);
  }

  return map;
}

type NestedArray<T> = T | Array<NestedArray<T>>;

function flatten<T = any>(source: Array<NestedArray<T>>): Array<T> {
  if (source.length === 0) return [];
  const list = [];
  const levelMap = { 0: { idx: 0, source } };
  let level = 0;

  do {
    const { source, idx } = levelMap[level];
    const item = source[idx];

    if (idx >= source.length) {
      level--;
      levelMap[level].idx++;
      continue;
    }

    if (Array.isArray(item)) {
      level++;
      levelMap[level] = {
        idx: 0,
        source: item,
      };
    } else {
      list.push(item);
      levelMap[level].idx++;
    }
  } while (!(level === 0 && levelMap[level].idx >= levelMap[level].source.length));

  return list;
}

export { groupBy, flatten };
