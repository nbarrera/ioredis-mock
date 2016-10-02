export function pttl(key) {
  if (!this.data.has(key)) {
    return '-2';
  }

  if (!this.expires.has(key)) {
    return '-1';
  }

  return Math.round((this.expires.get(key) - Date.now())).toString();
}