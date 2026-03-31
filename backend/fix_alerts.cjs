const fs = require('fs');
const file = 'c:/Users/ASUS/Desktop/Logistics18/frontend/src/pages/AlertsPage.jsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/\/\* ─── Mock data for demo \(when API is not connected\) ─── \*\/[\s\S]*?(?=export default function AlertsPage)/, '');
c = c.replace(/const trend = dashboard\?\.trend \|\| MOCK_TREND;/g, 'const trend = dashboard?.trend || [];');
c = c.replace(/\/\/ Use Redux alerts directly, fallback to MOCK_ALERTS if empty[\s\S]*?const alerts = storeAlerts && storeAlerts\.length > 0 \? storeAlerts : MOCK_ALERTS;/, 'const alerts = storeAlerts || [];');
c = c.replace(/return MOCK_STATS;/g, 'return {total:0, open:0, acknowledged:0, resolved:0, escalated:0, low:0, medium:0, high:0, critical:0};');
c = c.replace(/const validTrend = Array\.isArray\(trend\) && trend\.length > 0 \? trend : MOCK_TREND;/g, 'const validTrend = Array.isArray(trend) ? trend : [];');

fs.writeFileSync(file, c, 'utf8');
console.log('Fixed AlertsPage');
