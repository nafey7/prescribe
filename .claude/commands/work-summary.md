# /work-summary - Generate Non-Technical Work Summary for a Day

Generate a concise, non-technical summary of your git commits for a specific day, grouped by PR or logical work item, suitable for sharing with a non-technical manager or stakeholder.

## Usage

```
/work-summary [date or day]
```

**Examples:**
- `/work-summary` — Uses yesterday (full day 00:00–23:59) by default
- `/work-summary last friday`
- `/work-summary yesterday`
- `/work-summary March 6 2026`
- `/work-summary 2026-03-06`

## Instructions for the AI

When this command is invoked:

1. **Resolve the date** from the user's input. If no date is provided, use **yesterday** as a whole day. Always use the full 24 hours: `--since="<date> 00:00"` and `--until="<date> 23:59"`. Git understands relative dates like "last friday", "yesterday", "2 days ago", and absolute dates like "2026-03-06".

2. **Fetch commits** using author **nafey7** (fixed). Run:
   ```bash
   git log --all --author="nafey7" --since="<START>" --until="<END>" --format="%H %s" --no-merges
   ```
   For "yesterday" (default): `--since="yesterday" --until="today"` (full previous day)  
   For "last friday": `--since="last friday 00:00" --until="last friday 23:59"`

3. **Fetch PR associations** (optional). Map commits to PRs to surface PR numbers and status:
   ```bash
   gh pr list --author nafey7 --state all --limit 50 --json number,title,state,mergeCommit
   ```
   For each commit SHA, check if it appears in a merge commit: `git log --all --oneline --merges --grep="<SHA>"`
   Or: for each PR, `gh pr view <number> --json mergeCommit,commits` to link commits to PRs.
   If `gh` is unavailable, skip PR association and use commit SHAs only.

4. **Fetch commit details** for each SHA. For each commit hash, run:
   ```bash
   git show <SHA> --stat --no-patch
   git show <SHA> --shortstat --format=""
   ```
   This gives the commit message (including extended body) and file change stats.

5. **Group work by PR or logical item.** Prefer grouping by PR when a commit belongs to a PR. Otherwise, group related commits (e.g., multiple commits on the same branch/feature). Each group becomes one numbered item in the output.

6. **For each group**, compute stats (sum of files changed, insertions, deletions across commits in the group). Derive a short, descriptive title from the work (e.g., "Google Places integration", "Places API security and reliability", "New landing page").

7. **Write the summary** in plain language. Avoid jargon (Redux, API, O(1), imgproxy, etc.). Use phrases like:
   - "Users can now…" instead of "Added syncItineraryToSearchParams thunk"
   - "Fixed the itinerary tab so it remembers where you were" instead of "Persist lastItineraryPath in uiSlice"
   - "Improved hotel images" instead of "imgproxy thumbnails at 800px"
   - "Hardened address lookup to handle high traffic" instead of "Refactored places rate limit to use deque"

8. **Format output** exactly as in the Example Output Structure below:
   - Title: `Today's Update` (or `Yesterday's Update` / `[Weekday]'s Update` when summarizing a past day) – `[Weekday], [Month] [Date], [Year]`
   - Numbered items (1., 2., 3.)—each with a **Title (PR N – status)** or **Title (commits abc123 & def456)** when no PR
   - For each item: brief intro paragraph, then bullet points, then `Stats: X files changed, +Y / -Z lines.`
   - Final **Summary** section with Merged, In review, In progress.

9. **Summary section.** Populate:
   - **Merged:** PRs/work that was merged that day.
   - **In review:** PRs currently in review (open, not merged).
   - **In progress:** Branches, features, or commits not yet in a PR, or work in progress.

## Example Output Structure

Output must follow this format. Adjust the numbered items and content to match the day's work.

```markdown
Today's Update – Wednesday, Mar 4, 2025

1. Google Places integration (PR 474 – merged)
Added support for discovering places and retrieving their photos via Google:

- Place discovery: Users can search for places by name or text.
- Place photos: Ability to fetch and serve place photos from the API.
- API endpoints: Search places and get photo URLs.
- Testing & logging: Unit tests and structured logging for the new functionality.
Stats: 9 files changed, +1,066 / -4 lines.



2. Places API security and reliability (PR 479 – in review)
Improved the Places API with security and operational controls:

- Rate limiting: Limits on how often each user/IP can call the API to reduce abuse.
- Security: Checks to block requests to external/internal URLs (SSRF protection).
- Authentication: Search and image endpoints now require login.
- Resource management: Properly closing connections when the app shuts down.
- Error handling: Centralized error handling and clearer error responses.
Stats: 9 files changed, +634 / -253 lines.



3. New landing page (commits 64a6d29 & 23de8e04)
Delivered a redesigned landing page for the Voya site:

- New sections: Hero with main headline and call-to-action; Testimonials; Example itineraries; "How it works"; "What Voya gives you"; "Why Voya"; Sign-up and final CTA sections; Navigation and footer; Search input for trip planning
- Media cleanup: Replaced testimonial SVGs with PNG images for reducing assets size.
Stats: ~3,500+ lines added across 22 files.



Summary

Merged: Places API integration (PR 474).
In review: Places API rate limiting and security (PR 479).
In progress: New landing page and testimonial assets (branch 477).
```
