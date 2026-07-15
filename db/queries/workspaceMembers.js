import db from "#db/client";

export async function addWorkspaceMember(workspace_id, user_id, role) {
  const sql = `
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const {
    rows: [member],
  } = await db.query(sql, [workspace_id, user_id, role]);

  return member;
}

export async function getWorkspaceMembers(workspace_id) {
  const sql = `
    SELECT wm.*, u.name, u.email
    FROM workspace_members wm
    JOIN users u
      ON wm.user_id = u.id
    WHERE wm.workspace_id = $1;
  `;

  const { rows } = await db.query(sql, [workspace_id]);

  return rows;
}

export async function getWorkspaceMember(workspace_id, user_id) {
  const sql = `
    SELECT *
    FROM workspace_members
    WHERE workspace_id = $1
      AND user_id = $2;
  `;

  const {
    rows: [member],
  } = await db.query(sql, [workspace_id, user_id]);

  return member;
}

export async function updateWorkspaceMemberRole(
  workspace_id, user_id, role,
) {
  const sql = `
    UPDATE workspace_members
    SET role = $3
    WHERE workspace_id = $1
      AND user_id = $2
    RETURNING *;
  `;

  const {
    rows: [member],
  } = await db.query(sql, [workspace_id, user_id, role]);

  return member;
}

export async function removeWorkspaceMember(workspace_id, user_id) {
  const sql = `
    DELETE FROM workspace_members
    WHERE workspace_id = $1
      AND user_id = $2
    RETURNING *;
  `;

  const {
    rows: [member],
  } = await db.query(sql, [workspace_id, user_id]);

  return member;
}