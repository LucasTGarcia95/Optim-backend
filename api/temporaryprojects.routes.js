import { Router } from "express";
import db from "#db/client";
import requireUser from "#middleware/requireUser";
import { getProjectById, getProjectMembership } from "#db/queries/projects";

const router = Router();
router.use(requireUser);

const DEFAULT_COLUMNS = ["To Do", "In Progress", "In Review", "Done"];

async function getWorkspaceMembership(workspaceId, userId) {
  const {
    rows: [m],
  } = await db.query(
    "SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
    [workspaceId, userId],
  );
  return m || null;
}

async function getProjectAccess(projectId, userId) {
  const project = await getProjectById(projectId);
  if (!project) return null;
  const isMember = await getProjectMembership(projectId, userId);
  const isLead = project.owner_id === userId;
  return { project, isMember: isMember || isLead, isLead };
}

router.post("/", async (req, res) => {
  const {
    workspaceId,
    name,
    status = "planning",
    startDate = null,
    endDate = null,
  } = req.body;
  if (!workspaceId || !name) {
    return res.status(400).json({ error: "workspaceId and name are required" });
  }

  const membership = await getWorkspaceMembership(workspaceId, req.user.id);
  if (!membership)
    return res
      .status(403)
      .json({ error: "You're not a member of that workspace" });

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const {
      rows: [project],
    } = await client.query(
      `INSERT INTO projects (workspace_id, owner_id, name, status, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [workspaceId, req.user.id, name, status, startDate, endDate],
    );

    await client.query(
      "INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)",
      [project.id, req.user.id],
    );

    const {
      rows: [board],
    } = await client.query(
      "INSERT INTO boards (project_id, name) VALUES ($1, 'Main Board') RETURNING id, name",
      [project.id],
    );

    for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
      await client.query(
        "INSERT INTO columns (board_id, name, position) VALUES ($1, $2, $3)",
        [board.id, DEFAULT_COLUMNS[i], i + 1],
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ project: { ...project, board } });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

router.get("/", async (req, res) => {
  const { workspace_id: workspaceId } = req.query;
  if (!workspaceId)
    return res
      .status(400)
      .json({ error: "workspace_id query param is required" });

  const membership = await getWorkspaceMembership(workspaceId, req.user.id);
  if (!membership)
    return res
      .status(403)
      .json({ error: "You're not a member of that workspace" });

  const { rows: projects } = await db.query(
    `SELECT p.*,
            COUNT(t.id) AS open_task_count
     FROM projects p
     LEFT JOIN tasks t ON t.project_id = p.id
     WHERE p.workspace_id = $1
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
    [workspaceId],
  );
  res.json({ projects });
});

router.get("/:id", async (req, res) => {
  const access = await getProjectAccess(req.params.id, req.user.id);
  if (!access) return res.status(404).json({ error: "Project not found" });
  if (!access.isMember)
    return res
      .status(403)
      .json({ error: "You're not a member of this project" });
  res.json({
    project: { ...access.project, myRole: access.isLead ? "lead" : "member" },
  });
});

router.patch("/:id", async (req, res) => {
  const access = await getProjectAccess(req.params.id, req.user.id);
  if (!access) return res.status(404).json({ error: "Project not found" });
  if (!access.isLead)
    return res
      .status(403)
      .json({ error: "Only the project lead can update this project" });

  const { name, status, startDate, endDate } = req.body;
  const {
    rows: [updated],
  } = await db.query(
    `UPDATE projects
     SET name = COALESCE($1, name), status = COALESCE($2, status),
         start_date = COALESCE($3, start_date), end_date = COALESCE($4, end_date),
         updated_at = now()
     WHERE id = $5 RETURNING *`,
    [name, status, startDate, endDate, access.project.id],
  );
  res.json({ project: updated });
});

router.delete("/:id", async (req, res) => {
  const access = await getProjectAccess(req.params.id, req.user.id);
  if (!access) return res.status(404).json({ error: "Project not found" });
  if (!access.isLead)
    return res
      .status(403)
      .json({ error: "Only the project lead can delete this project" });

  await db.query("DELETE FROM projects WHERE id = $1", [access.project.id]);
  res.status(204).send();
});

router.get("/:id/board", async (req, res) => {
  const access = await getProjectAccess(req.params.id, req.user.id);
  if (!access) return res.status(404).json({ error: "Project not found" });
  if (!access.isMember)
    return res
      .status(403)
      .json({ error: "You're not a member of this project" });

  let {
    rows: [board],
  } = await db.query("SELECT id, name FROM boards WHERE project_id = $1", [
    access.project.id,
  ]);

  if (!board) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      ({
        rows: [board],
      } = await client.query(
        "INSERT INTO boards (project_id, name) VALUES ($1, 'Main Board') RETURNING id, name",
        [access.project.id],
      ));
      for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
        await client.query(
          "INSERT INTO columns (board_id, name, position) VALUES ($1, $2, $3)",
          [board.id, DEFAULT_COLUMNS[i], i + 1],
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  const { rows: columns } = await db.query(
    "SELECT id, name, position FROM columns WHERE board_id = $1 ORDER BY position ASC",
    [board.id],
  );

  const { rows: tasks } = await db.query(
    `SELECT t.id, t.column_id, t.task_number, t.title, t.description, t.type,
          t.priority, t.due_date, t.position, t.assignee_id,
          u.name AS assignee_name, t.created_at, t.updated_at
   FROM tasks t
   LEFT JOIN users u ON u.id = t.assignee_id
   WHERE t.project_id = $1
   ORDER BY t.column_id, t.position ASC`,
    [access.project.id],
  );

  const columnsWithTasks = columns.map((col) => ({
    ...col,
    tasks: tasks.filter((t) => t.column_id === col.id),
  }));

  res.json({ board: { ...board, columns: columnsWithTasks } });
});

router.post("/:id/members", async (req, res) => {
  const access = await getProjectAccess(req.params.id, req.user.id);
  if (!access) return res.status(404).json({ error: "Project not found" });
  if (!access.isLead)
    return res
      .status(403)
      .json({ error: "Only the project lead can add members" });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });

  const {
    rows: [user],
  } = await db.query(
    `SELECT u.id, u.name, u.email
     FROM users u
     JOIN workspace_members wm ON wm.user_id = u.id
     WHERE u.email = $1 AND wm.workspace_id = $2`,
    [email.toLowerCase(), access.project.workspace_id],
  );
  if (!user) {
    return res.status(404).json({
      error: "That person isn't a member of this project's workspace yet",
    });
  }

  try {
    await db.query(
      "INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)",
      [access.project.id, user.id],
    );
  } catch (err) {
    if (err.code === "23505")
      return res
        .status(409)
        .json({ error: "That person is already on this project" });
    throw err;
  }

  res
    .status(201)
    .json({ member: { id: user.id, name: user.name, email: user.email } });
});

router.delete("/:id/members/:userId", async (req, res) => {
  const access = await getProjectAccess(req.params.id, req.user.id);
  if (!access) return res.status(404).json({ error: "Project not found" });
  if (!access.isLead)
    return res
      .status(403)
      .json({ error: "Only the project lead can remove members" });

  if (Number(req.params.userId) === access.project.owner_id) {
    return res.status(400).json({ error: "Can't remove the project owner" });
  }

  await db.query(
    "DELETE FROM project_members WHERE project_id = $1 AND user_id = $2",
    [access.project.id, req.params.userId],
  );
  res.status(204).send();
});

export default router;
