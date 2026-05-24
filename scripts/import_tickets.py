#!/usr/bin/env python3
"""
Import all Nexus tickets as GitHub Issues
Run: python3 scripts/import_tickets.py
"""

import subprocess
import sys
import time

REPO = "Samuel-AKINGENEYE/Nexus-chat"

# Complete ticket data (52 tickets)
TICKETS = [
    # Phase 1: Foundation (EP-01 to EP-03)
    ("NX-001", "EP-01", "Set up project monorepo and CI/CD pipeline (GitHub Actions)", "critical", "infra,devops", 5),
    ("NX-002", "EP-01", "Database schema design and initial migrations (PostgreSQL)", "critical", "backend,db", 8),
    ("NX-003", "EP-01", "Email/password registration with email verification flow", "critical", "backend,auth", 5),
    ("NX-004", "EP-01", "OAuth 2.0 login — Google and Apple providers", "high", "backend,auth", 5),
    ("NX-005", "EP-01", "JWT access + refresh token issuance and rotation", "critical", "backend,auth", 3),
    ("NX-006", "EP-01", "Password reset flow (email link, 1-hour expiry)", "high", "backend,auth", 3),
    ("NX-007", "EP-01", "Login, register, and forgot-password screens (web)", "high", "frontend,auth", 5),
    ("NX-008", "EP-01", "Rate limiting middleware for auth endpoints", "high", "backend,security", 2),
    ("NX-009", "EP-02", "User profile CRUD API (display name, bio, avatar)", "high", "backend", 5),
    ("NX-010", "EP-02", "Profile page — public view with karma and stats", "high", "frontend", 5),
    ("NX-011", "EP-02", "Avatar and banner image upload (S3 + CDN)", "medium", "backend,media", 5),
    ("NX-012", "EP-02", "Privacy settings — DM permissions per user", "medium", "backend,frontend", 3),
    ("NX-013", "EP-02", "Account deletion with 30-day grace period", "medium", "backend", 3),
    ("NX-014", "EP-03", "Space creation API — name, slug, description, visibility", "critical", "backend", 8),
    ("NX-015", "EP-03", "Space membership API — join, leave, role assignment", "critical", "backend", 5),
    ("NX-016", "EP-03", "Space settings and rules management", "high", "backend,frontend", 5),
    ("NX-017", "EP-03", "Space discovery page — browse by category and trending", "high", "frontend", 5),
    ("NX-018", "EP-03", "Space search (name, description, tags)", "medium", "frontend,search", 3),
    ("NX-019", "EP-03", "Moderator role management UI", "medium", "frontend", 5),
    
    # Phase 2: Core Features (EP-04 to EP-07)
    ("NX-020", "EP-04", "Post creation API — text, image, link, poll types", "critical", "backend", 8),
    ("NX-021", "EP-04", "Rich text editor (Slate.js) for text posts", "high", "frontend", 8),
    ("NX-022", "EP-04", "Image post — multi-image upload (up to 4, 20MB each)", "high", "frontend,media", 5),
    ("NX-023", "EP-04", "Link post — URL metadata scraping and preview card", "medium", "backend,frontend", 5),
    ("NX-024", "EP-04", "Poll post — voting logic and real-time result display", "medium", "backend,frontend", 5),
    ("NX-025", "EP-04", "Post edit (15-min window) with edit history stored", "medium", "backend,frontend", 3),
    ("NX-026", "EP-04", "Soft delete — post content replaced with [deleted]", "medium", "backend", 2),
    ("NX-027", "EP-04", "Post report flow with reason categories", "high", "backend,frontend", 3),
    ("NX-028", "EP-05", "Upvote / downvote API with karma calculation", "critical", "backend", 5),
    ("NX-029", "EP-05", "Home feed aggregation — Hot, New, Top, Rising sorts", "critical", "backend", 8),
    ("NX-030", "EP-05", "Wilson score algorithm for Hot sort", "high", "backend", 3),
    ("NX-031", "EP-05", "Infinite scroll feed with skeleton loading states", "high", "frontend", 5),
    ("NX-032", "EP-05", "Save post to personal collection", "medium", "backend,frontend", 3),
    ("NX-033", "EP-05", "Emoji reactions on posts and comments (picker + count)", "medium", "backend,frontend", 5),
    ("NX-034", "EP-06", "Threaded comment API — 6 levels deep with sorting", "critical", "backend", 8),
    ("NX-035", "EP-06", "Comment composer with rich text support", "high", "frontend", 5),
    ("NX-036", "EP-06", "Comment collapse, expand, and permalink", "medium", "frontend", 3),
    ("NX-037", "EP-06", "@username mention with notification trigger", "high", "backend,frontend", 5),
    ("NX-038", "EP-06", "Comment edit (15-min window) and history", "medium", "backend,frontend", 3),
    ("NX-039", "EP-07", "WebSocket server setup (Socket.io + Redis Pub/Sub)", "critical", "backend,infra", 8),
    ("NX-040", "EP-07", "1-on-1 DM — message send, deliver, read status", "critical", "backend,frontend", 8),
    ("NX-041", "EP-07", "Group DM — up to 10 participants, group name + avatar", "high", "backend,frontend", 8),
    ("NX-042", "EP-07", "Typing indicators and online/offline presence", "medium", "backend,frontend", 5),
    ("NX-043", "EP-07", "Media attachments in DMs (images/files, max 25MB)", "medium", "backend,frontend", 5),
    ("NX-044", "EP-07", "Reply-to-message with quote preview", "medium", "frontend", 3),
    ("NX-045", "EP-07", "Message search within a conversation", "low", "frontend", 3),
    
    # Phase 3: Community Tools (EP-08 to EP-09)
    ("NX-046", "EP-08", "Notification service — event subscription and fanout", "critical", "backend", 8),
    ("NX-047", "EP-08", "Push notifications — FCM (Android) and APNs (iOS)", "high", "backend", 5),
    ("NX-048", "EP-08", "In-app notification bell and activity feed", "high", "frontend", 5),
    ("NX-049", "EP-08", "Notification preference settings per trigger type", "medium", "backend,frontend", 3),
    ("NX-050", "EP-09", "Moderator dashboard — report queue and action log", "high", "frontend", 8),
    ("NX-051", "EP-09", "Automod rules engine (keyword block, link domain filter)", "high", "backend", 5),
    ("NX-052", "EP-09", "User block and mute — hide content + stop DMs", "high", "backend,frontend", 3),
]

