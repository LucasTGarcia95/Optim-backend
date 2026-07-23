import db from "#db/client";

const DEFAULT_COLUMNS = ["To Do", "In Progress", "Done"];

/**
 * Creates a board and its default columns for a brand-new project.
 * Ticket 3: "Creating a project also creates one board with 3-4 default
 * columns... in the same transaction." NOTE: db/client.js is a single
 * pg.Client, not a Pool, so there's no safe way to wrap this in a real
 * BEGIN/COMMIT here — see the "Known Limitations" note already in the
 * README about this. These run sequentially instead.
 */
export async function createBoardWithDefaultColumns(projectId) {
  const {
    rows: [board],
  } = await db.query(
    "INSERT INTO boards (project_id) VALUES ($1) RETURNING *",
    [projectId],
  );

  const columns = [];
  for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
    const isDone = i === DEFAULT_COLUMNS.length - 1;
    const {
      rows: [column],
    } = await db.query(
      "INSERT INTO columns (board_id, name, position, is_done_column) VALUES ($1, $2, $3, $4) RETURNING *",
      [board.id, DEFAULT_COLUMNS[i], i, isDone],
    );
    columns.push(column);
  }
  return { ...board, columns };
}

export async function getBoardForProject(projectId) {
  const {
    rows: [board],
  } = await db.query("SELECT * FROM boards WHERE project_id = $1", [projectId]);
  return board;
}

export async function getColumnsForBoard(boardId) {
  const { rows } = await db.query(
    "SELECT * FROM columns WHERE board_id = $1 ORDER BY position ASC",
    [boardId],
  );
  return rows;
}
