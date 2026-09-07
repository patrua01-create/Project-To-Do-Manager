# Phase 6: Authenticated Feature Testing Validation Checklist

**Date Started**: _____________  
**Date Completed**: _____________  
**Tester**: _____________

---

## 1. Authentication

### Google OAuth
- [ ] Click "Continue with Google" button
- [ ] Redirected to Google login
- [ ] Login successful with Google account
- [ ] Redirected back to app with authenticated state
- [ ] User profile displays correctly (name, avatar, email)
- [ ] **PASS** / **FAIL** — Google OAuth complete flow

### GitHub OAuth
- [ ] Click "Continue with GitHub" button
- [ ] Redirected to GitHub authorization
- [ ] Authorization accepted
- [ ] Redirected back to app with authenticated state
- [ ] User profile displays correctly (name, avatar, email)
- [ ] **PASS** / **FAIL** — GitHub OAuth complete flow

### Logout
- [ ] Logout button visible in sidebar
- [ ] Click Logout
- [ ] Redirected to login page
- [ ] User profile cleared from memory
- [ ] **PASS** / **FAIL** — Logout working

### Session Persistence
- [ ] Login with GitHub or Google
- [ ] Refresh page (F5 or Ctrl+R)
- [ ] User still authenticated
- [ ] Profile data still visible
- [ ] Projects still visible
- [ ] **PASS** / **FAIL** — Session persists on refresh

---

## 2. Projects

### Create Project
- [ ] Click "+ New Project" button
- [ ] Modal appears with text input
- [ ] Enter project name and submit
- [ ] New project appears in project list
- [ ] Selected project highlighted
- [ ] **PASS** / **FAIL** — Project creation

### Rename Project
- [ ] Click "Edit" button on existing project
- [ ] Modal appears with current name
- [ ] Edit project name
- [ ] Submit changes
- [ ] Project list updates with new name
- [ ] **PASS** / **FAIL** — Project rename

### Delete Project
- [ ] Click "Delete" button on existing project
- [ ] Confirmation modal appears
- [ ] Click "Delete" to confirm
- [ ] Project removed from list
- [ ] Tasks from deleted project no longer visible
- [ ] **PASS** / **FAIL** — Project deletion

### Project Selection
- [ ] Create two projects (Project A, Project B)
- [ ] Click Project A
- [ ] Project A highlighted
- [ ] Main content updates for Project A
- [ ] Click Project B
- [ ] Project B highlighted
- [ ] Main content updates for Project B
- [ ] **PASS** / **FAIL** — Project selection

### Project Isolation
- [ ] Login as User A
- [ ] Create Project X
- [ ] Logout
- [ ] Login as User B
- [ ] Project X not visible in User B's projects
- [ ] User B can only see User B's projects
- [ ] **PASS** / **FAIL** — Project isolation working

---

## 3. Tasks

### Create Task
- [ ] Select a project
- [ ] Click "Add Task" or similar button
- [ ] Task form modal appears
- [ ] Fill in: title, description, status, priority, due date
- [ ] Submit task
- [ ] New task appears in task list
- [ ] Task details match input
- [ ] **PASS** / **FAIL** — Task creation

### Edit Task
- [ ] Select existing task
- [ ] Click "Edit" button
- [ ] Task form modal appears with current values
- [ ] Change one or more fields
- [ ] Submit changes
- [ ] Task list updates with new values
- [ ] **PASS** / **FAIL** — Task edit

### Delete Task
- [ ] Click "Delete" button on existing task
- [ ] Confirmation appears (if applicable)
- [ ] Confirm deletion
- [ ] Task removed from list
- [ ] **PASS** / **FAIL** — Task deletion

### Status Changes
- [ ] Create task with status "TODO"
- [ ] Click to change status to "IN_PROGRESS"
- [ ] Status updated immediately (optimistic update)
- [ ] Change status to "DONE"
- [ ] Status updated
- [ ] Change back to "TODO"
- [ ] Status cycles correctly
- [ ] **PASS** / **FAIL** — Task status changes

### Task Project Isolation
- [ ] Create Project A with 3 tasks (Task A1, A2, A3)
- [ ] Create Project B with 2 tasks (Task B1, B2)
- [ ] Select Project A
- [ ] Task list shows only Task A1, A2, A3
- [ ] Task count: 3
- [ ] Select Project B
- [ ] Task list shows only Task B1, B2
- [ ] Task count: 2
- [ ] Switch back to Project A
- [ ] Original tasks still there (A1, A2, A3)
- [ ] **PASS** / **FAIL** — Task project isolation

---

## 4. Search & Filters

### Search by Title
- [ ] Create 3 tasks: "Build Login", "Add Documentation", "Fix Bug"
- [ ] Type "Login" in search box
- [ ] Only "Build Login" appears
- [ ] Clear search
- [ ] All 3 tasks appear again
- [ ] **PASS** / **FAIL** — Search by title

