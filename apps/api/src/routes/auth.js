// cypod-telemetry
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { db, withTransaction } from '../db/mysql.js';
import { t } from '../i18n/messages.js';
import { provisionInventory } from '../services/inventoryService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loginSchema, registerSchema } from '../validation/schemas.js';

export const authRouter = Router();

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
}

authRouter.post('/register', asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  let user;
  try {
    user = await withTransaction(async (connection) => {
      const [result] = await connection.query(
        'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
        [input.name, input.email, passwordHash],
      );
      const created = { id: result.insertId, name: input.name, email: input.email };
      // note: task accounts receive a large demo inventory so the searchable picker can be reviewed immediately; production would sync this from an asset registry.
      await provisionInventory(connection, created.id, 180, false);
      return created;
    });
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'EMAIL_EXISTS', 'emailExists');
    throw error;
  }
  res.status(201).json({ message: t(req.locale, 'registered'), token: signToken(user), user });
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const [rows] = await db.query('SELECT id, name, email, password_hash AS passwordHash FROM users WHERE email = ? LIMIT 1', [input.email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'invalidCredentials');
  }
  const safeUser = { id: user.id, name: user.name, email: user.email };
  res.json({ message: t(req.locale, 'loggedIn'), token: signToken(safeUser), user: safeUser });
}));
