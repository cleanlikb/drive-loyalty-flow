// Best-effort HTML stock scraper. Looks for JSON-LD Vehicle/Product entries
// and falls back to a generic listing card regex.

export interface ScrapedStock {
  make: string;
  model: string;
  year?: number | null;
  trim?: string | null;
  price?: number | null;
  image_url?: string | null;
  listing_url?: string | null;
}

const KNOWN_MAKES = [
  "Audi","BMW","Citroen","Ford","Honda","Hyundai","Jaguar","Kia","Land Rover","Lexus","Mazda","Mercedes-Benz","Mercedes","Mini","Nissan","Peugeot","Renault","Seat","Skoda","Suzuki","Tesla","Toyota","Vauxhall","Volkswagen","Volvo","Fiat","Alfa Romeo","Dacia","Porsche"
];

function priceFromText(t: string): number | null {
  const m = t.replace(/,/g, "").match(/£\s*(\d{4,6})/);
  return m ? Number(m[1]) : null;
}

function detectMakeModel(t: string): { make: string; model: string } | null {
  for (const make of KNOWN_MAKES) {
    const re = new RegExp(`${make}\\s+([A-Za-z0-9-]+)`, "i");
    const m = t.match(re);
    if (m) return { make, model: m[1] };
  }
  return null;
}

export async function scrapeStockUrl(url: string): Promise<ScrapedStock[]> {
  const res = await fetch(url, {
    headers: { "user-agent": "SoldbookBot/1.0 (+https://soldbook.app)" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  const html = await res.text();

  const results: ScrapedStock[] = [];

  // 1) JSON-LD
  const ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = ldRe.exec(html))) {
    try {
      const json = JSON.parse(m[1].trim());
      const items: any[] = Array.isArray(json) ? json : json["@graph"] ?? [json];
      for (const it of items) {
        const type = it["@type"];
        if (!type) continue;
        const isVeh = String(type).toLowerCase().includes("vehicle") || String(type).toLowerCase().includes("car") || String(type).toLowerCase().includes("product");
        if (!isVeh) continue;
        const make = it.brand?.name ?? it.manufacturer?.name ?? it.brand;
        const model = it.model ?? it.name;
        const price = Number(it.offers?.price ?? it.price ?? 0) || null;
        if (make && model) {
          results.push({
            make: String(make),
            model: String(model),
            year: Number(it.vehicleModelDate ?? it.productionDate ?? 0) || null,
            trim: it.vehicleConfiguration ?? null,
            price,
            image_url: (Array.isArray(it.image) ? it.image[0] : it.image) ?? null,
            listing_url: it.url ?? url,
          });
        }
      }
    } catch { /* ignore */ }
  }

  if (results.length > 0) return results.slice(0, 100);

  // 2) Generic anchor/card fallback: pull anchors with prices
  const anchorRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{20,800}?)<\/a>/gi;
  const seen = new Set<string>();
  while ((m = anchorRe.exec(html))) {
    const href = m[1];
    const inner = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const price = priceFromText(inner);
    if (!price) continue;
    const mm = detectMakeModel(inner);
    if (!mm) continue;
    const key = `${mm.make}-${mm.model}-${price}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const yearMatch = inner.match(/\b(19|20)\d{2}\b/);
    results.push({
      make: mm.make,
      model: mm.model,
      year: yearMatch ? Number(yearMatch[0]) : null,
      trim: null,
      price,
      image_url: null,
      listing_url: href.startsWith("http") ? href : new URL(href, url).toString(),
    });
    if (results.length >= 50) break;
  }

  return results;
}
