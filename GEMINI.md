# COP4331 Dashboard Project

This project is a dashboard for class and task management.

## Fixed Issues

- **TypeScript Error:** Fixed "Property 'dueDate' does not exist on type 'Task'" in `ProfessorDashboard.tsx` by adding `dueDate?: string | null;` to the `Task` interface.

## Features Implemented

- **Personalized Student Tasks:** Students adding tasks to a class now create personal tasks only.
- **Professor Class-Wide Tasks:**
    - When a professor creates a task for a class or group, the system creates a **Master Task** and distributes individual copies to all current students/members.
    - **Automatic Assignment:** When a student enrolls in a class, they automatically receive copies of all existing Master Tasks for that class.
    - **Consolidated View:** Professor dashboards now only show the Master Tasks, preventing duplicates.
- **Soft Delete (Hide) & Restore:**
    - Added `isHidden` field to `Task` model for soft-deletion.
    - Implemented `PATCH /api/tasks/:id/toggle-hide` endpoint.
    - **Frontend:** Completed tasks now show a "Delete" button (trash icon) to hide them. A new **Restore** button in the navbar opens a modal allowing students to view and restore hidden tasks.


