import db from "#db/client";

export async function createWorkspace(name, created_by) {
  const sql = `
    INSERT INTO workspaces (name, created_by)
    VALUES ($1, $2)
    RETURNING *;
  `;

  const {
    rows: [workspace],
  } = await db.query(sql, [name, created_by]);

  return workspace;
}

export async function getWorkspaces() {
  const sql = `
    SELECT * FROM workspaces;
  `;

  const { rows } = await db.query(sql);

  return rows;
}

export async function getWorkspaceById(id) {
  const sql = `
    SELECT * FROM workspaces
    WHERE id = $1;
  `;

  const {
    rows: [workspace],
  } = await db.query(sql, [id]);

  return workspace;
}

export async function getWorkspacesByUser(user_id) {
  const sql = `
    SELECT w.*
    FROM workspaces w
    JOIN workspace_members wm
      ON w.id = wm.workspace_id
    WHERE wm.user_id = $1;
  `;

  const { rows } = await db.query(sql, [user_id]);

  return rows;
}

export async function updateWorkspace(id, name) {
  const sql = `
    UPDATE workspaces
    SET name = $2,
        updated_at = now()
    WHERE id = $1
    RETURNING *;
  `;

  const {
    rows: [workspace],
  } = await db.query(sql, [id, name]);

  return workspace;
}

export async function deleteWorkspace(id) {
  const sql = `
    DELETE FROM workspaces
    WHERE id = $1
    RETURNING *;
  `;

  const {
    rows: [workspace],
  } = await db.query(sql, [id]);

  return workspace;
}