### Search by Description
- [ ] Create task with title "Task 1" and description "Important update"
- [ ] Create task with title "Task 2" and description "Minor fix"
- [ ] Search for "Important"
- [ ] Only "Task 1" appears
- [ ] Clear search
- [ ] Both tasks appear
- [ ] **PASS** / **FAIL** — Search by description

### Status Filter
- [ ] Create 3 tasks: 1 TODO, 1 IN_PROGRESS, 1 DONE
- [ ] Click Status filter
- [ ] Select "TODO"
- [ ] Only TODO task appears
- [ ] Select "IN_PROGRESS"
- [ ] Only IN_PROGRESS task appears
- [ ] Select "DONE"
- [ ] Only DONE task appears
- [ ] Clear filter
- [ ] All 3 tasks appear
- [ ] **PASS** / **FAIL** — Status filter

### Priority Filter
- [ ] Create 3 tasks: 1 LOW, 1 MEDIUM, 1 HIGH
- [ ] Click Priority filter
- [ ] Select "HIGH"
- [ ] Only HIGH priority task appears
- [ ] Select "LOW"
- [ ] Only LOW priority task appears
- [ ] Clear filter
- [ ] All 3 tasks appear
- [ ] **PASS** / **FAIL** — Priority filter

### Due Date Filter
- [ ] Create tasks with various due dates (overdue, today, future)
- [ ] Click Due Date filter
- [ ] Select "OVERDUE"
- [ ] Only overdue tasks appear
- [ ] Select "TODAY"
- [ ] Only today's tasks appear
- [ ] Select "NEXT_7_DAYS"
- [ ] Only tasks due within 7 days appear
- [ ] Select "ALL"
- [ ] All tasks appear
- [ ] **PASS** / **FAIL** — Due date filter

### Combined Filters
- [ ] Create 5 tasks with different status/priority/due date combinations
- [ ] Apply Status filter = "TODO"
- [ ] Apply Priority filter = "HIGH"
- [ ] Only tasks matching BOTH filters appear (AND logic)
- [ ] Add Due Date filter = "TODAY"
- [ ] Only tasks matching ALL three filters appear
- [ ] Clear all filters
- [ ] All tasks appear
- [ ] **PASS** / **FAIL** — Combined filters (AND logic)

### Search with Filters
- [ ] Create 3 tasks: "Login Page" (HIGH), "Logout" (LOW), "Login API" (MEDIUM)
- [ ] Search for "Login"
- [ ] All 3 matching tasks appear
- [ ] Apply Priority filter = "HIGH"
- [ ] Only "Login Page" (HIGH) appears
- [ ] Clear search
- [ ] Only "Login Page" (HIGH) remains
- [ ] **PASS** / **FAIL** — Search + filters work together

---

## 5. Notifications

### WebSocket Connection
- [ ] Login successfully
- [ ] Check WebSocket status in sidebar
- [ ] Status shows "✓ Connected"
- [ ] Status stays connected during app use
- [ ] **PASS** / **FAIL** — WebSocket connection

### Overdue Task Notification
- [ ] Create task with due date in past (yesterday)
- [ ] Wait up to 5 minutes for notification check
- [ ] Notification appears: "Task X is overdue"
- [ ] Notification panel shows notification
- [ ] **PASS** / **FAIL** — Overdue notification received

### Due Soon Notification
- [ ] Create task with due date 2 days from now
- [ ] Wait up to 5 minutes for notification check
- [ ] Notification appears: "Task X due in 2 days"
- [ ] Notification panel shows notification
- [ ] **PASS** / **FAIL** — Due soon notification received

### Dismiss Notification
- [ ] Create overdue task (force notification if needed)
- [ ] Notification appears in panel
- [ ] Click dismiss/acknowledge button
- [ ] Notification disappears from panel
- [ ] **PASS** / **FAIL** — Dismiss notification

### Notification Isolation
- [ ] Login as User A
- [ ] Create overdue task in User A
- [ ] Notification appears for User A
- [ ] Logout
- [ ] Login as User B
- [ ] User A's notification does NOT appear for User B
- [ ] **PASS** / **FAIL** — Notification isolation

---

## 6. Responsive Design

### Mobile Layout (320px - 640px)

#### Header
- [ ] Hamburger menu button (☰) visible
- [ ] Page title "Personal To-Do Manager" fully readable
- [ ] No overlap between hamburger and title
- [ ] No horizontal scrolling
- [ ] **PASS** / **FAIL** — Mobile header layout

#### Sidebar/Navigation
- [ ] Sidebar hidden by default
- [ ] Click hamburger button
- [ ] Sidebar slides in from left
- [ ] Semi-transparent overlay appears
- [ ] Click overlay
- [ ] Sidebar closes
- [ ] Click hamburger again
- [ ] Sidebar reopens and closes correctly
- [ ] Click project in sidebar
- [ ] Sidebar auto-closes
- [ ] **PASS** / **FAIL** — Mobile navigation toggle