def get_milestone_title(epic):
    phase_map = {
        "EP-01": "Phase 1: Foundation", "EP-02": "Phase 1: Foundation", "EP-03": "Phase 1: Foundation",
        "EP-04": "Phase 2: Core Features", "EP-05": "Phase 2: Core Features",
        "EP-06": "Phase 2: Core Features", "EP-07": "Phase 2: Core Features",
        "EP-08": "Phase 3: Community Tools", "EP-09": "Phase 3: Community Tools",
    }
    return phase_map.get(epic, "Phase 4: Polish & Launch")

def create_issue(ticket_id, epic, title, priority, labels, points):
    """Create issue via GitHub CLI"""
    
    milestone = get_milestone_title(epic)
    
    # Build labels array
    label_list = [f"priority:{priority}", f"epic:{epic}"]
    # Add type labels
    for label in labels.split(','):
        label_list.append(f"type:{label.strip()}")
    
    labels_str = ",".join(label_list)
    
    body = f"""## {ticket_id} - {title}

**Epic:** {epic}
**Priority:** {priority.upper()}
**Story Points:** {points}
**Phase:** {milestone}

### Description
{ticket_id}: {title}

### Acceptance Criteria
- [ ] Feature implemented according to PRD
- [ ] Unit tests written and passing (80% coverage)
- [ ] Integration tests passing
- [ ] Code reviewed and approved
- [ ] Documentation updated

### Technical Requirements
- Follows Nexus architecture guidelines
- API documented with OpenAPI
- Error handling implemented
- Rate limiting where applicable
- Logging added

### Definition of Done
- [ ] Code merged to main
- [ ] Deployed to staging
- [ ] QA verified
- [ ] No P0/P1 bugs
- [ ] Performance impact assessed
"""
    
    cmd = [
        "gh", "issue", "create",
        "--repo", REPO,
        "--title", f"[{ticket_id}] {title}",
        "--body", body,
        "--label", labels_str,
        "--milestone", milestone
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Created {ticket_id}")
            return True
        else:
            print(f"❌ Failed {ticket_id}: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error {ticket_id}: {e}")
        return False

def main():
    print(f"Importing {len(TICKETS)} tickets to {REPO}")
    print("-" * 50)
    
    success = 0
    for i, ticket in enumerate(TICKETS, 1):
        print(f"[{i}/{len(TICKETS)}] ", end="")
        if create_issue(*ticket):
            success += 1
        time.sleep(0.5)  # Rate limiting delay
    
    print("-" * 50)
    print(f"✅ Successfully created {success}/{len(TICKETS)} issues")

if __name__ == "__main__":
    main()
