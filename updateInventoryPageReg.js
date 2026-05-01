const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/InventoryPage.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

content = content.replace(/<label>Supplier ID \(Optional\)<\/label>\s*<input type="text" name="supplierId" value=\{formData\.supplierId\} onChange=\{handleFormChange\}\s*placeholder="Supplier ObjectId" \/>/g, 
  `<label>Supplier (Optional)</label>
                <select name="supplierId" value={formData.supplierId} onChange={handleFormChange}>
                  <option value="">-- No Supplier --</option>
                  {suppliers && suppliers.map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.status})</option>
                  ))}
                </select>`);

content = content.replace(/<label>Warehouse ID<\/label>\s*<input type="text" name="warehouseId" value=\{formData\.warehouseId\} onChange=\{handleFormChange\} required \/>/g,
  `<label>Warehouse</label>
                <select name="warehouseId" value={formData.warehouseId} onChange={handleFormChange} required>
                  <option value="">-- Select Warehouse --</option>
                  {activeWarehouses && activeWarehouses.map(w => (
                    <option key={w._id} value={w._id}>{w.name} ({w.location?.country})</option>
                  ))}
                </select>`);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('InventoryPage replaced!');
