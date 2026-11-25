#!/usr/bin/env bash
# Usage: ./new-proposal.sh clientname
# Creates a dated proposal folder with skeleton files.

set -e

if [ -z "$1" ]; then
  echo "Usage: ./new-proposal.sh clientname"
  exit 1
fi

SLUG=$(echo "$1" | tr '[:upper:] ' '[:lower:]-')
DIR="$(date +%Y-%m-%d)_${SLUG}"

if [ -d "$DIR" ]; then
  echo "Folder $DIR already exists."
  exit 1
fi

mkdir -p "$DIR/assets"

cat > "$DIR/job-post.md" << 'EOF'
# Job Post

(Paste the raw Upwork job post here, including any screening questions.)
EOF

touch "$DIR/briefing.md" "$DIR/proposal.md"

echo "Created $DIR"
echo "Next: paste the job post into $DIR/job-post.md, then 'cd $DIR' and start Claude Code."
