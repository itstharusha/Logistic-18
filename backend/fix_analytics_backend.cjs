const fs = require('fs');
const file = 'c:/Users/ASUS/Desktop/Logistics18/backend/src/services/analyticsService.js';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/\/\/ Calculate daysOfCover based on currentStock and averageDailyDemand \(mocking properties safely if absent since schema originally omitted them\)/, '// Calculate daysOfCover based on true currentStock and averageDailyDemand');
c = c.replace(/currentStock: \{ \$ifNull: \['\$currentStock', \{ \$floor: \{ \$add: \[\{ \$multiply: \[\{ \$rand: \{\} \}, 100\] \}, 1\] \} \}\] \},/, "currentStock: { $ifNull: ['$currentStock', 0] },");
c = c.replace(/averageDailyDemand: \{ \$ifNull: \['\$averageDailyDemand', \{ \$floor: \{ \$add: \[\{ \$multiply: \[\{ \$rand: \{\} \}, 10\] \}, 1\] \} \}\] \}/, "averageDailyDemand: { $ifNull: ['$averageDailyDemand', 1] }");

c = c.replace(/\/\/ Mock trend for risk, inventory gracefully[\s\S]*?trend\.push\(\{ date: d\.toISOString\(\)\.split\('T'\)\[0\], value: Math\.floor\(Math\.random\(\) \* 100\) \}\);\s*\}/, "/* no historical data tracking natively yet */");

fs.writeFileSync(file, c, 'utf8');
console.log('Fixed analyticsService.js');
