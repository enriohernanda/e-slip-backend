import express from 'express';
import * as itemController from '../controllers/itemController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

export const itemRoutes = express.Router();

itemRoutes.get('/', authMiddleware, itemController.getItems);
