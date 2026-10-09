# My Daily Command

Build a polished, production-minded web application for personal productivity, planning, routines, and later-stage reflective wellbeing features.

The product should be designed as one cohesive app, but built in clearly separated phases. Do not attempt to fully implement every future idea in the first build. The first release should be small, fast, reliable, and genuinely usable.

1. Product vision

The core idea is:

A personal command center that combines tasks, routines, time planning, a calendar, and a simple timer into one system.

The future vision expands this into:

A personal planning + reflection system where users can connect what they need to do, how they spend their time, how they are feeling, and what they may want to improve.

For the initial build, focus heavily on N1–N3.

The application should feel calm, modern, focused, and motivating rather than like an overloaded corporate project-management tool.

Avoid unnecessary complexity.

2. BUILD PHASES

PHASE 1 — MVP

Build only:

N1 — Tasks

Users can create and manage tasks.

Each task should support:

Title

Description/notes

Priority:

Low

Medium

High

Category/tag

Status:

Not started

In progress

Done

Optional due date

Optional due time

Created date

Completed date

Users should be able to:

Create a task

Edit a task

Delete a task

Mark a task complete

Change status

Change priority

Assign/change category

Filter tasks

Sort tasks

Search tasks

Task filtering should support combinations such as:

Status

Priority

Category

Due date

Keep the initial task UI simple. Do NOT build a complex Kanban board yet.

N2 — Routine / Time Entries

Create a separate concept called Routine or Time Entry.

This is different from a task.

A task represents:

"Something I need to accomplish."

A routine/time entry represents:

"Something I do or plan to do at a particular time."

Users can create an entry with:

Title

Optional description

Date

Optional specific time

Optional duration

Notes

Optional recurring setting, but do NOT implement advanced recurring scheduling in MVP unless it is extremely simple.

Examples:

Study

Exercise

Read

Work

Break

Lunch

Class

Personal project

Morning routine

Allow an entry to be:

At a specific time

Anytime during the selected day

3. CALENDAR — Connect N1 + N2

The calendar is one of the most important parts of the MVP.

Create a calendar view that combines:

Tasks

Tasks with due dates/times should appear on the calendar.

Routine entries

Routine/time entries should appear on the calendar as well.

The user should therefore see:

What I need to do + what I planned to do

in one place.

Calendar requirements:

Week view as the default

Day view

Select a date

Click an event/task to open its details

Add task from calendar

Add routine entry from calendar

Distinguish task vs routine visually

Show completed tasks appropriately

Design this to eventually support Google Calendar synchronization.

4. N3 — TIMER

Create a simple timer.

The timer should support:

Start

Pause

Resume

Stop/reset

Optional countdown duration

Stopwatch-style elapsed timer

Users should be able to start a timer:

From the Today screen

From a task detail page

When a timer is attached to a task, save the timer session to the database.

Store:

Start time

End time

Duration

Associated task, if any

User

The timer should remain functional while the user navigates around the application.

Do not build an overly complex Pomodoro system yet.

A simple, reliable timer is better.

5. MAIN NAVIGATION

Create a clean navigation system.

Primary navigation:

Today

Tasks

Calendar

The Timer should be accessible from Today and Tasks, rather than necessarily requiring a fourth primary navigation tab.

Settings should be accessible through the user's avatar/profile menu.

6. TODAY DASHBOARD

The Today page should be the main landing page after login.

Design it as the user's daily command center.

Suggested structure:

Header

Greeting

Current date

Small progress indicator

Timer

Place the active timer prominently near the top.

Show:

Current task

Time elapsed/countdown

Start/pause/stop controls

Today's routine

Show today's routine/time entries in chronological order.

Today's tasks

Show:

Overdue

High priority

Due today

In progress

Completed

Do not show the entire database here.

This screen should answer:

"What should I be doing today?"

within a few seconds.

7. TASK CREATION FLOW

Make creating a task extremely fast.

Ideal flow:

Title
→ Priority
→ Category
→ Optional due date/time
→ Save

The user should not have to fill out a giant form.

Support a floating "+" button for quick creation.

The quick-add system should eventually support:

Task

Routine entry

For MVP, provide a simple selector:

"Add task" / "Add routine"

8. CATEGORIES

Users can create custom categories.

Examples:

School

Work

Personal

Health

Projects

Family

Categories should have:

Name

Optional color

User ownership

Users should be able to:

Create

Rename

Delete categories

Do not hard-code categories.

9. AUTHENTICATION

Authentication is required.

Support exactly these authentication methods:

Email/password

Users can:

Sign up

Sign in

Sign out

Reset password

Google

Users can authenticate using Google OAuth.

The system must correctly associate all data with the authenticated user.

No user's private tasks, routines, timer sessions, or other records may ever be accessible by another user.

Use Supabase Auth.

10. BACKEND / DATABASE

Use Supabase for:

Authentication

PostgreSQL database

Row Level Security

Server-side data

Future realtime functionality

Use a clean relational schema.

Suggested tables:

profiles

id

user_id

display_name

avatar_url

