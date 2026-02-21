---
name: initate-plan
description: Start executing a plan in a user friendly way
---

# Plan Execution Instructions

## Step 1: Identify the Plan File
First, identify which plan file to execute. Plan files are located in `.github/copilot-instructions/plans/` directory. If the user hasn't specified a plan, list available plans and ask which one to execute.

Available plan locations:
- `.github/copilot-instructions/plans/plan-*.md`
- `.github/copilot-instructions/plans/plan-*.prompt.md`

## Step 2: Read and Parse the Plan
Read the specified plan file completely to understand:
- Implementation tasks (check the "Tasks" or "Implementation Tasks" section)
- Architecture and design requirements
- Success criteria
- Dependencies and prerequisites

## Step 3: Create Todo List
Create a comprehensive todo list using `manage_todo_list` tool based on the tasks in the plan file. Break down complex tasks into smaller, actionable items. Mark all items as "not-started" initially.

## Step 4: Execute Tasks Sequentially
For each task:
1. Mark the task as "in-progress" using `manage_todo_list`
2. Execute the task following project guidelines (MUI-only, theme system, Zod validation, etc.)
3. Verify the task completion (run tests, check for errors, validate output)
4. Mark the task as "completed" using `manage_todo_list`
5. **Ask the user if they want to continue to the next task or stop**

## Step 5: Progress Tracking
- Update todo list status after each task completion
- Provide clear progress updates showing completed vs remaining tasks
- If user chooses to stop, show current progress and note which task to resume from

## Step 6: Completion
When all tasks are completed:
- Verify all success criteria from the plan are met
- Run final validation (tests, linting, error checks)
- Update plan documentation to mark it as completed if needed
- Provide summary of what was accomplished

## Important Notes
- Always follow project guidelines from `.github/copilot-instructions.md`
- Use MUI components only, no custom CSS
- Validate with Zod schemas from `@spectatr/shared-types`
- Create Storybook stories for new components
- Write unit tests for business logic
- Maintain sport-agnostic design (no hardcoded rugby logic)