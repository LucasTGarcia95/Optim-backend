import { Router } from "express";
import requireUser from "#middleware/requireUser";
import { getProjectMembership } from "#db/queries/projects";
import {
  createComment,
  getCommentsForTask,
  getTaskProjectId,
} from "#db/queries/comments";

const router = Router();
router.use(requireUser);

// POST /tasks/:id/comments — add a comment to a task. body: { body }
router.post("/:id/comments", async (req, res) => {
  const projectId = await getTaskProjectId(req.params.id);
  if (!projectId) return res.status(404).json({ error: "Task not found" });

  const membership = await getProjectMembership(projectId, req.user.id);
  if (!membership)
    return res
      .status(403)
      .json({ error: "You're not a member of this project" });

  const { body } = req.body;
  if (!body) return res.status(400).json({ error: "body is required" });

  const comment = await createComment(req.params.id, req.user.id, body);
  res.status(201).json({ comment });
});

// GET /tasks/:id/comments — chronological list, joined with author's name
router.get("/:id/comments", async (req, res) => {
  const projectId = await getTaskProjectId(req.params.id);
  if (!projectId) return res.status(404).json({ error: "Task not found" });

  const membership = await getProjectMembership(projectId, req.user.id);
  if (!membership)
    return res
      .status(403)
      .json({ error: "You're not a member of this project" });

  const comments = await getCommentsForTask(req.params.id);
  res.json({ comments });
});

export default router;
