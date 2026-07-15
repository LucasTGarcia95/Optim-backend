import db from "#db/client";

export async function createEpic(project_id, name) {
  const sql = `
    INSERT INTO epics (project_id, name)
    VALUES ($1, $2)
    RETURNING *;
  `;

  const {
    rows: [epic],
  } = await db.query(sql, [project_id, name]);

  return epic;
}

export async function getEpics() {
  const sql = `
    SELECT * FROM epics;
  `;

  const { rows } = await db.query(sql);

  return rows;
}

export async function getEpicById(id) {
  const sql = `
    SELECT * FROM epics
    WHERE id = $1;
  `;

  const {
    rows: [epic],
  } = await db.query(sql, [id]);

  return epic;
}

export async function getEpicsByProject(project_id) {
  const sql = `
    SELECT *
    FROM epics
    WHERE project_id = $1;
  `;

  const { rows } = await db.query(sql, [project_id]);

  return rows;
}

export async function updateEpic(id, name) {
  const sql = `
    UPDATE epics
    SET name = $2,
        updated_at = now()
    WHERE id = $1
    RETURNING *;
  `;

  const {
    rows: [epic],
  } = await db.query(sql, [id, name]);

  return epic;
}

export async function deleteEpic(id) {
  const sql = `
    DELETE FROM epics
    WHERE id = $1
    RETURNING *;
  `;

  const {
    rows: [epic],
  } = await db.query(sql, [id]);

  return epic;
}