import { aiService } from '../services/aiService.js';
import { dbService } from '../models/dbService.js';

export const scanContent = async (req, res) => {
  const { text } = req.body;
  const username = req.user ? req.user.username : 'Anonymous';

  if (!text || text.trim() === '') {
    return res.status(400).json({ success: false, message: 'Please provide text or links to analyze.' });
  }

  try {
    const analysis = await aiService.analyzeContent(text, username);
    return res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Scan API error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Scam analysis failed.' });
  }
};

export const getHistory = async (req, res) => {
  try {
    const username = req.user ? req.user.username : (req.query.username || 'Anonymous');
    const history = await dbService.getScanHistory(username);
    
    return res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get history error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve analysis history.' });
  }
};
