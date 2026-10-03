#!/bin/sh
# Vercel ignored build step: exit 0 skips the build, exit 1 builds.
# A push that touches only tests, docs, the pipeline or workflows does not redeploy.
# Redeploys of the same commit (deploy hook, manual) always build.

if [ -z "$VERCEL_GIT_PREVIOUS_SHA" ] || [ "$VERCEL_GIT_PREVIOUS_SHA" = "$VERCEL_GIT_COMMIT_SHA" ]; then
  exit 1
fi

git diff --quiet "$VERCEL_GIT_PREVIOUS_SHA" "$VERCEL_GIT_COMMIT_SHA" -- \
  src public universe package.json package-lock.json next.config.ts postcss.config.mjs \
  tsconfig.json vercel.json scripts/vercel-ignore.sh \
  ':(exclude)src/**/*.test.ts' ':(exclude)src/**/fixtures/**'
status=$?

# 0: nothing relevant changed. 1: changes. Anything else (missing history): build.
[ "$status" -eq 0 ] && exit 0
exit 1
