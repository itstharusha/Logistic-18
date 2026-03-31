const fs = require('fs');
const file = 'c:/Users/ASUS/Desktop/Logistics18/backend/src/routes/analyticsRoutes.js';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/\/\/ TEMP: fake authenticated user for local report testing only[\s\S]*?analyticsController\.generateReport\s*\);/, 'router.post(\'/generate\', authenticate, analyticsController.generateReport);');
c = c.replace(/router\.get\(\s*'\/:reportId\/download',[\s\S]*?analyticsController\.downloadReport\s*\);/, 'router.get(\'/:reportId/download\', authenticate, analyticsController.downloadReport);');

fs.writeFileSync(file, c, 'utf8');
console.log('Fixed analyticsRoutes.js');
