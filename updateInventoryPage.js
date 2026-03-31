const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/InventoryPage.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add supplier slice import
content = content.replace(
  "import { getActiveWarehouses } from '../redux/warehouseSlice.js';",
  "import { getActiveWarehouses } from '../redux/warehouseSlice.js';\nimport { listSuppliers } from '../redux/suppliersSlice.js';"
);

// 2. Add selector for suppliers
content = content.replace(
  "const { activeWarehouses } = useSelector((state) => state.warehouse);",
  "const { activeWarehouses } = useSelector((state) => state.warehouse);\n  const { suppliers } = useSelector((state) => state.suppliers);"
);

// 3. Add dispatch listSuppliers in useEffect
content = content.replace(
  "dispatch(getActiveWarehouses());",
  "dispatch(getActiveWarehouses());\n    dispatch(listSuppliers({ limit: 100 }));"
);

// 4. Update the "Add Item" form, supplierId field
const addFormSupplierOld = `                <label>Supplier ID (Optional)</label>
                <input type="text" name="supplierId" value={formData.supplierId} onChange={handleFormChange} placeholder="Supplier ObjectId" />`;
const addFormSupplierNew = `                <label>Supplier (Optional)</label>
                <select name="supplierId" value={formData.supplierId} onChange={handleFormChange}>
                  <option value="">-- No Supplier --</option>
                  {suppliers && suppliers.map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.status})</option>
                  ))}
                </select>`;

content = content.replace(addFormSupplierOld, addFormSupplierNew);

// 5. Update the "Edit Item" form, warehouseId field
const editFormWarehouseOld = `                <label>Warehouse ID</label>
                <input type="text" name="warehouseId" value={formData.warehouseId} onChange={handleFormChange} required />`;
const editFormWarehouseNew = `                <label>Warehouse</label>
                <select name="warehouseId" value={formData.warehouseId} onChange={handleFormChange} required>
                  <option value="">-- Select Warehouse --</option>
                  {activeWarehouses && activeWarehouses.map(w => (
                    <option key={w._id} value={w._id}>{w.name} ({w.location?.country})</option>
                  ))}
                </select>`;

content = content.replace(editFormWarehouseOld, editFormWarehouseNew);

// 6. Update the "Edit Item" form, supplierId field
const editFormSupplierOld = `                <label>Supplier ID (Optional)</label>
                <input type="text" name="supplierId" value={formData.supplierId} onChange={handleFormChange} placeholder="Supplier ObjectId" />`;
const editFormSupplierNew = `                <label>Supplier (Optional)</label>
                <select name="supplierId" value={formData.supplierId} onChange={handleFormChange}>
                  <option value="">-- No Supplier --</option>
                  {suppliers && suppliers.map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.status})</option>
                  ))}
                </select>`;

content = content.replace(editFormSupplierOld, editFormSupplierNew);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('InventoryPage updated!');