#### Task List
- [ ] Tasks display in single column
- [ ] Task cards fit within viewport width
- [ ] No horizontal scrolling
- [ ] All buttons clickable (44px+ target size)
- [ ] Search box usable
- [ ] Filter buttons accessible
- [ ] **PASS** / **FAIL** — Mobile task list layout

#### Forms & Modals
- [ ] Create task modal appears full-width
- [ ] Form fields stack vertically
- [ ] Input fields large enough for touch
- [ ] Buttons clearly clickable
- [ ] No horizontal scrolling in modal
- [ ] Close button easily accessible
- [ ] **PASS** / **FAIL** — Mobile forms & modals

#### Spacing & Typography
- [ ] Text readable (not too small)
- [ ] Spacing comfortable for touch interaction
- [ ] No cramped elements
- [ ] Padding/margins appropriate
- [ ] **PASS** / **FAIL** — Mobile spacing & typography

### Tablet Layout (640px - 1024px)

#### Layout
- [ ] Sidebar visible but narrower than desktop
- [ ] Main content takes appropriate space
- [ ] All elements properly proportioned
- [ ] No horizontal scrolling
- [ ] **PASS** / **FAIL** — Tablet layout

#### Navigation
- [ ] Hamburger menu hidden or not needed
- [ ] Sidebar always visible
- [ ] Project selection works smoothly
- [ ] **PASS** / **FAIL** — Tablet navigation

#### Task List & Forms
- [ ] Task cards display well in available space
- [ ] Two-column layout if applicable
- [ ] Forms properly sized
- [ ] All interactive elements accessible
- [ ] **PASS** / **FAIL** — Tablet task display

#### Overall
- [ ] No responsive design issues
- [ ] Breakpoint transition smooth
- [ ] All features accessible
- [ ] **PASS** / **FAIL** — Tablet responsive design

### Desktop Layout (1024px+)

#### Layout
- [ ] Full sidebar visible on left (280px)
- [ ] Main content takes full remaining width
- [ ] Header spans full width
- [ ] All elements properly aligned
- [ ] **PASS** / **FAIL** — Desktop layout

#### Navigation
- [ ] Hamburger menu hidden
- [ ] Sidebar always visible
- [ ] Project list easily accessible
- [ ] User profile visible
- [ ] Logout button easily accessible
- [ ] **PASS** / **FAIL** — Desktop navigation

#### Task List
- [ ] Task cards display with good spacing
- [ ] Multiple cards visible without scrolling (if applicable)
- [ ] Search and filters easily accessible
- [ ] All buttons clearly visible and clickable
- [ ] **PASS** / **FAIL** — Desktop task display

#### Overall
- [ ] No responsive design issues
- [ ] All features work correctly
- [ ] Layout makes good use of screen real estate
- [ ] Professional appearance
- [ ] **PASS** / **FAIL** — Desktop responsive design

---

## 7. Cross-Cutting Concerns

### Performance
- [ ] App loads quickly (< 3 seconds)
- [ ] Search responds quickly (debounced)
- [ ] Filter changes instant
- [ ] Task updates instant (optimistic)
- [ ] No lag during typing in search
- [ ] **PASS** / **FAIL** — Performance acceptable

### Error Handling
- [ ] Create project with empty name
- [ ] Error message displays
- [ ] Try to create duplicate project name (if applicable)
- [ ] Appropriate error message shown
- [ ] API errors handled gracefully
- [ ] **PASS** / **FAIL** — Error handling

### Accessibility
- [ ] Keyboard navigation works (Tab through elements)
- [ ] All buttons focusable with keyboard
- [ ] Focus state clearly visible
- [ ] Hover states visible
- [ ] Active states clearly indicated
- [ ] Screen reader compatible (if tested)
- [ ] **PASS** / **FAIL** — Accessibility

### Console Errors
- [ ] Open browser Developer Tools (F12)
- [ ] Go to Console tab
- [ ] Perform all actions from checklist
- [ ] No JavaScript errors in console
- [ ] No warning messages unrelated to code quality
- [ ] **PASS** / **FAIL** — No console errors

---

## Summary

**Total Tests**: _____ / _____  
**Passed**: _____ / _____  
**Failed**: _____ / _____  

### Overall Status
- [ ] **✅ PASS** — Phase 6 Validation Complete
- [ ] **❌ FAIL** — Issues found (see notes below)

### Notes & Issues Found

_Use this section to document any bugs, issues, or unexpected behavior found during testing:_

```
[Document any failures or issues here]
```

### Recommendations for Phase 7

_Based on validation results:_

```
[Notes for next phase]
```

---

**Validation Completed By**: _____________  
**Date**: _____________  
**Time Spent**: _____________
