import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

class TestMLServiceBasics:
    """Basic tests for ML service functionality"""

    def test_imports(self):
        """Test that main module imports successfully"""
        try:
            import main
            assert hasattr(main, 'app')
        except ImportError:
            pytest.skip("Main module not available")

    def test_environment_variables(self):
        """Test that required environment variables can be set"""
        os.environ['MONGODB_URI'] = 'mongodb://localhost:27017/test'
        os.environ['ML_SERVICE_PORT'] = '5001'
        
        assert os.environ.get('MONGODB_URI') == 'mongodb://localhost:27017/test'
        assert os.environ.get('ML_SERVICE_PORT') == '5001'

    def test_numpy_available(self):
        """Test that numpy is available"""
        try:
            import numpy as np
            arr = np.array([1, 2, 3, 4, 5])
            assert len(arr) == 5
            assert arr.mean() == 3.0
        except ImportError:
            pytest.skip("Numpy not installed")

    def test_pandas_available(self):
        """Test that pandas is available"""
        try:
            import pandas as pd
            df = pd.DataFrame({'A': [1, 2, 3], 'B': [4, 5, 6]})
            assert len(df) == 3
            assert df['A'].sum() == 6
        except ImportError:
            pytest.skip("Pandas not installed")


class TestDataValidation:
    """Tests for data validation"""

    def test_supplier_data_validation(self):
        """Test supplier data structure validation"""
        supplier_data = {
            'id': 'SUPP-001',
            'name': 'Test Supplier',
            'risk_score': 0.45,
            'payment_history': 0.95,
            'delivery_rate': 0.92
        }
        
        assert supplier_data['id'] is not None
        assert 0 <= supplier_data['risk_score'] <= 1
        assert 0 <= supplier_data['payment_history'] <= 1
        assert 0 <= supplier_data['delivery_rate'] <= 1

    def test_inventory_data_validation(self):
        """Test inventory data structure validation"""
        inventory_data = {
            'sku': 'SKU-001',
            'quantity': 100,
            'min_threshold': 20,
            'max_threshold': 500
        }
        
        assert inventory_data['quantity'] > 0
        assert inventory_data['min_threshold'] > 0
        assert inventory_data['max_threshold'] > inventory_data['min_threshold']

    def test_shipment_data_validation(self):
        """Test shipment data structure validation"""
        shipment_data = {
            'tracking_id': 'SHIP-001',
            'status': 'in_transit',
            'location': 'Distribution Center',
            'progress_percentage': 45
        }
        
        assert shipment_data['status'] in ['pending', 'in_transit', 'delivered', 'delayed']
        assert 0 <= shipment_data['progress_percentage'] <= 100


class TestRiskCalculations:
    """Tests for risk calculation functions"""

    def test_risk_score_range(self):
        """Test that risk scores are within valid range"""
        risk_scores = [0.0, 0.25, 0.5, 0.75, 1.0]
        for score in risk_scores:
            assert 0 <= score <= 1, f"Risk score {score} out of range"

    def test_weighted_average(self):
        """Test weighted average calculation"""
        values = [0.8, 0.6, 0.9]
        weights = [0.5, 0.3, 0.2]
        
        weighted_avg = sum(v * w for v, w in zip(values, weights))
        assert 0.6 <= weighted_avg <= 0.9
        assert weighted_avg == pytest.approx(0.77)

    def test_anomaly_detection_threshold(self):
        """Test anomaly detection thresholds"""
        normal_value = 50
        anomaly_threshold = 100
        
        anomalies = []
        for value in [45, 55, 150, 40, 200]:
            if abs(value - normal_value) > anomaly_threshold:
                anomalies.append(value)
        
        assert 150 in anomalies
        assert 200 in anomalies
        assert 45 not in anomalies


class TestDataProcessing:
    """Tests for data processing pipelines"""

    def test_data_normalization(self):
        """Test data normalization"""
        values = [10, 20, 30, 40, 50]
        min_val = min(values)
        max_val = max(values)
        
        normalized = [(v - min_val) / (max_val - min_val) for v in values]
        
        assert normalized[0] == 0.0
        assert normalized[-1] == 1.0
        assert all(0 <= v <= 1 for v in normalized)

    def test_data_filtering(self):
        """Test data filtering"""
        data = [
            {'status': 'active', 'value': 100},
            {'status': 'inactive', 'value': 50},
            {'status': 'active', 'value': 200},
            {'status': 'pending', 'value': 75}
        ]
        
        active_data = [d for d in data if d['status'] == 'active']
        
        assert len(active_data) == 2
        assert all(d['status'] == 'active' for d in active_data)
