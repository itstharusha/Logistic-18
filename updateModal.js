const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/components/CreateAlertModal.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

const importReplacement = `import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Send } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { listSuppliers } from '../redux/suppliersSlice.js';
import { listInventory } from '../redux/inventorySlice.js';
import { listShipments } from '../redux/shipmentsSlice.js';
import '../styles/modals.css';`;

content = content.replace(/import React, \{ useState \} from 'react';\nimport \{ X, AlertTriangle, Send \} from 'lucide-react';\nimport '\.\.\/styles\/modals\.css';/, importReplacement);

const signatureRegex = /export default function CreateAlertModal\(\{ isOpen, onClose, onSubmit, isLoading \}\) \{/;
const hookSetup = `export default function CreateAlertModal({ isOpen, onClose, onSubmit, isLoading }) {
    const dispatch = useDispatch();
    const { suppliers } = useSelector((state) => state.suppliers);
    const { items: inventoryItems } = useSelector((state) => state.inventory);
    const { shipments } = useSelector((state) => state.shipments);

    useEffect(() => {
        if (isOpen) {
            // Load required entities when modal opens
            dispatch(listSuppliers({ limit: 100 }));
            dispatch(listInventory({ limit: 100 }));
            dispatch(listShipments({ limit: 100 }));
        }
    }, [isOpen, dispatch]);`;

content = content.replace(signatureRegex, hookSetup);

// update entityId input
const entityIdJSX = `<input
                              type="text"
                              id="entityId"
                              name="entityId"
                              placeholder="e.g., 507f1f77bcf86cd799439011 or SUP-001"
                              value={formData.entityId}
                              onChange={handleChange}
                              disabled={isLoading}
                              className={errors.entityId ? 'form-control error' : 'form-control'}
                          />`;

const selectJSX = `<select
                              id="entityId"
                              name="entityId"
                              value={formData.entityId}
                              onChange={handleChange}
                              disabled={isLoading}
                              className={errors.entityId ? 'form-control error' : 'form-control'}
                          >
                              <option value="">-- Select {formData.entityType} --</option>
                              {formData.entityType === 'supplier' && suppliers?.map(s => (
                                  <option key={s._id} value={s._id}>{s.name} ({s.status})</option>
                              ))}
                              {formData.entityType === 'inventory' && inventoryItems?.map(i => (
                                  <option key={i._id} value={i._id}>{i.sku} - {i.name}</option>
                              ))}
                              {formData.entityType === 'shipment' && shipments?.map(s => (
                                  <option key={s._id} value={s._id}>{s.trackingNumber} ({s.status})</option>
                              ))}
                          </select>`;

content = content.replace(entityIdJSX, selectJSX);

// Wait, the hook needs to reset entityId when entityType changes
// If I replace `const handleChange = (e) => { ... }` with a hook to reset entityId

const handleReplaceOld = `    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: '',
            }));
        }
    };`;

const handleReplaceNew = `    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            ...(name === 'entityType' ? { entityId: '' } : {}) // Reset entityId if type changes
        }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: '',
            }));
        }
    };`;

content = content.replace(handleReplaceOld, handleReplaceNew);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('CreateAlertModal updated!');
