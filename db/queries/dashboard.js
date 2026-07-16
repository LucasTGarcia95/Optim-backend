import db from "#db/client";

export async function getUserActiveTasks(user_id) {
  const sql = `
    SELECT *
    FROM tasks
    WHERE assigned_to = $1
      AND status != 'completed';
  `;

  const { rows } = await db.query(sql, [user_id]);

  return rows;
}

export async function getUserRecentUpdates(user_id) {
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

export async function getProjectTasks(project_id) {
  const sql = `
    SELECT t.*, u.name AS assigned_user
    FROM tasks t
    LEFT JOIN users u
      ON t.assigned_to = u.id
    WHERE t.project_id = $1;
  `;

  const { rows } = await db.query(sql, [project_id]);

  return rows;
}

export async function getBlockedTasks(project_id) {
  const sql = `
    SELECT *
    FROM tasks
    WHERE project_id = $1
      AND status = 'blocked';
  `;

  const { rows } = await db.query(sql, [project_id]);

  return rows;
}

export async function getProjectOverview(project_id) {
  const sql = `
    SELECT 
      p.*,
      COUNT(t.id) AS task_count
    FROM projects p
    LEFT JOIN tasks t
      ON p.id = t.project_id
    WHERE p.id = $1
    GROUP BY p.id;
  `;

  const {
    rows: [project],
  } = await db.query(sql, [project_id]);

  return project;
}