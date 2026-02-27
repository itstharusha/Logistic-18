import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ==========================================
// SHIPMENT TRACKING MODULE (Umayanthi)
// ==========================================

router.get('/', authenticate, (req, res) => {
  res.status(501).json({ 
    message: 'Shipment list endpoint - implemented by Umayanthi',
    status: 'NOT_IMPLEMENTED_YET' 
  });
});

router.post('/', authenticate, authorize(['ORG_ADMIN', 'LOGISTICS_OPERATOR']), (req, res) => {
  res.status(501).json({ 
    message: 'Register shipment endpoint - implemented by Umayanthi',
    status: 'NOT_IMPLEMENTED_YET' 
  });
});

router.get('/:shipmentId', authenticate, (req, res) => {
  res.status(501).json({ 
    message: 'Get shipment detail endpoint - implemented by Umayanthi',
    status: 'NOT_IMPLEMENTED_YET' 
  });
});

router.put('/:shipmentId', authenticate, authorize(['ORG_ADMIN', 'LOGISTICS_OPERATOR']), (req, res) => {
  res.status(501).json({ 
    message: 'Update shipment endpoint - implemented by Umayanthi',
    status: 'NOT_IMPLEMENTED_YET' 
  });
});

router.get('/:shipmentId/tracking', authenticate, (req, res) => {
  res.status(501).json({ 
    message: 'Get tracking information endpoint - implemented by Umayanthi',
    status: 'NOT_IMPLEMENTED_YET' 
  });
});

export default router;
