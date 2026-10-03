/** Frameworks, chat channels and sign-off rules read from a repository's own files. */

export interface ManifestFiles {
  packageJson?: string | null;
  pyproject?: string | null;
  requirements?: string | null;
  goMod?: string | null;
  cargo?: string | null;
  pom?: string | null;
  gradle?: string | null;
  gemfile?: string | null;
  composer?: string | null;
}

// Dependency name (or prefix ending in "/") to the display name shown as a filter.
const KNOWN: Record<string, string> = {
  react: "React",
  next: "Next.js",
  vue: "Vue",
  nuxt: "Nuxt",
  svelte: "Svelte",
  "@sveltejs/kit": "SvelteKit",
  "@angular/core": "Angular",
  "solid-js": "Solid",
  astro: "Astro",
  express: "Express",
  fastify: "Fastify",
  "@nestjs/core": "NestJS",
  electron: "Electron",
  "react-native": "React Native",
  expo: "Expo",
  tailwindcss: "Tailwind CSS",
  three: "three.js",
  d3: "D3",
  vite: "Vite",
  webpack: "webpack",
  typescript: "TypeScript",
  jest: "Jest",
  vitest: "Vitest",
  playwright: "Playwright",
  "@playwright/test": "Playwright",
  prisma: "Prisma",
  graphql: "GraphQL",
  django: "Django",
  flask: "Flask",
  fastapi: "FastAPI",
  numpy: "NumPy",
  pandas: "pandas",
  scipy: "SciPy",
  torch: "PyTorch",
  tensorflow: "TensorFlow",
  "scikit-learn": "scikit-learn",
  jax: "JAX",
  pytest: "pytest",
  sqlalchemy: "SQLAlchemy",
  pydantic: "Pydantic",
  celery: "Celery",
  transformers: "Transformers",
  matplotlib: "Matplotlib",
  "github.com/gin-gonic/gin": "Gin",
  "github.com/spf13/cobra": "Cobra",
  "google.golang.org/grpc": "gRPC",
  "k8s.io/client-go": "Kubernetes client",
  "github.com/labstack/echo": "Echo",
  "github.com/gofiber/fiber": "Fiber",
  tokio: "Tokio",
  serde: "Serde",
  "actix-web": "Actix",
  axum: "Axum",
  clap: "clap",
  bevy: "Bevy",
  wasm_bindgen: "wasm-bindgen",
  "wasm-bindgen": "wasm-bindgen",
  "org.springframework.boot": "Spring Boot",
  "org.springframework": "Spring",
  "org.jetbrains.kotlin": "Kotlin",
  "com.android.tools.build": "Android",
  "org.apache.spark": "Apache Spark",
  "io.quarkus": "Quarkus",
  junit: "JUnit",
  rails: "Rails",
  sinatra: "Sinatra",
  rspec: "RSpec",
  jekyll: "Jekyll",
  "laravel/framework": "Laravel",
  "symfony/symfony": "Symfony",
  "symfony/framework-bundle": "Symfony",
  flutter: "Flutter",
};