created_at

updated_at

categories

id

user_id

name

color

created_at

tasks

id

user_id

category_id

title

description

priority

status

due_date

due_time

created_at

updated_at

completed_at

routine_entries

id

user_id

title

description

entry_date

entry_time

duration_minutes

notes

created_at

updated_at

timer_sessions

id

user_id

task_id

started_at

ended_at

duration_seconds

created_at

Design the schema so that future features can be added without restructuring the core data model.

11. DATABASE SECURITY

This is mandatory.

Enable Row Level Security on all user-owned tables.

Every user-owned record must be restricted to the authenticated user.

Conceptually:

user_id = auth.uid()

Do not rely only on frontend checks.

The backend must enforce ownership.

Do not expose service-role credentials in frontend code.

Do not store sensitive secrets in client-side code.

12. GOOGLE CALENDAR ARCHITECTURE

Do not make Google Calendar synchronization a blocker for the MVP.

Design the application so it can be added cleanly.

Future functionality should support:

Google OAuth

Selecting Google calendar

Reading calendar events

Creating application events in Google Calendar

Updating synchronized events

Avoiding duplicate events

For the MVP, create the UI/settings architecture so Google Calendar integration can be added later without redesigning the entire application.

Do not fake synchronization.

If the API integration is not configured, clearly label the feature as coming soon or leave it disabled.

13. PHASE 2 — RETENTION / GAMIFICATION

Do NOT fully build Phase 2 until the Phase 1 foundation is stable.

Future features:

Streaks

Track:

Consecutive days with completed tasks

Daily activity

Personal records

Achievements

Examples:

First task completed

10 tasks completed

50 tasks completed

7-day streak

30-day streak

Titles

Examples:

Beginner

Consistent

Focused

Organized

etc.

Cosmetic progression

Unlock:

Themes

UI skins

Accent styles

Visual personalization

Important:

Do NOT turn the entire application into a distracting game.

Gamification should reinforce productivity, not become the product.

14. PHASE 3 — CHECK-IN / REFLECTION

This is a future feature, not the MVP.

Add a "Check-in" section later.

The user should be able to record:

Mood

Use a simple 2-axis model:

Energy:

Low

High

Pleasantness:

Unpleasant

Pleasant

This produces four general states:

Low energy + unpleasant

Low energy + pleasant

High energy + unpleasant

High energy + pleasant

After choosing a state, show a more granular emotion/word system so the user can select words that describe the experience.

Then allow:

Free text note

Optional tags

Date/time

15. AI FOLLOW-UP

Later, the Check-in feature can have an AI button:

"Talk this through"

The AI should ask useful follow-up questions based on the user's note.

Do not make the AI aggressively conversational.

It should be:

Calm

Respectful

Concise

Curious

Practical

At the end of the conversation, give the user an option to close the conversation.

When closed, the AI can generate:

Summary

2–3 concise points describing what the user discussed.

Possible next steps

A small number of optional practical actions.

Where appropriate, suggested actions should be convertible directly into N1 tasks.

For example:

AI suggestion:

"Set aside 20 minutes tomorrow to work on your assignment."

Button:

"Add as task"

This is an important product loop:

Check-in
→ reflection
→ AI insight
→ task
→ completion

16. AI PLANNER

Later, add an AI planning feature.

Example:

User types:

"I have an exam next Friday, three chapters to study, an assignment due Wednesday, and practice Tuesday evening."

The AI should convert the situation into structured tasks and/or routine entries.

Possible output:

Finish chapter 1

Finish chapter 2

Finish chapter 3

Work on assignment

Review notes

Study session Tuesday

The user must review the generated plan before anything is automatically created.

Never silently create dozens of tasks.

Use an approval interface:

"AI suggested these 5 tasks"

Then:

Add all

Add individually

Edit

Reject

17. FUTURE ASSESSMENT SYSTEM

Do not build this in MVP.

Eventually include an assessment section.

Potential categories:

Personality

Emotional intelligence

General wellbeing

Attention-related screening

Temperament

Attachment patterns

Neurodiversity-related screening

Important product rule:

These should be presented as self-reflection or screening tools, not as diagnoses.

Do not make medical claims.

Do not tell users they "have" a condition based on a quiz.

Reports should explain:

What the result may indicate

Possible strengths

Possible challenges

Stress-management ideas

Practical planning suggestions

Areas the user may want to reflect on

The assessment engine should eventually connect with the Check-in and productivity data.

For example:

Assessment
+
Check-in history
+
Task patterns

personalized planning insights

Do not build this speculative intelligence in the first version.

18. PRIVACY-FIRST PRODUCT DESIGN

Because later versions may contain personal reflections, mood information, and assessment results, treat privacy as a major architectural requirement.

Rules:

User data belongs to the user

Strict Supabase RLS

No public personal data

No exposing private notes through APIs

Do not log private journal content unnecessarily

Keep AI prompts limited to information required for the requested AI action

Clearly explain AI usage in settings/privacy screens

Build the data architecture so that highly personal information can be handled separately from ordinary productivity data later.

