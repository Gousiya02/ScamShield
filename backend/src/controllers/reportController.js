import { dbService } from '../models/dbService.js';

export const createReport = async (req, res) => {
  const { title, description, scamType, evidence } = req.body;
  const username = req.user ? req.user.username : 'Anonymous';

  if (!title || !description || !scamType || !evidence) {
    return res.status(400).json({ success: false, message: 'Please provide all required reporting fields.' });
  }

  try {
    const report = await dbService.createScamReport({
      title,
      description,
      scamType,
      evidence,
      reportedBy: username
    });

    return res.status(201).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Create report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to register scam report.' });
  }
};

export const getReports = async (req, res) => {
  const { type } = req.query;
  const filter = {};
  if (type && type !== 'all') {
    filter.scamType = type;
  }

  try {
    const reports = await dbService.getScamReports(filter);
    return res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve reports list.' });
  }
};

export const upvoteReport = async (req, res) => {
  const { id } = req.params;
  const username = req.user ? req.user.username : (req.body.username || 'Anonymous');

  try {
    const updatedReport = await dbService.upvoteScamReport(id, username);
    if (!updatedReport) {
      return res.status(404).json({ success: false, message: 'Scam report not found.' });
    }

    return res.json({
      success: true,
      data: updatedReport
    });
  } catch (error) {
    console.error('Upvote error:', error);
    return res.status(500).json({ success: false, message: 'Unable to register upvote.' });
  }
};
