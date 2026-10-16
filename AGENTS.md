# Working agreement

For Sketch or website integration changes, follow docs/releasing-sketch.md.
Development-server tests do not verify the published website. Before claiming
release readiness, build the embedded bundle, assemble the website, and run
release browser tests against that exact static output at /design/sketch/.
Report precisely which checks passed, failed or were not run, and whether a
change is local, committed or deployed. Do not describe a local fix as live.
Use portable test output paths. Preserve screenshots, traces and request errors
for failures. Add regression coverage at the layer where a defect escaped.
The user already performs production smoke checks; these supplement, rather
than replace, pre-deployment checks. Do not create duplicate monitoring.
