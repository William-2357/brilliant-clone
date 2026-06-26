function shingles(text: string): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  const set = new Set<string>();
  for (let i = 0; i + 2 < words.length; i++) set.add(words[i] + ' ' + words[i + 1] + ' ' + words[i + 2]);
  return set;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export class Deduper {
  private keys = new Set<string>();
  private proseShingles: Set<string>[] = [];
  private threshold: number;
  constructor(threshold = 0.6) { this.threshold = threshold; }

  /** Seed from already-emitted problems so a fresh run won't re-create them. */
  seed(entries: Array<{ kernel: string; args: number[]; prose: string }>): void {
    for (const e of entries) { this.keys.add(this.key(e.kernel, e.args)); this.proseShingles.push(shingles(e.prose)); }
  }

  private key(kernel: string, args: number[]): string {
    return kernel + ':' + args.map((a) => Math.round(a * 1e4) / 1e4).join(',');
  }

  accept(kernel: string, args: number[], prose: string): boolean {
    const k = this.key(kernel, args);
    if (this.keys.has(k)) return false;
    const sh = shingles(prose);
    for (const prev of this.proseShingles) if (jaccard(sh, prev) >= this.threshold) return false;
    this.keys.add(k);
    this.proseShingles.push(sh);
    return true;
  }
}
