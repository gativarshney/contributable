/** Who wrote something, reduced to the three classes every metric is split by. */
export type AuthorClass = "core" | "outside" | "bot";

export interface Actor {
  login: string | null;
  /** GraphQL `__typename` of the actor: "User", "Bot", "Mannequin", "Organization". */
  typename?: string | null;
  /** GraphQL `authorAssociation` on the item the actor wrote. */
  association?: string | null;
}

/**
 * Automation that runs under an ordinary user account, so GitHub does not mark it as
 * a bot. Lower case. Additions need evidence: an account that comments on nearly every
 * pull request within seconds.
 */
export const AUTOMATION_ACCOUNTS: ReadonlySet<string> = new Set([
  "k8s-ci-robot",
  "k8s-triage-robot",
  "k8s-github-robot",
  "k8s-infra-cherrypick-robot",
  "openshift-ci-robot",
  "openshift-merge-robot",
  "openshift-bot",
  "openshift-cherrypick-robot",
  "istio-testing",
  "knative-prow-robot",
  "kubevirt-bot",
  "ti-chi-bot",
  "llvmbot",
  "pytorchbot",
  "pytorchmergebot",
  "facebook-github-bot",
  "googlebot",
  "google-cla",
  "rust-highfive",
  "rustbot",
  "rust-timer",
  "bors",
  "bors-servo",
  "rust-log-analyzer",
  "codecov-io",
  "codecov-commenter",
  "coveralls",
  "sonarcloud",
  "netlify",
  "vercel",
  "cla-assistant",
  "claassistant",
  "linux-foundation-easycla",
  "easycla",
  "allcontributors",
  "stale",
  "mergify",
  "dependabot",
  "renovate-bot",
  "greenkeeperio-bot",
  "snyk-bot",
  "imgbot",
  "azure-pipelines",
  "appveyor",
  "travis-ci",
  "circleci",
  "nodejs-github-bot",
  "elasticmachine",
  "kibanamachine",
  "cockroach-teamcity",
  "blathers-crl",
  "tensorflow-jenkins",
  "tensorflowbutler",
  "gitlab-bot",
  "microsoft-github-policy-service",
  "msftbot",
  "ansibot",
  "ansibullbot",
  "homeassistant",
  "home-assistant",
  "flutter-dashboard",
  "fluttergithubbot",
  "gopherbot",
  "ofek-bot",
  "apache-mynewt-bot",
  "asfgit",
  "hadoop-yetus",
  "apachespark",
  "sparkqa",
  "amplabjenkins",
  "asf-ci",
  "jenkins",
  "ci-jenkins",
  "codacy-bot",
  "deepsource-autofix",
  "lgtm-com",
  "pep8speaks",
  "github-actions",
]);

export function isBot(actor: Actor): boolean {
  if (actor.typename === "Bot") return true;
  const login = actor.login?.toLowerCase();
  if (!login) return false;
  if (login.endsWith("[bot]") || login.endsWith("-bot") || login.endsWith("_bot"))
    return true;
  // "flinkbot", "llvmbot", "k8s-ci-robot": project bots that are ordinary user accounts.
  // The length floor keeps short surnames such as "abbot" out.
  if (login.length >= 7 && login.endsWith("bot")) return true;
  return AUTOMATION_ACCOUNTS.has(login);
}

const CORE_ASSOCIATIONS = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);

export function classify(actor: Actor): AuthorClass {
  if (isBot(actor)) return "bot";
  return CORE_ASSOCIATIONS.has(actor.association ?? "") ? "core" : "outside";
}

/**
 * Whether a reply counts as a human response to `author`: written by someone else who
 * is not a bot. A deleted account (null login) still counts as a person.
 */
export function isHumanResponse(replier: Actor, author: string | null): boolean {
  if (isBot(replier)) return false;
  if (replier.login && author && replier.login.toLowerCase() === author.toLowerCase()) {
    return false;
  }
  return true;
}
