import { extensionLogger } from '../../utils/extensionLogger.js';

/**
 * Controller for handling extension logging API requests
 */

// Unified logging endpoint
export const logExtensionData = async (req, res) => {
  try {
    const logType = req.params.logType;
    const { userId, message, metadata } = req.body;
    
    if (!logType || !message) {
      return res.status(400).json({ success: false, message: 'Log type and message are required' });
    }

    // Validate log type
    const validTypes = ['info', 'warning', 'error'];
    if (!validTypes.includes(logType)) {
      return res.status(400).json({ success: false, message: 'Invalid log type. Use: info, warning, or error' });
    }
    
    // Map logType to the appropriate level for the logger
    const level = logType === 'warning' ? 'warn' : logType;
    
    // Add the log entry
    extensionLogger.log(level, message, {
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString(),
      ...(metadata || {})
    });
    
    return res.status(200).json({ success: true, message: 'Log entry created successfully' });
  } catch (error) {
    console.error('Error logging extension data:', error);
    return res.status(500).json({ success: false, message: 'Failed to log extension data' });
  }
};
