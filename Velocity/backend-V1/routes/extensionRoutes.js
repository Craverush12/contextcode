import express from 'express';
import { logExtensionData } from '../controllers/extensionController/extensionLogController.js';

const router = express.Router();

/**
 * @route   POST /api/extension/logs/:logType
 * @desc    Log extension data (info, warning, error)
 * @access  Public
 */
router.post('/logs/:logType', logExtensionData);

export default router; 