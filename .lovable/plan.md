# BlindMatch — Telegram Dating Mini App

A mobile-first dating app that runs inside Telegram, plus a private moderation panel.
Personality and interests come first, photos second.

## What you get

**For people using the app**
- Opens instantly inside Telegram — no signup, no password. Works in a normal browser too (demo mode) for testing.
- Welcome screen, 18+ age confirmation, then a guided multi-step profile setup: name, age, gender, who they want to meet, city, photo, bio, interests, and short personality answers.
- Discover: one person at a time on a large card with photo, name, age, city, interests, bio, personality answers and a "Compatibility" figure. Swipe or tap to Pass / Like, with smooth animations.
- Mutual like triggers a full-screen "IT'S A MATCH" celebration with both photos, plus "Say Hello" and "Keep Discovering".
- Matches tab with photo, name, age, city, compatibility, match date and a Chat button.
- Real-time chat between matched people only, with timestamps and unread counts. Three suggested icebreakers based on shared interests.
- 3 Daily Matches each day and a light daily streak to bring people back.
- Invite friends via a personal Telegram link; referrals are tracked so rewards can be added later.
- Shareable "We matched" card for Telegram.
- Profile tab: view/edit profile, discovery filters (age range, gender, city, interests), privacy, blocked users, help, terms, delete account.
- Block and Report on every profile. Blocked people vanish from Discover and Matches immediately.
- Skeleton loading everywhere, friendly empty states, friendly error messages. Works from 320px up to desktop Telegram.

**For you (private admin panel)**
- Separate, password-protected area at a non-obvious address. Access is checked on the server every time, never in the browser.
- Three levels: Super Admin, Moderator, Support — each sees and can do only what its level allows.
- Dashboard: total users, new today, active users, matches, messages, reports, suspended and banned counts, plus growth charts.
- Users list with search (id, Telegram id, username, name, city) and filters; detailed user page with activity, report/block counts, referral info and moderation history.
- Reports queue with categories, priority, assignment and statuses (New, Under review, Resolved, Dismissed, Escalated).
- Conversation review is case-based: a chat can only be opened when a report authorises it, and every access is recorded.
- Suspend (1h / 24h / 7d / 30d) or permanently ban with a required reason; temporary suspensions expire automatically.
- Emergency action for serious safety cases: suspend, disable messaging, hide profile, escalate.
- Security overview of unusual activity, framed as Normal / Needs review / High risk.
- Audit log of every sensitive admin action. It can be read but never edited or deleted.

## Build order

1. Backend setup (Lovable Cloud): tables, security rules, photo storage, seeded interests.
2. Telegram integration + browser demo fallback, onboarding, 18+ gate, profile creation with photo upload.
3. Discover, compatibility scoring, like/pass, mutual match celebration.
4. Matches, real-time chat, icebreakers, unread counts.
5. Block, report, filters, settings, account deletion, daily matches, streak, referrals, share card.
6. Admin panel: roles, dashboard, users, reports, case-based conversation review, moderation actions, security view, audit log.
7. Security pass over all rules and access paths.

## Technical notes

- React + TypeScript + Tailwind, TanStack Start routing, Lovable Cloud (Postgres + auth + storage) — all free-tier friendly.
- Telegram `initData` is verified **server-side** with the bot token (stored as a secret, never in browser code) before any account is created or trusted. Client-side Telegram data is never trusted on its own.
- Row Level Security on every table. Public profile fields are separated from private ones (date of birth, Telegram data, preferences) so private data is unreadable by other users. Messages readable only by the two people in a match.
- Admin roles live in their own table with a server-side role check function; no admin flag on user rows. Every admin action runs through a server function that re-checks the role and writes an audit row. Audit rows are insert-only by policy.
- Age is verified from a stored date of birth on the server; only the computed age is ever shown.
- Photos go to a storage bucket with per-user write policies; type, size and dimensions validated, compressed client-side before upload.
- Compatibility: shared interests 40%, same city 20%, age-preference fit 20%, personality similarity 20%, normalised to 0–100 with slight randomness in ordering. Presented as a fun signal, not a prediction.
- Discover loads a small page of candidates at a time with indexes on the interaction tables; duplicate likes/passes/matches blocked by unique constraints.
- Demo profiles are flagged and filtered out of production.
- Analytics event table ready for: profile_created, profile_completed, like_sent, pass_sent, match_created, message_sent, referral_created, daily_match_opened.

## Needs your action (I cannot do these)

- Creating the Telegram bot's Mini App entry and setting its URL in BotFather after the app is published.
- Real Terms of Service / Privacy Policy wording — I will add clear placeholders.
