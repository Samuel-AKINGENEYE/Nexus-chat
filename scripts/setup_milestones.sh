#!/bin/bash
# Setup milestones for Nexus using GitHub API

REPO="Samuel-AKINGENEYE/Nexus-chat"
OWNER="Samuel-AKINGENEYE"
REPO_NAME="Nexus-chat"

echo "Setting up milestones via GitHub API..."

# Create milestones using GitHub API
create_milestone() {
    local title="$1"
    local description="$2"
    local due_date="$3"
    
    curl -X POST \
      -H "Authorization: token $(gh auth token)" \
      -H "Accept: application/vnd.github.v3+json" \
      https://api.github.com/repos/$OWNER/$REPO_NAME/milestones \
      -d "{\"title\":\"$title\",\"description\":\"$description\",\"due_on\":\"$due_date\"}"
    
    echo "✓ Created milestone: $title"
}

# Create Phase 1 milestone
create_milestone \
  "Phase 1: Foundation" \
  "Weeks 1-6: Auth, profiles, communities" \
  "2026-07-05T00:00:00Z"

# Create Phase 2 milestone
create_milestone \
  "Phase 2: Core Features" \
  "Weeks 7-14: Posts, feed, comments, DMs" \
  "2026-08-30T00:00:00Z"

# Create Phase 3 milestone
create_milestone \
  "Phase 3: Community Tools" \
  "Weeks 15-20: Notifications, moderation" \
  "2026-10-11T00:00:00Z"

# Create Phase 4 milestone
create_milestone \
  "Phase 4: Polish & Launch" \
  "Weeks 21-27: Performance, mobile, launch" \
  "2026-11-29T00:00:00Z"

echo "✅ All milestones created successfully!"
