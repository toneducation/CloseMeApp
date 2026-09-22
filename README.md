# Heart Match

Build a complete mobile-first Telegram Dating Mini App called “BlindMatch”.

TECH STACK:

React

TypeScript

Tailwind CSS

Supabase for authentication/database/storage

Telegram WebApp SDK

No paid APIs

Keep the architecture suitable for a free-tier MVP

CORE USER FLOW:

TELEGRAM LOGIN

Detect Telegram WebApp user.

Use Telegram user ID as the unique user identifier.

Do not require a separate registration/password.

If Telegram WebApp is unavailable during development, provide a demo login mode.

PROFILE CREATION

Create a profile with:

First name

Age (18+ only)

Gender

Preferred gender

City

Profile photo

Short bio

Interests

“About me” question

Profile must not be visible publicly until required fields are completed.

DISCOVER SCREEN

Show one profile at a time.

Display:

Photo

First name

Age

City

Interests

Short bio

Buttons:

❌ PASS

❤️ LIKE

Do not show the current user’s own profile.

Do not show profiles that the current user has already liked, passed, blocked, or matched with.

MATCH SYSTEM

When User A likes User B:

Save the like in the database.

If User B has already liked User A:

Create a match.

Show a full-screen “IT’S A MATCH!” screen.

Allow both users to open the match.

MATCHES SCREEN

Show all mutual matches.

Each match should display:

Profile photo

Name

Age

City

Match date

Add an “Open Chat” button.

CHAT

Create a basic real-time chat between matched users.

Rules:

Only matched users can message each other.

Users cannot message someone they have not matched with.

Add message timestamps.

Add basic unread-message count.

SAFETY

Every profile must have:

Block user

Report user

Blocked users must immediately disappear from Discover and Matches.

Report options:

Spam

Fake profile

Harassment

Inappropriate content

Other

Create a basic reports table in Supabase.

PRIVACY

Never expose:

Telegram authentication data unnecessarily

Private database information

Other users’ internal IDs in the UI

Only reveal another user’s contact/Telegram information after a mutual match and only where appropriate.

DISCOVER ALGORITHM — MVP

Prioritize:

Preferred gender

Same city

Compatible interests

Profiles the user has not interacted with

Do not show the same profile repeatedly.

UI

Create a polished modern dating interface.

Mobile-first because the app will primarily run inside Telegram.

Bottom navigation:

Discover

Matches

Profile

Use smooth card animations for:

Like

Pass

Match

Make the interface feel like a real commercial mobile application.

DATABASE

Create Supabase tables for:

users
profiles
likes
passes
matches
messages
blocks
reports

Add appropriate relationships and indexes.

Implement Row Level Security so users cannot access private data belonging to other users.

DEMO DATA

Create realistic demo profiles for development.

Clearly mark demo mode so fake profiles cannot accidentally appear in production.

TELEGRAM

Add Telegram WebApp initialization.

Use:
window.Telegram.WebApp

Initialize the WebApp correctly and call:
Telegram.WebApp.ready()

Expand the application using:
Telegram.WebApp.expand()

Create a clean abstraction for Telegram user information so the app can also run in browser development mode.

IMPORTANT:
Build the application as a functional MVP, not just a visual mockup.

All buttons must work.

Database operations must be implemented.

Like → Match logic must actually work.

Chat must actually save and retrieve messages.

Block and Report must actually work.

Generate all required React components, Supabase queries, database schema/migrations, types, and configuration needed for the MVP. Build a complete, functional Telegram Mini App called “BlindMatch”.

BlindMatch is a modern 18+ social/dating app where users discover people through personality and interests first, instead of immediately judging profiles by photos.

The product must feel like a real commercial mobile application, not a basic website or prototype.

==================================================

PRODUCT CONCEPT
==================================================

The main idea:

Users create a dating/social profile and receive compatible people one at a time.

Instead of immediately showing a large grid of photos, BlindMatch initially focuses on:

Personality

Interests

City

Age

Short answers

Compatibility

The user can choose:

❤️ LIKE
❌ PASS

If two users like each other, they become a MATCH.

