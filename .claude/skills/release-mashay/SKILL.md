---
name: release-mashay
description: Runs the mashay release and publish pipeline — verifies the tree is clean and green, bumps the version from conventional commits since the last tag, updates CHANGELOG.md, tags the commit, pushes to origin, and publishes @draekien/mashay to the public npm registry. Use when the user says "release mashay", "cut a release", "publish mashay", "ship a new version", or asks to run the release/publish pipeline.
argument-hint: "[--dry-run]"
---

# Release mashay

This pipeline's last two steps push a tag to the shared `origin` remote and publish a new version of `@draekien/mashay` to the public npm registry other projects install from. Both are irreversible — a pushed tag is shared history, and a published version can't be silently replaced. Treat every irreversible step from `git push` onward as needing explicit confirmation, even if the version bump and changelog step ran without asking.

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
2. **Review the result**: check the new version number and the generated `CHANGELOG.md` entry are what you expect. This is the last point where undoing anything is cheap (`git reset` locally) — past this point it isn't.
3. **Confirm, then push**: `git push --follow-tags origin main`. This is the first irreversible step — it publishes the release commit and tag to the shared remote. Confirm with the user before running it, even if they asked for the release.
4. **Confirm, then publish**: `pnpm publish`. This runs `prepublishOnly` (`pnpm build`) automatically, then uploads the package to the public npm registry. The package is scoped (`@draekien/mashay`); `publishConfig.access: "public"` in `package.json` makes the scoped publish public, so no `--access public` flag is needed. This is irreversible for the same reason as the push — confirm before running it. Only `dist`, `templates`, and `themes` are published (`files` in `package.json`); `prepublishOnly` regenerates `dist/` from source, so a stale local build is not a concern.

## Gotchas

- Never hand-edit `package.json`'s version or `CHANGELOG.md` — `commit-and-tag-version` owns both, and manual edits fight it on the next release (wrong diff base, duplicated entries).
- Registry auth is machine-level, not project-specific (the repo has no `.npmrc` — publishing uses the public npm registry and whatever `npm login` credentials the machine has). If `pnpm publish` fails on auth, that's an environment/login problem to hand back to the user — not something to retry blindly or work around.
- If step 3 (push) succeeds but step 4 (publish) fails: do not re-run `pnpm run release` — the version bump, changelog, commit, and tag are already pushed. Fix whatever broke publish (build error, auth, registry outage) and re-run `pnpm publish` alone.
- If `pnpm run release` is re-run after a failed push with no other changes, it will try to bump again from the now-existing tag — check `git tag --list` and `git log -1` before assuming step 1 needs to run again.
