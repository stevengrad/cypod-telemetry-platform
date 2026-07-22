// cypod-telemetry
import { Router } from 'express';
import { db } from '../db/mysql.js';
import { requireAuth } from '../middleware/auth.js';
import { searchInventory } from '../services/inventoryService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { catalogQuerySchema } from '../validation/schemas.js';

export const catalogRouter = Router();
catalogRouter.use(requireAuth);

catalogRouter.get('/', asyncHandler(async (req, res) => {
  const query = catalogQuerySchema.parse(req.query);
  const result = await searchInventory(db, req.user.id, query);
  res.json(result);
}));