After a mutual match, additional profile information can become visible and they can start chatting.

The experience should feel simple, addictive, safe and fast.

==================================================




2. TARGET PLATFORM

The primary platform is Telegram.

Build the application as a Telegram Mini App.

The app must work extremely well on:

iPhone

Android

Telegram mobile

Telegram desktop

Normal browser development mode

Use:

React
TypeScript
Tailwind CSS
Supabase
Telegram WebApp SDK

Do not use paid APIs.

Design the application so the first MVP can operate on free tiers.

==================================================




3. TELEGRAM INTEGRATION

Implement Telegram WebApp support.

Use:

window.Telegram.WebApp

Initialize:

Telegram.WebApp.ready()

Then:

Telegram.WebApp.expand()

Detect the Telegram user.

Use Telegram user ID as the primary external identity.

Create a development fallback so the application can also be tested in a normal browser without Telegram.

Never expose Telegram authentication secrets to the client.

Do not store unnecessary Telegram data.

==================================================




4. ONBOARDING

When a new user opens BlindMatch:

Show:

“Welcome to BlindMatch”

Subtitle:

“Meet people through personality, not just pictures.”

Then explain:

Create your profile

Discover compatible people

Like someone

Match when they like you back

Start chatting

Then start profile creation.

==================================================




5. AGE RESTRICTION

BlindMatch is strictly 18+.

During onboarding require:

Date of birth OR age confirmation.

Do not allow users under 18.

Show:

“You must be 18 or older to use BlindMatch.”

Do not allow users to bypass this using a simple frontend-only check.

Store date of birth securely if collected.

Never publicly display the complete date of birth.

Only display calculated age.

==================================================




6. PROFILE CREATION

Create a beautiful multi-step profile creation process.

Fields:

First name
Age
Gender
Interested in
City
Profile photo
Bio
Interests

Gender options:

Man
Woman
Non-binary
Prefer not to say

Interested in:

Men
Women
Everyone

Allow multiple interests.

Example interests:

Music
Movies
Travel
Gaming
Fitness
Books
Photography
Architecture
Technology
Art
Food
Business
Fashion
Sports
Nature

Allow custom interests too.

==================================================




7. PERSONALITY QUESTIONS

This is an important unique feature.

Ask users several short questions.

Examples:

“What could you talk about for hours?”

“What is your perfect weekend?”

“Choose one: night out or quiet evening?”

“What kind of people do you enjoy being around?”

“Describe yourself in three words.”

“What is something you want to experience this year?”

“What makes you instantly like someone?”

Answers should be displayed on the user’s profile.

Use these answers to calculate basic compatibility.

==================================================




8. PROFILE PHOTO

Allow one main profile photo.

Allow additional photos optionally.

Compress images before upload when possible.

Validate:

File type
File size
Image dimensions

Use Supabase Storage.

Do not expose private storage credentials.

Use appropriate access policies.

==================================================




9. DISCOVER SYSTEM

Create the main Discover screen.

Show one profile at a time.

Do not show:

The user’s own profile
Already liked profiles
Already passed profiles
Blocked users
Users who blocked the current user
Existing matches
Reported users where appropriate
Users outside the user’s preferences

Profile card should contain:

Photo
First name
Age
City
Interests
Bio
Personality answers
Compatibility percentage

Do not make the compatibility percentage look scientifically accurate.

Label it:

“Compatibility”

not:

“Chance of relationship”

==================================================




10. MATCHING ALGORITHM

Create a simple transparent compatibility score.

Example weighting:

Shared interests: 40%
Same city: 20%
Age preference compatibility: 20%
Personality answer similarity: 20%

Normalize the result to 0–100.

Do not claim that this predicts romantic success.

Use it only as a fun discovery feature.

Prioritize profiles with higher compatibility.

Also add controlled randomness so users do not always see the same type of profile.

==================================================




11. LIKE / PASS

Add two large buttons:

❌ PASS

❤️ LIKE

Support swipe gestures on mobile.

Swipe left = PASS.

Swipe right = LIKE.

Add subtle animations.

When the user likes someone:

Save:

