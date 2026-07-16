import { Router } from "express";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import requireUser from "#middleware/requireUser";
import { OAuth2Client } from "google-auth-library";
import {
  createUser,
  getUserByUsernameAndPassword,
  getUserById,
  getUserByEmail,
} from "#db/queries/users";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const router = Router();

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
  };
}

router.post("/register", async (req, res) => {
  const { username, password, name, email } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "username and password are required" });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: "password must be at least 8 characters" });
  }

  try {
    const user = await createUser(username, password, { name, email });
    const token = signToken(user.id);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ error: "That username or email is already taken" });
    }
    throw err;
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "username and password are required" });
  }

  const user = await getUserByUsernameAndPassword(username, password);
  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = signToken(user.id);
  res.json({ token, user: publicUser(user) });
});

router.get("/me", requireUser, async (req, res) => {
  const user = await getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

router.post("/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: "credential is required" });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: "Invalid Google credential" });
  }

  const { email, name } = payload;
  let user = await getUserByEmail(email.toLowerCase());

  if (!user) {
    const username = email.split("@")[0];
    const randomPassword = crypto.randomBytes(32).toString("hex");
    user = await createUser(username, randomPassword, {
      name,
      email: email.toLowerCase(),
    });
  }

  const token = signToken(user.id);
  res.json({ token, user: publicUser(user) });
});

export default router;
