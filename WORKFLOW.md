# Workflow

1. Zubia and Claude discuss. Claude diagnoses first: reads code, says what is there, what is missing, what it takes. Then stops.
2. Zubia says go. Claude writes the prompt for Cursor, or works the branch directly when Zubia asks.
3. One feature, one branch, cut from main. Named `feat/<short-name>`. One writer per branch.
4. Before every commit: tsc clean, lint (pre-existing warnings named, not fixed), tests pass, build clean, bundle grepped for secrets.
5. Push the feature branch only. Nobody pushes to main.
6. Claude validates the actual branch diff against README, CLAUDE.md, and `.cursor/rules`, not the report.
7. Zubia merges with the PowerShell block Claude provides. Push to main deploys.
8. Migrations: SQL file in the branch, Zubia pastes in the SQL Editor, confirms with the check query, before the deploy.
9. Session start: read CLAUDE.md and the last SESSION_LOG entry. Session end: ADRs, resume note, SESSION_LOG. Add only.
10. No em dashes anywhere. Short sentences. Report what shipped, what to test, what is pending.