user_id
target_user_id
timestamp

When the user passes:

Save:

user_id
target_user_id
timestamp

Prevent duplicate actions.

==================================================




12. MUTUAL MATCH

When User A likes User B:

Check whether User B has already liked User A.

If yes:

Create a match.

Show an exciting animation.

Screen:

“IT’S A MATCH! 💕”

Display both profile photos.

Text:

“You both liked each other.”

Buttons:

“Say Hello”
“Keep Discovering”

==================================================




13. MATCHES

Create a Matches tab.

Show mutual matches.

Each match card:

Photo
Name
Age
City
Compatibility
Match date

Button:

“Chat”

Add empty state:

“No matches yet.”

Then:

“Keep discovering people.”

==================================================




14. CHAT

Only mutual matches can chat.

Implement real-time messaging using Supabase.

Messages contain:

sender_id
receiver_id
match_id
message
created_at
read status

Features:

Send message
Receive message
Timestamp
Unread count
Scroll to latest message

Prevent users from messaging people who are not mutual matches.

==================================================




15. ICEBREAKER

Add a unique feature.

When a match happens, instead of only showing:

“Hi”

show 3 suggested icebreakers based on their profiles.

Examples:

“You both like travel. What country would you visit tomorrow if you could?”

“You both like music. What’s one song you never skip?”

“You both selected night out. What’s your ideal night?”

Allow:

“Send this”

or

“Write my own”

This should make starting conversations easier.

==================================================




16. DAILY MATCHES

Add a Daily Matches feature.

Every day show a limited number of recommended profiles.

Example:

“Your 3 Daily Matches”

This creates a reason to return every day.

Do not use artificial fake activity.

Do not pretend that someone liked the user if they did not.

==================================================




17. STREAK

Create an optional daily discovery streak.

Example:

🔥 7 day streak

A streak increases when the user opens Discover and interacts with at least one profile.

Do not punish users heavily for missing a day.

Keep it fun.

==================================================




18. REFERRAL SYSTEM

Create a viral referral architecture.

Each user gets a referral link.

Example structure:

Telegram start parameter.

When a new user joins through someone’s referral:

Track:

referrer_id
referred_user_id
created_at

Do not reward spam.

Add:

“Invite Friends”

Button.

Share message:

“I’m using BlindMatch. Let’s see who you match with 👀”

The referral system must be designed so it can later support rewards.

==================================================




19. SHAREABLE MATCH CARD

Create beautiful shareable result cards.

Example:

“WE MATCHED 💕”

Display:

Two profile photos
Compatibility
Shared interests

Then:

“Find your match on BlindMatch.”

Add Telegram share functionality where possible.

Do not expose private information.

==================================================




20. SEARCH / FILTERS

Add filters:

Age range
Gender
City
Interests

Do not allow users to search for exact private information.

Keep discovery simple.

==================================================




21. PROFILE

Create a Profile tab.

Show:

Profile photo
Name
Age
City
Bio
Interests
Personality answers

Buttons:

Edit Profile
Settings
Privacy
Blocked Users
Reports
Help

==================================================




22. SETTINGS

Settings should include:

Edit profile
Discovery preferences
Privacy
Notifications
Blocked users
Delete account
Help
Terms
Privacy Policy

Add confirmation before deleting the account.

==================================================




23. BLOCK

Every profile must have:

“Block”

After blocking:

Immediately remove the profile from Discover.

Remove existing interactions where appropriate.

Prevent future discovery.

==================================================




24. REPORT

Every profile must have:

“Report”

Report categories:

Spam
Fake profile
Harassment
Inappropriate content
Underage user
Scam
Other

Allow optional description.

Create Supabase reports table.

Do not expose reports publicly.

==================================================




25. MODERATION

Create basic moderation architecture.

Database should support:

User status
Suspended
Banned
Active
Reported count

Create an admin-ready structure.

Do not build a publicly accessible admin panel.

Admin functionality must require secure authentication.

==================================================




26. DATABASE

Create Supabase database schema.

Tables:

users
profiles
profile_interests
interests
likes
passes
matches
messages
blocks
reports
referrals
daily_matches
streaks

