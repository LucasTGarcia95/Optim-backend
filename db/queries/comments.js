import db from "#db/client";

export async function createComment(taskId, authorID, body) {
  const {
    rows: [comment],
  } = await db.query(
    "INSERT INTO comments (task-id, author_id, body) VALUES ($1, $2, $3) RETURNING *",
    [taskId, authorID, body],
  );

  await db.query(
    "INSERT INTO activity_log (task_id, user_id, action, details) VALUES ($1, $2, 'commented', $3)",
    [taskId, authorID, JSON.stringify({ commentId: comment.id })],
  );

  return comment;
}

export async function getCommentsForTask(taskId) {
  const sql = `
        SELECT c.id, c.task_id, c.author_id, c.body, c.created_at, c.updated_at, u.name AS author_name
        FROM comments c
        JOIN users u ON u.id = c.author_id
        WHERE c.task_id = $1
        ORDER BY c.created_at ASC
     `;
  const { rows } = await db.query(sql, [taskId]);
  return rows;
}

export async function getCommentById(id) {
  const {
    rows: [comment],
  } = await db.query("SELECT * FROM comments WHERE id = $1", [id]);
  return comment;
}

export async function deleteComment(id) {
  await db.query("DELETE FROM comments WHERE id = $1", [id]);
}

export async function getTaskProjectId(taskId) {
  const {
    rows: [task],
  } = await db.query("SELECT project_id FROM tasks WHERE id = $1", [taskId]);
  return task?.project_id;
}