function safeJson(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function keysOf(value: unknown): string[] {
  return value && typeof value === "object" ? Object.keys(value) : [];
}

/** Dependency names declared in each manifest, as written. */
export function dependencyNames(files: ManifestFiles): string[] {
  const names: string[] = [];

  const pkg = files.packageJson ? safeJson(files.packageJson) : null;
  if (pkg) {
    names.push(
      ...keysOf(pkg.dependencies),
      ...keysOf(pkg.devDependencies),
      ...keysOf(pkg.peerDependencies),
    );
  }
  const composer = files.composer ? safeJson(files.composer) : null;
  if (composer) names.push(...keysOf(composer.require), ...keysOf(composer["require-dev"]));

  const lineNames = (text: string | null | undefined, pattern: RegExp) => {
    if (!text) return;
    for (const match of text.matchAll(pattern)) names.push(match[1]);
  };
  lineNames(files.requirements, /^\s*([A-Za-z0-9][A-Za-z0-9._-]*)/gm);
  // pyproject: quoted requirement strings and poetry-style "name = " keys.
  lineNames(files.pyproject, /["']([A-Za-z0-9][A-Za-z0-9._-]*)\s*(?:[<>=!~\[;]|["'])/g);
  lineNames(files.pyproject, /^\s*([A-Za-z0-9][A-Za-z0-9._-]*)\s*=\s*(?:["'{])/gm);
  lineNames(files.goMod, /^\s*(?:require\s+)?([a-z0-9.-]+\.[a-z]+\/[^\s]+)\s+v/gm);
  lineNames(files.cargo, /^\s*([A-Za-z0-9_-]+)\s*=\s*(?:["{])/gm);
  lineNames(files.cargo, /^\s*\[(?:dev-|build-)?dependencies\.([A-Za-z0-9_-]+)\]/gm);
  lineNames(files.pom, /<groupId>\s*([^<\s]+)\s*<\/groupId>/g);
  lineNames(files.gradle, /["']([A-Za-z0-9_.-]+):[A-Za-z0-9_.-]+(?::[^"']*)?["']/g);
  lineNames(files.gradle, /id\s*\(?\s*["']([A-Za-z0-9_.-]+)["']/g);
  lineNames(files.gemfile, /^\s*gem\s+["']([^"']+)["']/gm);

  return names;
}

export function detectFrameworks(files: ManifestFiles): string[] {
  const found = new Set<string>();
  for (const raw of dependencyNames(files)) {
    const name = raw.toLowerCase();
    const direct = KNOWN[name];
    if (direct) {
      found.add(direct);
      continue;
    }
    for (const [key, label] of Object.entries(KNOWN)) {
      if (key.includes(".") || key.includes("/")) {
        if (name === key || name.startsWith(`${key}.`) || name.startsWith(`${key}/`)) found.add(label);
      }
    }
  }
  return [...found].sort((a, b) => a.localeCompare(b));
}

export type ChannelKind =
  | "discord"
  | "slack"
  | "zulip"
  | "matrix"
  | "mailing-list"
  | "gitter"
  | "irc"
  | "forum";

const CHANNELS: [ChannelKind, RegExp][] = [
  ["discord", /https?:\/\/(?:www\.)?(?:discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[A-Za-z0-9-]+/i],
  ["slack", /https?:\/\/[A-Za-z0-9.-]*slack\.com\/[^\s)"'<>\]]*|https?:\/\/[^\s)"'<>\]]*slack[^\s)"'<>\]]*invite[^\s)"'<>\]]*/i],
  ["zulip", /https?:\/\/[A-Za-z0-9.-]*zulip(?:chat)?\.(?:com|org)[^\s)"'<>\]]*/i],
  ["matrix", /https?:\/\/matrix\.to\/#\/[^\s)"'<>\]]+/i],
  ["gitter", /https?:\/\/(?:app\.)?gitter\.im\/[^\s)"'<>\]]+/i],
  ["mailing-list", /https?:\/\/(?:groups\.google\.com|lists\.[A-Za-z0-9.-]+|[A-Za-z0-9.-]+\/mailman)[^\s)"'<>\]]*/i],
  ["irc", /https?:\/\/(?:web\.)?libera\.chat\/[^\s)"'<>\]]*|ircs?:\/\/[^\s)"'<>\]]+/i],
  ["forum", /https?:\/\/(?:discuss|discourse|forum|community)\.[A-Za-z0-9.-]+[^\s)"'<>\]]*/i],
];

/** The first link of each kind found in the given documents, in document order. */
export function detectChannels(...documents: (string | null | undefined)[]): { kind: ChannelKind; url: string }[] {
  const text = documents.filter(Boolean).join("\n");
  const channels: { kind: ChannelKind; url: string }[] = [];
  for (const [kind, pattern] of CHANNELS) {
    const match = pattern.exec(text);
    if (match) channels.push({ kind, url: match[0].replace(/[.,;:]+$/, "") });
  }
  return channels;
}

/** Whether contributors must sign a licence agreement or sign off their commits. */
export function detectSignOff(input: {
  documents: (string | null | undefined)[];
  hasDcoConfig: boolean;
  botLogins: readonly string[];
}): "cla" | "dco" | "none" | "unknown" {
  const text = input.documents.filter(Boolean).join("\n");
  const bots = input.botLogins.map((login) => login.toLowerCase());
  if (bots.some((login) => /(?:^|[-_])cla(?:[-_]|assistant|bot|$)|easycla|claassistant/.test(login))) {
    return "cla";
  }
  if (/contributor licen[sc]e agreement|\bsign (?:the|our|a) cla\b|\bCLA\b/.test(text)) return "cla";
  if (input.hasDcoConfig || bots.some((login) => login === "dco" || login.startsWith("dco["))) return "dco";
  if (/developer certificate of origin|\bDCO\b|signed-off-by|git commit (?:-s\b|--signoff)/i.test(text)) {
    return "dco";
  }
  return text.length > 0 ? "none" : "unknown";
}