19. AI COST CONTROL

AI features must not be implemented in a way that allows unlimited expensive usage.

Later AI features should support:

Usage tracking

Per-user usage counts

Daily/monthly limits

Free-tier limits

Paid-tier limits

Track AI usage server-side.

Do not expose secret AI API keys in frontend code.

20. MONETIZATION ARCHITECTURE

Do not aggressively monetize the MVP UI yet, but architect the application so monetization can be added.

Potential model:

Free

Limited active tasks

Limited categories

Basic calendar

Basic timer

Premium

Unlimited tasks

More customization

Advanced calendar

Streak/achievement customization

AI planner

AI check-in conversations

AI-generated summaries

Advanced insights

AI features should have usage limits because they create variable API costs.

For the initial web launch, design the system so Stripe can be integrated later.

Do not build a fake subscription system.

21. TECHNICAL DIRECTION

Use a modern web stack appropriate for Lovable.

Preferred architecture:

React

TypeScript

Modern component-based architecture

Supabase

PostgreSQL

Supabase Auth

Responsive web UI

Mobile-friendly design

The MVP should be built as a web-first responsive application.

Do not unnecessarily introduce React Native/Expo-specific architecture into the Lovable web project.

The code should remain structured so it can later be adapted into a mobile application.

Use environment variables for all secrets and API configuration.

22. DESIGN SYSTEM

Design direction:

Modern
Minimal
Calm
Focused
Premium without being flashy

Avoid:

Generic enterprise dashboard aesthetic

Excessive gradients

Excessive glassmorphism

Giant cards everywhere

Too many colors

Cluttered sidebars

Gamification dominating the interface

The visual hierarchy should make the application feel like a calm personal operating system.

A user should open it and immediately understand:

What am I doing today?

What do I need to do next?

What have I already completed?

Use strong typography, generous spacing, subtle borders, clear status indicators, and consistent components.

Make dark mode easy to add later.

23. RESPONSIVE DESIGN

The application must work well on:

Desktop

Tablet

Mobile browser

Do not simply shrink the desktop interface.

Mobile should have:

Compact navigation

Easy task creation

Comfortable touch targets

Full-screen task creation where appropriate

Easy timer controls

Readable calendar

24. IMPORTANT UX RULES

Optimize for speed.

Common actions should require very few interactions.

Examples:

Create task:
→ 3–4 interactions maximum

Complete task:
→ one click/tap

Start timer:
→ one click/tap

Add routine:
→ quick form

See today's priorities:
→ immediately visible

Do not make users navigate through multiple screens for simple actions.

25. ERROR / EMPTY / LOADING STATES

Every major feature must have proper:

Loading states

Empty states

Error states

Success feedback

Examples:

No tasks:

"You’re clear. Add something you want to accomplish."

No routines:

"Plan a part of your day."

No calendar events:

"Your calendar is open."

Avoid generic "Something went wrong" wherever possible.

26. DEVELOPMENT ORDER

Build in this exact order:

Step 1

Project foundation and design system.

Step 2

Supabase configuration.

Step 3

Authentication:

Email/password

Google OAuth

Step 4

Database schema + RLS.

Step 5

Today dashboard.

Step 6

Tasks.

Step 7

Categories.

Step 8

Routine/time entries.

Step 9

Calendar.

Step 10

Timer.

Step 11

Settings/profile.

Step 12

Polish, responsive testing, loading states, empty states, error handling.

Do NOT start Phase 2 until Phase 1 works end-to-end.

27. MVP SUCCESS CRITERIA

The first version is successful when a new user can:

Create an account with email/password or Google.

Log in.

Create categories.

Create tasks.

Organize tasks by priority/status/category.

Create routine/time entries.

See tasks and routines together on a calendar.

Start a timer for a task.

Stop the timer and have the session saved.

Complete tasks.

See their day clearly on the Today dashboard.

Sign out and return later with all data intact.

Prioritize reliability over feature count.

28. VERY IMPORTANT IMPLEMENTATION RULE

Do not respond by trying to build the entire long-term vision immediately.

Build the application around a strong MVP.

Do not create placeholder AI functionality that pretends to work.

Do not create fake Google Calendar synchronization.

Do not create fake assessments.

Do not create unnecessary features simply to make the app look bigger.

The MVP should feel like a finished product, not a prototype stuffed with unfinished features.

When implementing anything, prefer:

simple + reliable + extensible

over:

complex + impressive + fragile

29. FIRST BUILD REQUEST

Start by implementing Phase 1 only:

Authentication

Today

Tasks

Categories

Routine/time entries

Calendar

Timer

Settings

Supabase database

Row Level Security

Responsive design

After implementing Phase 1, provide a concise summary of:

What was built

Database tables created

Authentication configured

Security/RLS implemented

Remaining configuration required from the developer

Any known limitations

Then stop.

Do not automatically proceed into Phase 2, AI, assessments, gamification, or wellness features until Phase 1 is stable.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1ee95cf4-c538-4140-a1e8-c38a1a63b087).

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
