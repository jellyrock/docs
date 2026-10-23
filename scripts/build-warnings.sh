#!/usr/bin/env bash
# Run a build and fail if it prints a warning that isn't in build-warnings-allowed.txt.
#
#   scripts/build-warnings.sh [--report-only] -- <build command...>
#
# A warning means something renders wrong while the build still passes: an unknown
# code-fence language, for one, left every BrightScript block unhighlighted. CI fails on
# one (npm run build:strict). Deploys pass --report-only: they list the warnings but still
# ship, so one upstream typo can't hold back every upstream docs edit.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
allowed_file="$here/build-warnings-allowed.txt"

report_only=false
if [[ "${1:-}" == "--report-only" ]]; then
	report_only=true
	shift
fi
[[ "${1:-}" == "--" ]] && shift
if [[ $# -eq 0 ]]; then
	echo "usage: $0 [--report-only] -- <build command...>" >&2
	exit 2
fi

log="$(mktemp)"
patterns="$(mktemp)"
trap 'rm -f "$log" "$patterns"' EXIT

"$@" 2>&1 | tee "$log"

# Astro sometimes prints a warning mid-line (after a page path), so match from the tag on.
# Comments and blank lines are dropped first: an empty pattern would allow everything.
grep -vE '^[[:space:]]*(#|$)' "$allowed_file" >"$patterns" || true
mapfile -t unexpected < <(grep -o '\[WARN\].*' "$log" | grep -vF -f "$patterns" | sort -u || true)

if [[ ${#unexpected[@]} -eq 0 ]]; then
	echo "Build warnings: none beyond the allowed list."
	exit 0
fi

level=error
$report_only && level=warning
echo
echo "Build warnings not in scripts/build-warnings-allowed.txt (${#unexpected[@]}):"
for w in "${unexpected[@]}"; do
	if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
		echo "::${level} title=Build warning::${w//%/%25}"
	else
		echo "  $w"
	fi
done
cat <<'EOF'

If this change didn't cause it, it likely comes from the upstream docs
(jellyrock/jellyrock main, fetched at build time) or a dependency bump.
Fix the cause, or, if it's harmless, add its text to
scripts/build-warnings-allowed.txt with a comment saying why.
EOF

$report_only && exit 0
exit 1
