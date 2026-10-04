/** GraphQL documents. Page sizes are chosen so one page costs about one point. */

const ACTOR = "__typename login";

export const PULLS_PAGE = 40;
export const ISSUES_PAGE = 50;
export const REPLIES_PER_ITEM = 25;

/** Files read to detect the stack, setup and contribution rules. Alias to expression. */
export const FILE_PROBES: Record<string, string> = {
  packageJson: "HEAD:package.json",
  pyproject: "HEAD:pyproject.toml",
  requirements: "HEAD:requirements.txt",
  goMod: "HEAD:go.mod",
  cargo: "HEAD:Cargo.toml",
  pom: "HEAD:pom.xml",
  gradle: "HEAD:build.gradle",
  gradleKts: "HEAD:build.gradle.kts",
  gemfile: "HEAD:Gemfile",
  composer: "HEAD:composer.json",
  readme: "HEAD:README.md",
  readmeRst: "HEAD:README.rst",
  contributing: "HEAD:CONTRIBUTING.md",
  contributingGithub: "HEAD:.github/CONTRIBUTING.md",
  contributingDocs: "HEAD:docs/CONTRIBUTING.md",
  contributingRst: "HEAD:CONTRIBUTING.rst",
  devcontainer: "HEAD:.devcontainer",
  devcontainerJson: "HEAD:.devcontainer.json",
  issueTemplateDir: "HEAD:.github/ISSUE_TEMPLATE",
  dco: "HEAD:.github/dco.yml",
};

const BLOB_KEYS = new Set([
  "packageJson",
  "pyproject",
  "requirements",
  "goMod",
  "cargo",
  "pom",
  "gradle",
  "gradleKts",
  "gemfile",
  "composer",
  "readme",
  "readmeRst",
  "contributing",
  "contributingGithub",
  "contributingDocs",
  "contributingRst",
]);

const probes = Object.entries(FILE_PROBES)
  .map(([alias, expression]) =>
    BLOB_KEYS.has(alias)
      ? `${alias}: object(expression: "${expression}") { ... on Blob { text isTruncated byteSize } }`
      : `${alias}: object(expression: "${expression}") { __typename }`,
  )
  .join("\n    ");

export const REPO_FACTS = `
query RepoFacts($owner: String!, $name: String!, $since90: GitTimestamp!) {
  repository(owner: $owner, name: $name) {
    nameWithOwner
    description
    stargazerCount
    forkCount
    isArchived
    isFork
    isPrivate
    createdAt
    pushedAt
    licenseInfo { spdxId }
    codeOfConduct { key }
    repositoryTopics(first: 20) { nodes { topic { name } } }
    languages(first: 12, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } }
    labels(first: 100, orderBy: { field: NAME, direction: ASC }) { nodes { name } }
    defaultBranchRef {
      name
      target { ... on Commit { history(since: $since90) { totalCount } } }
    }
    releases(first: 30, orderBy: { field: CREATED_AT, direction: DESC }) {
      nodes { publishedAt isPrerelease isDraft }
    }
    ${probes}
  }
}`;

const REPLIES = `
      comments(first: ${REPLIES_PER_ITEM}) {
        totalCount
        nodes { createdAt bodyText authorAssociation author { ${ACTOR} } }
      }`;

export const PULLS = `
query Pulls($owner: String!, $name: String!, $cursor: String, $first: Int = ${PULLS_PAGE}) {
  repository(owner: $owner, name: $name) {
    pullRequests(first: $first, after: $cursor, orderBy: { field: UPDATED_AT, direction: DESC }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number
        createdAt
        closedAt
        mergedAt
        updatedAt
        authorAssociation
        author { ${ACTOR} }
        mergedBy { ${ACTOR} }
        ${REPLIES}
        reviews(first: ${REPLIES_PER_ITEM}) {
          nodes { submittedAt authorAssociation author { ${ACTOR} } }
        }
      }
    }
  }
}`;

export const ISSUES = `
query Issues($owner: String!, $name: String!, $cursor: String, $since: DateTime, $first: Int = ${ISSUES_PAGE}) {
  repository(owner: $owner, name: $name) {
    issues(first: $first, after: $cursor, orderBy: { field: UPDATED_AT, direction: DESC }, filterBy: { since: $since }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number
        title
        createdAt
        closedAt
        updatedAt
        authorAssociation
        author { ${ACTOR} }
        labels(first: 12) { nodes { name } }
        assignees { totalCount }
        ${REPLIES}
      }
    }
  }
}`;

/** Open starter-labelled issues, with what is needed to tell whether one is taken. */
export const STARTER_ISSUES = `
query StarterIssues($owner: String!, $name: String!, $labels: [String!], $cursor: String) {
  repository(owner: $owner, name: $name) {
    issues(first: 25, after: $cursor, states: OPEN, labels: $labels, orderBy: { field: UPDATED_AT, direction: DESC }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number
        title
        createdAt
        closedAt
        updatedAt
        authorAssociation
        author { ${ACTOR} }
        labels(first: 12) { nodes { name } }
        assignees { totalCount }
        comments(last: 15) {
          totalCount
          nodes { createdAt bodyText authorAssociation author { ${ACTOR} } }
        }
        timelineItems(last: 15, itemTypes: [CROSS_REFERENCED_EVENT, CONNECTED_EVENT, DISCONNECTED_EVENT]) {
          nodes {
            __typename
            ... on CrossReferencedEvent { willCloseTarget source { __typename ... on PullRequest { number state } } }
            ... on ConnectedEvent { subject { __typename ... on PullRequest { number state } } }
            ... on DisconnectedEvent { subject { __typename ... on PullRequest { number state } } }
          }
        }
      }
    }
  }
}`;
