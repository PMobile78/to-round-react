export const lsGet = (key, fallback = null) => {
  try {
    const item = localStorage.getItem(key);
    return item !== null ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

export const lsSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
};

// reads a value that may have been stored either as raw string (legacy) or JSON
export const lsGetString = (key, fallback = null) => {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    const v = JSON.parse(raw);
    return typeof v === 'string' ? v : raw;
  } catch {
    return raw;
  }
};
