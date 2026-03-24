import React, { useState } from 'react';
import { X, AlertTriangle, Send } from 'lucide-react';
import '../styles/modals.css';

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical'];
const ENTITY_TYPE_OPTIONS = ['supplier', 'shipment', 'inventory'];

export default function CreateAlertModal({ isOpen, onClose, onSubmit, isLoading }) {
    const [formData, setFormData] = useState({
        entityType: 'supplier',
        entityId: '',
        severity: 'medium',
        title: '',
        description: '',
        mitigationRecommendation: '',
    });

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
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
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.entityType.trim()) {
            newErrors.entityType = 'Entity type is required';
        }
        if (!formData.entityId.trim()) {
            newErrors.entityId = 'Entity ID is required';
        }
        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }
        if (formData.title.trim().length < 5) {
            newErrors.title = 'Title must be at least 5 characters';
        }
        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        }
        if (formData.description.trim().length < 10) {
            newErrors.description = 'Description must be at least 10 characters';
        }
        if (!formData.severity.trim()) {
            newErrors.severity = 'Severity is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        onSubmit(formData);

        // Reset form after submission
        setFormData({
            entityType: 'supplier',
            entityId: '',
            severity: 'medium',
            title: '',
            description: '',
            mitigationRecommendation: '',
        });
        setErrors({});
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container create-alert-modal" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="modal-header">
                    <div className="modal-title-section">
                        <AlertTriangle size={20} className="modal-icon" />
                        <h2 className="modal-title">Create New Alert</h2>
                    </div>
                    <button className="modal-close-btn" onClick={onClose} disabled={isLoading}>
                        <X size={20} />
                    </button>
                </div>

                {/* Modal Content */}
                <form onSubmit={handleSubmit} className="create-alert-form">
                    {/* Entity Type */}
                    <div className="form-group">
                        <label htmlFor="entityType">
                            Entity Type
                            <span className="form-required">*</span>
                        </label>
                        <select
                            id="entityType"
                            name="entityType"
                            value={formData.entityType}
                            onChange={handleChange}
                            disabled={isLoading}
                            className={errors.entityType ? 'form-control error' : 'form-control'}
                        >
                            {ENTITY_TYPE_OPTIONS.map(type => (
                                <option key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </option>
                            ))}
                        </select>
                        {errors.entityType && <span className="form-error">{errors.entityType}</span>}
                    </div>

                    {/* Entity ID */}
                    <div className="form-group">
                        <label htmlFor="entityId">
                            Entity ID
                            <span className="form-required">*</span>
                        </label>
                        <input
                            type="text"
                            id="entityId"
                            name="entityId"
                            placeholder="e.g., 507f1f77bcf86cd799439011 or SUP-001"
                            value={formData.entityId}
                            onChange={handleChange}
                            disabled={isLoading}
                            className={errors.entityId ? 'form-control error' : 'form-control'}
                        />
                        {errors.entityId && <span className="form-error">{errors.entityId}</span>}
                    </div>

                    {/* Severity */}
                    <div className="form-group">
                        <label htmlFor="severity">
                            Severity
                            <span className="form-required">*</span>
                        </label>
                        <select
                            id="severity"
                            name="severity"
                            value={formData.severity}
                            onChange={handleChange}
                            disabled={isLoading}
                            className={errors.severity ? 'form-control error' : 'form-control'}
                        >
                            {SEVERITY_OPTIONS.map(sev => (
                                <option key={sev} value={sev}>
                                    {sev.charAt(0).toUpperCase() + sev.slice(1)}
                                </option>
                            ))}
                        </select>
                        {errors.severity && <span className="form-error">{errors.severity}</span>}
                    </div>

                    {/* Title */}
                    <div className="form-group">
                        <label htmlFor="title">
                            Title
                            <span className="form-required">*</span>
                        </label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            placeholder="e.g., Supplier Financial Risk Alert"
                            value={formData.title}
                            onChange={handleChange}
                            disabled={isLoading}
                            className={errors.title ? 'form-control error' : 'form-control'}
                        />
                        {errors.title && <span className="form-error">{errors.title}</span>}
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label htmlFor="description">
                            Description
                            <span className="form-required">*</span>
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            placeholder="Detailed description of the alert..."
                            value={formData.description}
                            onChange={handleChange}
                            disabled={isLoading}
                            rows="4"
                            className={errors.description ? 'form-control error' : 'form-control'}
                        />
                        {errors.description && <span className="form-error">{errors.description}</span>}
                    </div>

                    {/* Mitigation Recommendation */}
                    <div className="form-group">
                        <label htmlFor="mitigationRecommendation">
                            Mitigation Recommendation
                            <span className="form-optional">(Optional)</span>
                        </label>
                        <textarea
                            id="mitigationRecommendation"
                            name="mitigationRecommendation"
                            placeholder="Recommended action to resolve this alert..."
                            value={formData.mitigationRecommendation}
                            onChange={handleChange}
                            disabled={isLoading}
                            rows="3"
                            className="form-control"
                        />
                    </div>

                    {/* Modal Footer */}
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner-mini"></span>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Send size={16} />
                                    Create Alert
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
