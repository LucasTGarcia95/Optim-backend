import db from "#db/client";

export async function createTask(
  project_id, epic_id, assigned_to, title, description, status, priority, due_date, blocked_by_task_id,
) {
  const sql = `
    INSERT INTO tasks (
      project_id, epic_id, assigned_to, title, description, status, priority, due_date, blocked_by_task_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;

  const {
    rows: [task],
  } = await db.query(sql, [
    project_id, epic_id, assigned_to, title, description, status, priority, due_date, blocked_by_task_id,
  ]);

  return task;
}

export async function getTasks() {
  const sql = `SELECT * FROM tasks;`;

  const { rows } = await db.query(sql);

  return rows;
}

export async function getTaskById(id) {
  const sql = `
    SELECT *
    FROM tasks
    WHERE id = $1;
  `;

  const {
    rows: [task],
  } = await db.query(sql, [id]);

  return task;
}

export async function getTasksByProject(project_id) {
  const sql = `
    SELECT *
    FROM tasks
    WHERE project_id = $1;
  `;

  const { rows } = await db.query(sql, [project_id]);

  return rows;
}

export async function getTasksByUser(user_id) {
  const sql = `
    SELECT *
    FROM tasks
    WHERE assigned_to = $1;
  `;

  const { rows } = await db.query(sql, [user_id]);

  return rows;
}

export async function updateTask(
  id, epic_id, assigned_to, title, description, status, priority, due_date, blocked_by_task_id,
) {
  const sql = `
    UPDATE tasks
    SET epic_id = $2, assigned_to = $3, title = $4, description = $5,
        status = $6, priority = $7, due_date = $8, blocked_by_task_id = $9,
        updated_at = now()
    WHERE id = $1
    RETURNING *;
  `;

  const {
    rows: [task],
  } = await db.query(sql, [
    id, epic_id, assigned_to, title, description, status, priority, due_date, blocked_by_task_id,
  ]);

  return task;
}

export async function deleteTask(id) {
  const result = await db.query(
    `DELETE FROM tasks WHERE id = $1 RETURNING *`,
    [id],
  );

  return result.rows[0];
}