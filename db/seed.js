import db from "#db/client";

import { createUser } from "#db/queries/users";
import { createWorkspace } from "#db/queries/workspaces";
import { addWorkspaceMember } from "#db/queries/workspaceMembers";
import { createProject } from "#db/queries/projects";
import { addProjectMember } from "#db/queries/projectMembers";
import { createEpic } from "#db/queries/epics";
import { createTask } from "#db/queries/tasks";
import { createTaskUpdate } from "#db/queries/taskUpdates";

await db.connect();
await seed();
await db.end();

console.log("🌱 Database seeded.");

async function seed() {
  const tyler = await createUser(
    "google-tyler",
    "tyler@example.com",
    "Tyler",
    null,
  );

  const sarah = await createUser(
    "google-sarah",
    "sarah@example.com",
    "Sarah",
    null,
  );

  const mike = await createUser(
    "google-mike",
    "mike@example.com",
    "Mike",
    null,
  );

  const workspace = await createWorkspace(
    "Optim Development Team",
    tyler.id,
  );

  await addWorkspaceMember(workspace.id, tyler.id, "admin");
  await addWorkspaceMember(workspace.id, sarah.id, "manager");
  await addWorkspaceMember(workspace.id, mike.id, "contributor");

  const project = await createProject(
    workspace.id,
    sarah.id,
    "Optim MVP",
    "active",
    "2026-07-15",
    null,
  );

  await addProjectMember(project.id, sarah.id);
  await addProjectMember(project.id, mike.id);
  await addProjectMember(project.id, tyler.id);

  const epic = await createEpic(
    project.id,
    "Authentication System",
  );

  const task = await createTask(
    project.id,
    epic.id,
    mike.id,
    "Implement Google Authentication",
    "Create login flow using Google OAuth.",
    "in_progress",
    "high",
    null,
    null,
  );

  await createTaskUpdate(
    task.id,
    mike.id,
    "Started working on authentication setup.",
  );

  console.log("Seed complete!");
}