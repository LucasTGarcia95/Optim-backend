import { Router } from "express";
import requireUser from "#middleware/requireUser";
import db from "#db/client";

const router = Router();
router.use(requireUser);

async function getBoardContext(boardId, userId) {
  const {
    rows: [board],
  } = await db.query("SELECT id, project_id FROM boards WHERE id = $1", [
    boardId,
  ]);
  if (!board) return null;

  const {
    rows: [project],
  } = await db.query("SELECT owner_id FROM projects WHERE id = $1", [
    board.project_id,
  ]);

  const {
    rows: [membership],
  } = await db.query(
    "SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2",
    [board.project_id, userId],
  );

  const isLead = project?.owner_id === userId;

  return {
    projectId: board.project_id,
    boardId: board.id,
    isMember: !!membership || isLead,
    isLead,
  };
}

async function getColumnContext(columnId, userId) {
  const {
    rows: [column],
  } = await db.query("SELECT id, board_id FROM columns WHERE id = $1", [
    columnId,
  ]);
  if (!column) return null;

  const context = await getBoardContext(column.board_id, userId);
  return context && { ...context, columnId: column.id };
}

router.post("/boards/:id/columns", async (req, res) => {
  const boardId = req.params.id;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const context = await getBoardContext(boardId, req.user.id);
  if (!context) return res.status(404).json({ error: "Board not found" });
  if (!context.isMember) {
    return res
      .status(403)
      .json({ error: "You don't have access to this project" });
  }

  const {
    rows: [{ next_position }],
  } = await db.query(
    "SELECT COALESCE(MAX(position), 0) + 1 AS next_position FROM columns WHERE board_id = $1",
    [boardId],
  );

  const {
    rows: [column],
  } = await db.query(
    "INSERT INTO columns (board_id, name, position) VALUES ($1, $2, $3) RETURNING id, board_id, name, position",
    [boardId, name, next_position],
  );

  res.status(201).json({ column });
});

router.patch("/columns/:id", async (req, res) => {
  const columnId = req.params.id;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const context = await getColumnContext(columnId, req.user.id);
  if (!context) return res.status(404).json({ error: "Column not found" });
  if (!context.isMember) {
    return res
      .status(403)
      .json({ error: "You don't have access to this project" });
  }

  const {
    rows: [column],
  } = await db.query(
    "UPDATE columns SET name = $1 WHERE id = $2 RETURNING id, board_id, name, position",
    [name, columnId],
  );

  res.json({ column });
});

router.patch("/boards/:id/columns/reorder", async (req, res) => {
  const boardId = req.params.id;
  const { orderedColumnIds } = req.body;
  if (!Array.isArray(orderedColumnIds) || orderedColumnIds.length === 0) {
    return res
      .status(400)
      .json({ error: "orderedColumnIds must be a non-empty array" });
  }

  const context = await getBoardContext(boardId, req.user.id);
  if (!context) return res.status(404).json({ error: "Board not found" });
  if (!context.isMember) {
    return res
      .status(403)
      .json({ error: "You don't have access to this project" });
  }

  const { rows: existing } = await db.query(
    "SELECT id FROM columns WHERE board_id = $1",
    [boardId],
  );
  const existingIds = new Set(existing.map((c) => c.id));
  const payloadIds = new Set(orderedColumnIds);
  const sameSet =
    existingIds.size === payloadIds.size &&
    [...existingIds].every((id) => payloadIds.has(id));

  if (!sameSet) {
    return res.status(400).json({
      error:
        "orderedColumnIds must contain exactly this board's current columns",
    });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < orderedColumnIds.length; i++) {
      await client.query(
        "UPDATE columns SET position = $1 WHERE id = $2 AND board_id = $3",
        [i + 1, orderedColumnIds[i], boardId],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const { rows: columns } = await db.query(
    "SELECT id, board_id, name, position FROM columns WHERE board_id = $1 ORDER BY position ASC",
    [boardId],
  );

  res.json({ columns });
});

router.delete("/columns/:id", async (req, res) => {
  const columnId = req.params.id;

  const context = await getColumnContext(columnId, req.user.id);
  if (!context) return res.status(404).json({ error: "Column not found" });
  if (!context.isMember) {
    return res
      .status(403)
      .json({ error: "You don't have access to this project" });
  }
  if (!context.isLead) {
    return res
      .status(403)
      .json({ error: "Only the project lead can delete columns" });
  }

  const {
    rows: [{ count }],
  } = await db.query("SELECT COUNT(*) FROM tasks WHERE column_id = $1", [
    columnId,
  ]);
  if (Number(count) > 0) {
    return res.status(409).json({
      error:
        "This column still has tasks in it. Move them to another column before deleting.",
    });
  }

  await db.query("DELETE FROM columns WHERE id = $1", [columnId]);
  res.status(204).send();
});

export default router;