Create appropriate:

Primary keys
Foreign keys
Indexes
Unique constraints
Timestamps

Prevent duplicate likes.

Prevent duplicate matches.

==================================================




27. ROW LEVEL SECURITY

This is extremely important.

Enable Supabase Row Level Security.

Users must only be able to:

Read their own private data.

Read appropriate public profile information.

Create their own likes/passes.

Read their own matches.

Read/send messages only inside their mutual matches.

Create their own reports.

Create/manage their own profile.

Never expose:

Supabase service role key
Private user information
Other users’ private settings
Private authentication data

==================================================




28. DATABASE SECURITY

Never put secret keys in frontend code.

Use environment variables.

Clearly separate:

Public client configuration

from:

Server-side secrets.

Do not hardcode secret credentials.

==================================================




29. UI DESIGN

Design style:

Premium
Minimal
Modern
Mobile-first
Smooth
Fast

Use rounded cards.

Large profile imagery.

Clear typography.

Subtle animations.

Avoid excessive gradients.

Avoid childish dating-app visuals.

The app should feel like a modern startup product.

Primary navigation:

Discover
Matches
Profile

==================================================




30. DISCOVER SCREEN DESIGN

Top:

“Discover”

Then:

“People you might connect with”

Large profile card.

At bottom:

❌
❤️

Add small:

Compatibility: 86%

Use smooth swipe animation.

==================================================




31. EMPTY STATES

Create beautiful empty states.

Examples:

“No more profiles nearby.”

“Come back later for new people.”

“No matches yet.”

“Your next match could be here.”

==================================================




32. LOADING STATES

Create skeleton loaders.

Never show a blank screen while data loads.

Handle:

Network errors
Database errors
Image errors
Telegram unavailable
Authentication errors

Show friendly error messages.

==================================================




33. PERFORMANCE

Optimize for mobile.

Use:

Lazy loading
Image compression
Pagination
Database indexes
Efficient queries

Do not load hundreds of profiles at once.

Load profiles progressively.

==================================================




34. ANTI-SPAM

Add basic protections:

Rate-limit likes where possible.

Prevent excessive repeated actions.

Prevent duplicate accounts where technically possible.

Do not create fake profiles.

Do not generate fake likes or fake matches.

==================================================




35. RESPONSIVE DESIGN

The application must work correctly at:

320px width
375px width
390px width
430px width
768px width
Desktop Telegram

No horizontal scrolling.

Buttons must remain accessible.

==================================================




36. ACCESSIBILITY

Buttons need clear labels.

Support readable contrast.

Do not rely only on color.

Images need alt text.

Touch targets should be large enough for mobile.

==================================================




37. DEVELOPMENT MODE

Create a development/demo mode.

Allow developers to test:

Profile creation
Discover
Like
Pass
Match
Chat
Block
Report

without requiring real users.

Clearly separate demo data from production data.

Never accidentally display demo users to production users.

==================================================




38. LEGAL / SAFETY

Add placeholders for:

Terms of Service
Privacy Policy
Community Guidelines

Clearly state:

18+ only.

Do not promise relationships or romantic outcomes.

Provide reporting and blocking.

Provide account deletion.

==================================================




39. ANALYTICS ARCHITECTURE

Create an architecture that can later track anonymous product events such as:

profile_created
profile_completed
like_sent
pass_sent
match_created
message_sent
referral_created
daily_match_opened

Do not collect unnecessary sensitive personal information.

==================================================




40. FINAL REQUIREMENT

Do not create only a static design.

Build a functional MVP.

Every major button must work.

Implement:

Telegram authentication
Profile creation
Photo upload
Discover
Like
Pass
Compatibility calculation
Mutual Match
Matches
Chat
Block
Report
Referral architecture
Daily Matches
Profile editing
Settings
Account deletion

Use Supabase for persistent data.

Use secure Row Level Security.

Use Telegram WebApp APIs correctly.

Keep the first version compatible with free-tier infrastructure.

The code must be clean, modular, maintainable and easy to extend.

After completing the implementation, provide a clear setup checklist showing:

