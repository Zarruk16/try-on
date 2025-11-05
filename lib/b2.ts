export interface B2ModelItem {
  key: string;
  name: string;
  url: string;
  size: number;
  lastModified: string | null;
}

export async function fetchB2Models(prefix?: string, max?: number): Promise<B2ModelItem[]> {
  const params = new URLSearchParams();
  if (prefix) params.set('prefix', prefix);
  if (max) params.set('max', String(max));

  const res = await fetch(`/api/b2?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch B2 models');
  const json = await res.json();
  return json.models as B2ModelItem[];
}