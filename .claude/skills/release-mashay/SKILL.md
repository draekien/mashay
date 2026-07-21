---
name: release-mashay
description: Runs the mashay release pipeline — verifies the tree is clean and green, bumps the version from conventional commits since the last tag, updates CHANGELOG.md, tags the commit, and pushes to origin, where CI publishes @draekien/mashay to npm via trusted publishing and cuts a GitHub release. Use when the user says "release mashay", "cut a release", "publish mashay", "ship a new version", or asks to run the release/publish pipeline.
argument-hint: "[--dry-run]"
---

# Release mashay

This pipeline's irreversible boundary is a single step: `git push --follow-tags`. It publishes the release commit and tag to the shared `origin` remote **and** triggers `.github/workflows/publish.yml`, which publishes `@draekien/mashay` to the public npm registry (via OIDC trusted publishing) and cuts a GitHub release. A pushed tag is shared history and a published version can't be silently replaced, so treat the push as needing explicit confirmation, even if the version-bump and changelog step ran without asking. Publishing is CI-owned — never run `pnpm publish` or `npm publish` locally, that double-publishes.

If the user invoked this skill asking only for a `--dry-run` preview, run just the dry-run in step 1, show the output, and stop — do not proceed to steps 2–4.

## Preflight

Before bumping anything, confirm the release will be built from what's actually intended. If any check fails, stop and report it to the user rather than trying to fix it as part of the release:

- `git status` — the working tree must be clean. `commit-and-tag-version` commits the version bump and changelog itself; uncommitted changes lying around get swept into that commit or block it outright. If it isn't clean, stop and ask whether to commit, stash, or abort.
- Confirm the current branch is `main`, then `git fetch origin && git log origin/main..HEAD --oneline` — a release should ship only reviewed, already-merged work, so this should be empty. If it isn't, confirm with the user that those commits are intended before continuing.
- `pnpm lint && pnpm test` — both must pass. If either fails, stop and report the failure — a release built on red is worse than not releasing, and fixing lint/test issues is a separate task from cutting a release.
- `git log <last-tag>..HEAD --oneline` — read the commits since the last tag. If this is empty, tell the user there's nothing new to release and stop. Otherwise, `commit-and-tag-version` infers the version bump (major/minor/patch) purely from conventional-commit types in these messages, so this is the only way to catch a bump about to be wrong — a `feat:` that should have been `fix:`, or a breaking change without a `BREAKING CHANGE:` footer. If the intended bump looks ambiguous or wrong, say so before continuing rather than letting the tool decide silently.

## Pipeline

Run in order — this sequence is fragile and each step assumes the last one succeeded:

1. **Bump and changelog**: `pnpm run release`. This runs `commit-and-tag-version`, which bumps `package.json`, writes `CHANGELOG.md`, and creates a commit + tag locally — nothing leaves the machine yet. To preview the bump and changelog without committing (useful when the preflight commit log looked ambiguous), run `pnpm run release -- --dry-run` first and read its output before deciding whether to proceed for real.
2. **Review the result**: check the new version number and the generated `CHANGELOG.md` entry are what you expect. This is the last point where undoing anything is cheap (`git reset` locally, `git tag -d`) — past this point it isn't.
3. **Confirm, then push**: `git push --follow-tags origin main`. This is the irreversible step — it publishes the release commit and tag to the shared remote and, by pushing the `v*` tag, triggers `.github/workflows/publish.yml` to publish to npm and create the GitHub release. Confirm with the user before running it, even if they asked for the release. There is no separate publish command to run — the tag push is the publish.
4. **Watch the release workflow**: the tag push fires `.github/workflows/publish.yml`. Watch it to confirm the npm publish and GitHub release both landed — `gh run watch` (or the repo's Actions tab). The GitHub-release step is gated on the npm publish succeeding, so a green run means both are done; a red run means the publish failed and no release was created — see the gotchas.

## Gotchas

- Never hand-edit `package.json`'s version or `CHANGELOG.md` — `commit-and-tag-version` owns both, and manual edits fight it on the next release (wrong diff base, duplicated entries).
- Publishing is CI-owned via OIDC trusted publishing — there is no npm token and nothing to `npm login`. It depends on the Trusted Publisher config on npmjs.com (package `@draekien/mashay`, repo `draekien/mashay`, workflow `publish.yml`). If the workflow fails at the publish step with an auth/OIDC/permission error, that's an npm-settings problem to hand back to the user — do not work around it by publishing locally.
- If the push succeeds but the workflow's publish step fails: the commit and tag are already on origin — do not re-run `pnpm run release` (it would try to bump again from the now-existing tag). Fix the cause (workflow or trusted-publisher config, a transient registry error) and re-run the failed workflow run itself (`gh run rerun <id>` or the Actions tab); the tag already exists, so nothing re-triggers on its own.
- If the push itself failed and `pnpm run release` is re-run with no other changes, it will try to bump again from the now-existing local tag — check `git tag --list` and `git log -1` before assuming step 1 needs to run again.
