const fs = require('fs');
const file = 'c:/Users/ASUS/Desktop/Logistics18/frontend/src/utils/api.js';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/\/\/ Analytics API calls \(MOCKED for frontend testing\)[\s\S]*?generateReport: \(\) =>[\s\S]*?\}\),[\s\n]*\};/, `// Analytics API calls
export const analyticsAPI = {
  getDashboard: () => apiClient.get('/analytics/dashboard'),
  getKPI: (params) => apiClient.get('/analytics/kpi', { params }),
  generateReport: (data) => apiClient.post('/analytics/generate', data),
};`);

fs.writeFileSync(file, c, 'utf8');
console.log('Fixed api.js');
