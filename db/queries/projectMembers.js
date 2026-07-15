import db from "#db/client";

export async function addProjectMember(project_id, user_id) {
  const sql = `
    INSERT INTO project_members (project_id, user_id)
    VALUES ($1, $2)
    RETURNING *;
  `;

  const {
    rows: [member],
  } = await db.query(sql, [project_id, user_id]);

  return member;
}

export async function getProjectMembers(project_id) {
  const sql = `
    SELECT pm.*, u.name, u.email
    FROM project_members pm
    JOIN users u
      ON pm.user_id = u.id
    WHERE pm.project_id = $1;
  `;

  const { rows } = await db.query(sql, [project_id]);

  return rows;
}

export async function getProjectMember(project_id, user_id) {
  const sql = `
    SELECT *
    FROM project_members
    WHERE project_id = $1
      AND user_id = $2;
  `;

  const {
    rows: [member],
  } = await db.query(sql, [project_id, user_id]);

  return member;
}

export async function removeProjectMember(project_id, user_id) {
  const sql = `
    DELETE FROM project_members
    WHERE project_id = $1
      AND user_id = $2
    RETURNING *;
  `;

  const {
    rows: [member],
  } = await db.query(sql, [project_id, user_id]);

  return member;
}