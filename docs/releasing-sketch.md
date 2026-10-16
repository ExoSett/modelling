# Releasing Sketch with the website

Sketch source lives in modelling; its production shell and packaging live in
website. Both repositories form the release boundary. The October 2026 missing
chunk incident passed development-server tests because packaging was untested.

## Required sequence

1. Run Sketch's `npm run check` and `npm run test:e2e` on the target changes.
2. Run `npm run build:embed`. Publish the complete dist-embed directory,
   including shared chunks, lazy chunks and nested assets.
3. In website run `python3 scripts/test_build_site.py`, assemble `_site` with
   `scripts/build_site.py`, and run the website checks required by its README,
   including `npm run check:built` locally. Fix generated defects in source.
4. From modelling/sketch run `npm run test:release`. By default this serves
   ../../website/_site; SKETCH_SITE_ROOT can select another assembled directory.
   This checks the real /design/sketch/ path on desktop and mobile, startup,
   initialized controls, changing rendered output, module movement, downloads,
   seasonal imports, uncaught errors and failed first-party requests.
   Inspect the saved screenshots when changing appearance or camera behavior.
5. Deploy the same tested directory without rebuilding. Record both repository
   commit SHAs with the artifact. Retain the last successful artifact and its
   SHAs for rollback; redeploy that artifact if a release fails.
6. The user already checks production after deployment. Record that outcome;
   do not substitute it for the assembled-site gate or duplicate the monitoring.

## Pull requests and evidence

Run integration checks on website pull requests as well as main. For modelling
changes, validate the candidate modelling SHA against the website shell before
merge or release; the website workflow's modelling_ref input selects a candidate.
A green modelling-only build is not evidence of successful website integration.
Configure repository branch rules to require the integration build check; workflow
files alone cannot enforce merge protection. Verify that setting in GitHub before
claiming it is enabled.

Store the two resolved SHAs and build run with each artifact. Retain browser
reports, screenshots and traces on failure. Do not mask failures with retries or
weaken assertions to make CI green. Keep fixtures and output paths portable.

Release reports must distinguish development tests, assembled-site browser tests,
static/conformance validation and live checks. List incomplete checks explicitly.
A downloaded PNG or existing canvas alone does not prove a model rendered;
combine initialized state, changing canvas output and screenshot review.

## Adopting this gate

Publish the modelling changes providing `npm run test:release` before the website
workflow starts using them, or select that modelling commit with modelling_ref.
Website PR builds resolve modelling main by default; they do not automatically
test an unmerged modelling branch. Validate that combination locally or with the
explicit workflow input. GitHub branch rules and the first hosted workflow run
remain separate checks: local success does not confirm either is configured.
