import db from "#db/client";

export async function createTaskUpdate(task_id, user_id, update_text) {
  const sql = `
    INSERT INTO task_updates (task_id, user_id, update_text)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const {
    rows: [taskUpdate],
  } = await db.query(sql, [task_id, user_id, update_text]);

  return taskUpdate;
}

export async function getTaskUpdates() {
  const sql = `
    SELECT * FROM task_updates;
  `;

  const { rows } = await db.query(sql);

  return rows;
}

export async function getTaskUpdatesByTask(task_id) {
  const sql = `
    SELECT tu.*, u.name, u.email
    FROM task_updates tu
    JOIN users u
      ON tu.user_id = u.id
    WHERE tu.task_id = $1
    ORDER BY tu.created_at DESC;
  `;

  const { rows } = await db.query(sql, [task_id]);

  return rows;
}

export async function getTaskUpdatesByUser(user_id) {
  const sql = `
    SELECT tu.*, t.title
    FROM task_updates tu
    JOIN tasks t
      ON tu.task_id = t.id
    WHERE tu.user_id = $1
    ORDER BY tu.created_at DESC;
  `;

  const { rows } = await db.query(sql, [user_id]);

  return rows;
}

export async function getTaskUpdateById(id) {
  const sql = `
    SELECT *
    FROM task_updates
    WHERE id = $1;
  `;

  const {
    rows: [taskUpdate],
  } = await db.query(sql, [id]);

  return taskUpdate;
}

export async function deleteTaskUpdate(id) {
  const sql = `
    DELETE FROM task_updates
    WHERE id = $1
    RETURNING *;
  `;

  const {
    rows: [taskUpdate],
  } = await db.query(sql, [id]);

  return taskUpdate;
}