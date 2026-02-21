---
name: update-jira-stories
description: Create and update Jira stories from markdown plan documents
argument-hint: path/to/plan-document.md
agent: agent
tools:
  - com.atlassian/atlassian-mcp-server/*
  - read
  - search
  - todo
---

You are tasked with creating and updating Jira stories based on markdown plan documents.

## Configuration Variables

Before processing, gather the following information from the user:

- **Plan Document Path**: ${input:planPath:Path to plan document (e.g., docs/plan.md)}
- **Cloud ID**: ${input:cloudId:Atlassian Cloud ID or site URL (default: webheaddigital.atlassian.net)}
- **Project Key**: ${input:projectKey:Jira project key (default: FSA)}
- **Ticket Key (for single update)**: ${input:ticketKey:Jira ticket key to update (e.g., FSA-123) - leave blank to process multiple stories from plan}
- **Default Assignee**: ${input:assignee:Default assignee account ID (optional)}
- **Default Labels**: ${input:labels:Comma-separated labels (optional)}

**Note**: If a ticket key is provided, the prompt will update only that specific ticket using the plan document content. If no ticket key is provided, it will process all stories in the plan document (creating new ones or updating existing ones marked with "Jira:" field).

## Template for Plan Document

The plan document should follow this structure:

```markdown
Purpose (Why is this plan being created)
…

Build Notes (High-level implementation details)
…

Testing Notes (Things to be aware of)
…

Acceptance Criteria (Minimum conditions for story completion)
GIVEN I am …
AND … (optional additional conditions)
WHEN I …
THEN I …
```

## Process Steps

## Process Steps

### Step 1: Read and Parse Plan Document

Use #tool:read_file to read the plan document from the specified path. Parse the markdown to extract individual stories based on:
- Header levels (## or ###)
- Story identifiers
- Structured sections

### Step 2: Extract Story Information

For each story section in the plan document, extract:

- **Summary**: From the story header/title (## or ### level heading)
- **Purpose**: Content under "Purpose" section - this becomes the main description
- **Build Notes**: Content under "Build Notes" section - append to description
- **Testing Notes**: Content under "Testing Notes" section - append to description
- **Acceptance Criteria**: Gherkin-style criteria (GIVEN/WHEN/THEN format)
- **Story Points**: If specified (look for "Story Points: X" in metadata)
- **Priority**: High, Medium, Low, or P0, P1, P2 (look for "Priority:" field in metadata)
- **Labels**: Categories or themes (look for "Labels:" field in metadata)
- **Assignee**: Team member if specified (look for "Assignee:" field in metadata)
- **Epic**: Epic name or key if specified (look for "Epic:" field in metadata)
- **Existing Jira Key**: If the story already has a Jira reference (e.g., "Jira: FSA-123")

### Step 3: Field Mapping

Map extracted information to Jira fields:

| Plan Element | Jira Field |
|--------------|------------|
| Story Title | summary |
| Purpose | description (main body) |
| Build Notes | description (append as "**Build Notes:**\n" section) |
| Testing Notes | description (append as "**Testing Notes:**\n" section) |
| Acceptance Criteria | description (append as "**Acceptance Criteria:**\n" with Gherkin format) |
| Story Points | story points (custom field) |
| Priority | priority |
| Labels/Tags | labels |
| Assignee | assignee_account_id |
| Epic | epic link |

Format the description field as:
```
[Purpose content]

**Build Notes:**
[Build notes content]

**Testing Notes:**
[Testing notes content]

**Acceptance Criteria:**
GIVEN [condition]
AND [additional condition]
WHEN [action]
THEN [expected result]
```

### Step 4: Process Each Story

For each extracted story:

1. **Check for existing Jira key in plan**:
   - If a Jira key is present (e.g., FSA-123), this is an update operation
   - If no Jira key, check for duplicates using JQL search

2. **For NEW stories** (no existing key):
   - Use #tool:mcp_atlassian_atl_searchJiraIssuesUsingJql or #tool:mcp_com_atlassian_searchJiraIssuesUsingJql to search for duplicates:
     ```
     project = ${projectKey} AND summary ~ "${storyTitle}"
     ```
   - If duplicate found, ask user if they want to update it or skip
   - If no duplicate, use #tool:mcp_com_atlassian_createJiraIssue or #tool:mcp_atlassian_atl_createJiraIssue to create the story
   - Return the created story key and URL

3. **For EXISTING stories** (has Jira key):
   - Use #tool:mcp_com_atlassian_fetch or #tool:mcp_atlassian_atl_fetch to get current story details
   - Compare current values with plan document values
   - Use #tool:mcp_com_atlassian_editJiraIssue or #tool:mcp_atlassian_atl_editJiraIssue to update changed fields
   - Add a comment noting the source: "Updated from plan document: ${planPath}"
   - Log which fields were updated

### Step 5: Handle Dependencies

If stories reference other stories:
- Track all created story keys
- After all stories are processed, create issue links for dependencies
- Use appropriate link types (blocks, relates to, etc.)

## Expected Plan Document Format

The plan document should follow this structure:

```markdown
## [Story Title]
**Epic**: [Epic Name]
**Priority**: High
**Story Points**: 5
**Assignee**: @username or account-id
**Labels**: frontend, authentication
**Jira**: FSA-123 (optional - for updates)

### Purpose
Why is this story being created? What problem does it solve?

### Build Notes
High-level implementation details:
- Technical approach
- Key components to modify
- Architecture considerations

### Testing Notes
Things to be aware of during testing:
- Edge cases to test
- Integration points
- Performance considerations

### Acceptance Criteria
GIVEN I am [user/role]
AND [optional additional conditions]
WHEN I [perform action]
THEN I [expected outcome]

---

## [Another Story Title]
[... same format ...]
```

## Output Format

After processing all stories, provide a summary:

```markdown
### Stories Created
- [FSA-123](https://[site].atlassian.net/browse/FSA-123) - Story Title
- [FSA-124](https://[site].atlassian.net/browse/FSA-124) - Another Story

### Stories Updated
- [FSA-100](https://[site].atlassian.net/browse/FSA-100) - Updated: Description, Priority
- [FSA-101](https://[site].atlassian.net/browse/FSA-101) - Updated: Story Points, Labels

### Skipped
- "Duplicate Story Title" - Already exists as FSA-99 (user declined update)

### Errors
- Story "Invalid Title" - Missing required field: Project Key

### Summary
- ✅ Created: 2
- ✅ Updated: 2  
- ⚠️ Skipped: 1
- ❌ Errors: 0
```

## Error Handling

- **Missing Cloud ID**: Prompt user or use #tool:mcp_atlassian_atl_getAccessibleAtlassianResources
- **Duplicate stories**: Warn and ask for confirmation before creating
- **Missing required fields**: Use defaults from configuration or prompt user
- **Invalid Jira keys**: Report error and continue with next story
- **API errors**: Retry once, then log error and continue
- **Malformed sections**: Skip and report which section had issues

## Best Practices

1. **Always search for duplicates** before creating new stories
2. **Preserve existing data** when updating - only change what's different in the plan
3. **Add comments** when updating to track the change source
4. **Batch similar operations** where possible for efficiency
5. **Validate Jira keys** before attempting updates
6. **Handle missing assignees gracefully** - use defaults or leave unassigned

## Usage Examples

Run this prompt with:
```
/update-jira-stories docs/sprint-plan.md
```

Or provide inline parameters:
```
/update-jira-stories docs/plan.md cloudId=webheaddigital.atlassian.net project=FSA
```