Supabase project setup

Database migration

Storage bucket setup

Environment variables

Telegram Bot setup

Telegram Mini App configuration

Local development

Production deployment

Do not claim that Telegram configuration has been completed if it requires manual setup.

Build the application now.Add a complete, secure ADMIN & MODERATION PANEL to BlindMatch.

The admin panel must NOT be a normal frontend route that anyone can access.

==================================================




ADMIN SECURITY

Create a separate secure admin area.

Requirements:

Never identify a user as admin based only on a frontend variable.

Never trust localStorage for admin permissions.

Never expose Supabase service-role keys in frontend code.

Use server-side authorization.

Implement role-based access control.

Store admin roles securely.

Every sensitive admin action must be authorized server-side.

Every sensitive admin action must create an immutable audit log.

Add session expiration.

Add secure logout.

Add protection against unauthorized access.

Do not expose admin APIs to normal users.

Admin roles:

SUPER_ADMIN
MODERATOR
SUPPORT

Permissions must differ by role.

==================================================




SUPER ADMIN

SUPER_ADMIN can:

View all users

Search users

View user profiles

View profile photos

View profile information

View account status

View account creation date

View last activity

View reports

View blocks

View matches

View moderation history

View referral information

View suspicious activity

Suspend users

Ban users

Unban users

Delete profiles

Review reported content

Manage moderation rules

Manage moderators

Manage admin roles

View security logs

View admin audit logs

View platform statistics

Manage reported conversations when required for a legitimate safety investigation

Do NOT allow deletion of audit logs.

==================================================




MODERATOR

MODERATOR can:

View reported users

View reported profiles

Review reported photos

Review relevant reported messages/conversations

Suspend users according to moderation rules

Ban users according to moderation rules

Resolve reports

Add moderation notes

View moderation history

MODERATOR cannot:

Create SUPER_ADMIN accounts

Change admin permissions

Delete audit logs

Access secret environment variables

Access database credentials

Export unrestricted private user data

==================================================




SUPPORT

SUPPORT can:

Search users

View basic profile information

View account status

View support tickets/reports

Help users with account problems

SUPPORT cannot:

Read private conversations unless explicitly authorized by the moderation workflow

Ban users

Change admin permissions

Access security secrets

Export sensitive information

==================================================




USER DETAIL PAGE

Create an admin user detail page.

Show:

Profile photo
Name
Age
City
Gender
Interests
Bio
Personality answers
Account creation date
Last active time
Account status
Report count
Block count
Like count
Match count
Message activity statistics
Referral information
Moderation history

Also show:

User ID
Telegram user ID where legally/operationally appropriate
Username if available

Never expose authentication secrets.

==================================================




CONVERSATION MODERATION

Do NOT make every user’s private chat permanently visible to every admin.

Instead implement:

Reported Conversation Review.

When a user reports another user or a message:

Create a moderation case.

The authorized moderator can review the relevant conversation context needed to investigate the report.

Record:

Who accessed the conversation
Why it was accessed
Which report/case authorized the access
When it was accessed

Create an immutable audit record.

SUPER_ADMIN may have broader emergency safety access, but every access must be logged.

==================================================




REPORT MANAGEMENT

Create an admin Reports dashboard.

Columns:

Report ID
Reporter
Reported user
Category
Created time
Status
Assigned moderator
Priority

Statuses:

NEW
UNDER_REVIEW
RESOLVED
DISMISSED
ESCALATED

Report categories:

Spam
Fake profile
Harassment
Inappropriate content
Underage user
Scam
Threat
Other

Allow moderator to:

Open report
Review evidence
Review relevant profile
Review relevant conversation context
Add notes
Assign report
Resolve
Dismiss
Escalate
Suspend user
Ban user

==================================================




SECURITY DASHBOARD

Create a Security dashboard.

Show:

Failed login/authentication attempts
Suspicious activity
Rapid repeated actions
Large numbers of reports
Repeated account creation patterns where technically detectable
Unusual messaging activity
Unusual like/pass activity
Blocked-user statistics
Banned-user statistics

Do not automatically label someone as malicious solely based on one signal.

