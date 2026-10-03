export interface FeedEntry {
  id: string;
  title: string;
  url: string;
  updated: string;
  summary: string;
}

const escape = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function siteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  return URL.canParse(raw) ? raw.replace(/\/+$/, "") : "https://contributable.vercel.app";
}

/** An Atom 1.0 document. */
export function atom(feed: {
  title: string;
  path: string;
  updated: string;
  entries: FeedEntry[];
}): Response {
  const self = `${siteUrl()}${feed.path}`;
  const body = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<title>${escape(feed.title)}</title>
<id>${escape(self)}</id>
<link rel="self" href="${escape(self)}"/>
<link href="${siteUrl()}"/>
<updated>${feed.updated}</updated>
<author><name>Contributable</name></author>
${feed.entries
  .map(
    (entry) => `<entry>
<id>${escape(entry.id)}</id>
<title>${escape(entry.title)}</title>
<link href="${escape(entry.url)}"/>
<updated>${entry.updated}</updated>
<summary>${escape(entry.summary)}</summary>
</entry>`,
  )
  .join("\n")}
</feed>`;
  return new Response(body, {
    headers: {
      "content-type": "application/atom+xml; charset=utf-8",
      "cache-control": "public, s-maxage=900, stale-while-revalidate=86400",
    },
  });
}