Use:

Normal
Needs Review
High Risk

as moderation workflow states, not definitive accusations.

==================================================




ADMIN AUDIT LOG

Create an immutable admin audit_logs table.

Record:

admin_id
admin_role
action
target_user_id
target_resource_id
reason
timestamp
metadata

Examples:

VIEW_USER
VIEW_REPORTED_CONVERSATION
SUSPEND_USER
BAN_USER
UNBAN_USER
DELETE_PROFILE
RESOLVE_REPORT
DISMISS_REPORT
CHANGE_ADMIN_ROLE

Every sensitive admin action must be logged.

Admins must NOT be able to delete or modify audit records.

==================================================




ADMIN DASHBOARD

Create a professional dashboard with:

Total users
New users today
Active users
New matches
Messages
Reports
Suspended users
Banned users

Charts:

User growth
Daily active users
Matches
Reports
Moderation actions

Use pagination everywhere.

Never load the entire user database into the browser.

==================================================




USER SEARCH

Add powerful admin search.

Search by:

User ID
Telegram ID
Username
First name
City

Add filters:

Account status
Report count
Registration date
Last activity
Gender
Age range

==================================================




MODERATION ACTIONS

When an admin suspends or bans a user:

Require a reason.

Examples:

Policy violation
Harassment
Spam
Fake profile
Scam
Underage
Other

Save:

Admin
Reason
Timestamp
Duration if temporary

Show moderation history on the user page.

==================================================




TEMPORARY SUSPENSION

Support:

1 hour
24 hours
7 days
30 days
Permanent ban

Temporary suspension must automatically expire.

Permanent ban requires confirmation.

==================================================




EMERGENCY SAFETY

Create an emergency moderation workflow.

If there is a serious safety report:

Allow SUPER_ADMIN to immediately:

Suspend account

Disable messaging

Hide profile

Preserve relevant moderation evidence

Escalate the case

Every emergency action must be logged.

==================================================




PRIVACY

Admin access must follow least-privilege principles.

Do not expose:

Passwords
Authentication tokens
Private API keys
Supabase service-role key
Payment secrets
Session tokens

Do not display unnecessary personal information.

Only show private information when required for the specific moderation/support function.

==================================================




DATABASE SECURITY

Use Supabase Row Level Security.

Normal users must NEVER be able to:

Query admin tables

Query audit logs

Query moderation notes

Change their own admin role

Change another user’s account status

Access reports belonging to other users

Access administrative data

Admin authorization must be enforced server-side.

Do not rely only on frontend route protection.

==================================================




ADMIN UI

Create a separate professional admin dashboard.

Sidebar:

Dashboard
Users
Reports
Moderation
Conversations
Security
Audit Logs
Admins
Settings

Desktop-first but responsive.

Use tables with:

Search
Filters
Pagination
Sorting

Use confirmation dialogs for destructive actions.

Use clear warning states for:

Ban
Delete
Emergency suspension

==================================================




ADMIN MANAGEMENT

SUPER_ADMIN can create/manage moderator accounts.

Roles:

SUPER_ADMIN
MODERATOR
SUPPORT

Every role change must create an audit log.

Never allow an admin to grant themselves higher permissions.

==================================================




FINAL SECURITY REQUIREMENT

Perform a complete security review of the generated application.

Check for:

Broken access control

Client-side authorization

Exposed secrets

Insecure database queries

Missing RLS policies

Unauthorized admin access

IDOR vulnerabilities

Unauthorized conversation access

Improper file access

Unsafe file uploads

Missing rate limits

Missing audit logs

Fix security problems found in the implementation.

The final application must treat the admin panel as a privileged security/moderation system, not simply another page of the application. Bot token : @secret:TELEGRAM_BOT_TOKEN 


Userchat Id : 5276938671 . 



Do not add other useless things but do it perfect beautiful designed @connector:telegram:"Telegram" bot . And do it perfect beautiful design . Just please do not spend more tokens ! Help me to do it best !

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://matchmaker-spark-53.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8b04670f-4ff3-4e75-9314-3ebf1aa8c53f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
