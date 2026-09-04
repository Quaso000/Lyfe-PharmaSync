<?php
    require_once 'db_connect.php';

    $action = $_POST['action'] ?? '';

    switch($action) {
        case 'fetch_inventory':
            $sql = "SELECT 
                        b.batch_id, b.batch_number, b.expiry_date, b.quantity_in_stock, b.selling_price, 
                        p.generic_name, p.brand_name, p.category, p.reorder_level, p.drug_type
                    FROM inventory_batches b
                    JOIN products p ON b.product_id = p.product_id
                    ORDER BY b.expiry_date ASC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $inventoryData = $stmt->fetchAll();

            $formattedInventory = [];
            $today = new DateTime();

            foreach ($inventoryData as $item) {
                $expDate = new DateTime($item['expiry_date']);
                $daysToExpiry = $today->diff($expDate)->days;
                $isExpired = $today > $expDate;

                $status = 'Optimal';
                if ($isExpired) {
                    $status = 'Expired';
                } elseif ($daysToExpiry <= 90) {
                    $status = 'Expiring Soon';
                } elseif ($item['quantity_in_stock'] <= $item['reorder_level']) {
                    $status = 'Low Stock';
                }

                $formattedInventory[] = [
                    'id' => $item['batch_id'],
                    'batch' => $item['batch_number'],
                    'name' => trim($item['generic_name'] . ' (' . $item['brand_name'] . ')'),
                    'category' => $item['category'],
                    'stock' => $item['quantity_in_stock'],
                    'price' => (float)$item['selling_price'],
                    'expiry' => $item['expiry_date'],
                    'status' => $status,
                    'drug_type' => $item['drug_type'] ?? 'OTC'
                ];
            }

            echo json_encode(["success" => true, "inventory" => $formattedInventory]);
        break;

        case 'update_inventory':
            $batchId = $_POST['batch_id'] ?? '';
            $batchNo = trim($_POST['batch_number'] ?? '');
            $qty = $_POST['quantity_in_stock'] ?? '';
            $price = $_POST['selling_price'] ?? '';
            $expiry = $_POST['expiry_date'] ?? '';
            $drugType = $_POST['drug_type'] ?? 'OTC';

            if (empty($batchId) || empty($batchNo) || $qty === '' || $price === '' || empty($expiry)) {
                echo json_encode(["success" => false, "message" => "All fields are required."]);
                exit;
            }

            try {
                $pdo->beginTransaction();
                
                // Update Batch Details
                $stmt = $pdo->prepare("UPDATE inventory_batches SET batch_number = ?, quantity_in_stock = ?, selling_price = ?, expiry_date = ? WHERE batch_id = ?");
                $stmt->execute([$batchNo, $qty, $price, $expiry, $batchId]);
                
                // Get Product ID and Update Drug Type globally for that product
                $prodStmt = $pdo->prepare("SELECT product_id FROM inventory_batches WHERE batch_id = ?");
                $prodStmt->execute([$batchId]);
                $productId = $prodStmt->fetchColumn();

                $updateProd = $pdo->prepare("UPDATE products SET drug_type = ? WHERE product_id = ?");
                $updateProd->execute([$drugType, $productId]);
                
                // Log History
                $logStmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action_type, description, timestamp) VALUES (?, 'Update', ?, NOW())");
                $logStmt->execute([$_SESSION['user_id'], "Updated Batch: $batchNo. New Stock: $qty, Price: ₱$price."]);

                $pdo->commit();
                echo json_encode(["success" => true, "message" => "Inventory batch updated successfully."]);
            } catch (PDOException $e) {
                $pdo->rollBack();
                echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
            }
        break;

        case 'delete_inventory':
            $batchId = $_POST['batch_id'] ?? '';
            if (empty($batchId)) {
                echo json_encode(["success" => false, "message" => "No batch ID provided."]);
                exit;
            }

            try {
                $pdo->beginTransaction();
                
                // Fetch details for the log before deleting
                $getBatch = $pdo->prepare("SELECT batch_number FROM inventory_batches WHERE batch_id = ?");
                $getBatch->execute([$batchId]);
                $batchNumber = $getBatch->fetchColumn();


                // STEP 1: Find the master product_id tied to this batch BEFORE we delete it
                $getProd = $pdo->prepare("SELECT product_id FROM inventory_batches WHERE batch_id = ?");
                $getProd->execute([$batchId]);
                $productId = $getProd->fetchColumn();

                // STEP 2: Forcefully remove the item from past sales records
                $clearSales = $pdo->prepare("DELETE FROM sales_items WHERE batch_id = ?");
                $clearSales->execute([$batchId]);
                
                // STEP 3: Delete the actual inventory batch
                $deleteBatch = $pdo->prepare("DELETE FROM inventory_batches WHERE batch_id = ?");
                $deleteBatch->execute([$batchId]);
                
                // Log History
                $logStmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action_type, description, timestamp) VALUES (?, 'Delete', ?, NOW())");
                $logStmt->execute([$_SESSION['user_id'], "Permanently deleted Batch: $batchNumber."]);


                // STEP 4: Delete the item from the products table IF it has no other active batches
                if ($productId) {
                    $checkRemaining = $pdo->prepare("SELECT COUNT(*) FROM inventory_batches WHERE product_id = ?");
                    $checkRemaining->execute([$productId]);
                    
                    if ($checkRemaining->fetchColumn() == 0) {
                        $deleteProd = $pdo->prepare("DELETE FROM products WHERE product_id = ?");
                        $deleteProd->execute([$productId]);
                    }
                }
                
                $pdo->commit();
                echo json_encode(["success" => true]);
                
            } catch (PDOException $e) {
                $pdo->rollBack();
                echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
            }
            break;

        case 'add_inventory':
            // Safety Check
            if (!isset($_SESSION['user_id'])) {
                echo json_encode(["success" => false, "message" => "Unauthorized session."]); exit;
            }

            $batchNo = strtoupper(trim($_POST['batch_number'] ?? ''));
            $qty = (int)($_POST['quantity_in_stock'] ?? 0);
            $price = (float)($_POST['selling_price'] ?? 0);
            $expiry = $_POST['expiry_date'] ?? '';
            $drugType = $_POST['drug_type'] ?? 'OTC';

            $name = ucwords(strtolower(trim($_POST['name'] ?? '')));
            $brand = ucwords(strtolower(trim($_POST['brand_name'] ?? '')));
            $category = ucwords(strtolower(trim($_POST['category'] ?? '')));
            if (empty($brand)) $brand = 'Generic';

            if (empty($batchNo) || empty($name) || empty($category) || empty($expiry)) {
                echo json_encode(["success" => false, "message" => "Required fields missing."]); exit;
            }

            try {
                $pdo->beginTransaction();
                
                // 1. UPSERT PRODUCT: Check if Master Product already exists
                $prodCheck = $pdo->prepare("SELECT product_id FROM products WHERE generic_name = ? AND brand_name = ?");
                $prodCheck->execute([$name, $brand]);
                $productId = $prodCheck->fetchColumn();

                if (!$productId) {
                    $prodStmt = $pdo->prepare("INSERT INTO products (barcode, generic_name, brand_name, category, reorder_level, drug_type) VALUES (?, ?, ?, ?, 50, ?)");
                    $prodStmt->execute(['BAR-' . rand(10000, 99999), $name, $brand, $category, $drugType]);
                    $productId = $pdo->lastInsertId();
                }

                // 2. UPSERT BATCH: Check if Batch Code already exists
                $batchCheck = $pdo->prepare("SELECT batch_id FROM inventory_batches WHERE batch_number = ?");
                $batchCheck->execute([$batchNo]);
                $existingBatch = $batchCheck->fetchColumn();

                if ($existingBatch) {
                    // Update existing stock by ADDING the new quantity
                    $updateBatch = $pdo->prepare("UPDATE inventory_batches SET quantity_in_stock = quantity_in_stock + ?, selling_price = ?, expiry_date = ? WHERE batch_number = ?");
                    $updateBatch->execute([$qty, $price, $expiry, $batchNo]);
                    $logAction = "Added $qty units to existing Batch: $batchNo ($name).";
                } else {
                    // Insert brand new batch
                    $insertBatch = $pdo->prepare("INSERT INTO inventory_batches (product_id, batch_number, expiry_date, quantity_in_stock, selling_price, smart_pricing_status) VALUES (?, ?, ?, ?, ?, 'Inactive')");
                    $insertBatch->execute([$productId, $batchNo, $expiry, $qty, $price]);
                    $logAction = "Registered new item: $name ($brand) (Batch: $batchNo) with $qty units.";
                }

                // 3. Log History
                $logStmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action_type, description, timestamp) VALUES (?, 'Inventory Entry', ?, NOW())");
                $logStmt->execute([$_SESSION['user_id'], $logAction]);

                $pdo->commit();
                echo json_encode(["success" => true, "message" => "Item processed successfully."]);
            } catch (PDOException $e) {
                $pdo->rollBack();
                echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
            }
        break;

        case 'fetch_history':
            $stmt = $pdo->prepare("SELECT a.timestamp, u.first_name, u.last_name, a.action_type, a.description 
                                   FROM audit_logs a JOIN users u ON a.user_id = u.user_id 
                                   ORDER BY a.timestamp DESC LIMIT 50");
            $stmt->execute();
            
            $formattedLogs = [];
            foreach($stmt->fetchAll() as $log) {
                $formattedLogs[] = [
                    'time' => date('M d, Y h:i A', strtotime($log['timestamp'])),
                    'user' => $log['first_name'] . ' ' . $log['last_name'],
                    'action' => $log['action_type'],
                    'desc' => $log['description']
                ];
            }
            echo json_encode(["success" => true, "logs" => $formattedLogs]);
        break;

        case 'import_csv':
            // Security Check
            if (!isset($_SESSION['user_id'])) {
                echo json_encode(["success" => false, "message" => "Unauthorized session."]); exit;
            }

            $csvData = json_decode($_POST['csv_data'], true);
            if (!$csvData || empty($csvData)) { 
                echo json_encode(["success" => false, "message" => "No valid data received."]); exit; 
            }

            try {
                $pdo->beginTransaction();
                
                $prodCheck = $pdo->prepare("SELECT product_id FROM products WHERE generic_name = ? AND brand_name = ?");
                $prodInsert = $pdo->prepare("INSERT INTO products (barcode, generic_name, brand_name, category, reorder_level, drug_type) VALUES (?, ?, ?, ?, 50, 'OTC')");
                
                $batchCheck = $pdo->prepare("SELECT batch_id FROM inventory_batches WHERE batch_number = ?");
                $batchUpdate = $pdo->prepare("UPDATE inventory_batches SET quantity_in_stock = quantity_in_stock + ?, selling_price = ?, expiry_date = ? WHERE batch_number = ?");
                $batchInsert = $pdo->prepare("INSERT INTO inventory_batches (product_id, batch_number, expiry_date, quantity_in_stock, selling_price, smart_pricing_status) VALUES (?, ?, ?, ?, ?, 'Inactive')");
                
                $newCount = 0;
                $updatedCount = 0;

                foreach ($csvData as $row) {
                    $batch = strtoupper(trim($row['batch']));
                    $name = ucwords(strtolower(trim($row['name'])));
                    $brand = ucwords(strtolower(trim($row['brand'])));
                    $category = ucwords(strtolower(trim($row['category'])));
                    if (empty($brand)) $brand = 'Generic';

                    // 1. Resolve Product
                    $prodCheck->execute([$name, $brand]);
                    $productId = $prodCheck->fetchColumn();

                    if (!$productId) {
                        $prodInsert->execute(['BAR-' . rand(10000, 99999), $name, $brand, $category]);
                        $productId = $pdo->lastInsertId();
                    }

                    // 2. Resolve Batch
                    $batchCheck->execute([$batch]);
                    if ($batchCheck->fetchColumn()) {
                        // Batch exists: ADD stock
                        $batchUpdate->execute([$row['stock'], $row['price'], $row['expiry'], $batch]);
                        $updatedCount++;
                    } else {
                        // Batch is new: INSERT
                        $batchInsert->execute([$productId, $batch, $row['expiry'], $row['stock'], $row['price']]);
                        $newCount++;
                    }
                }

                // 3. Log History
                $logStmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action_type, description, timestamp) VALUES (?, 'Bulk Import', ?, NOW())");
                $logStmt->execute([$_SESSION['user_id'], "CSV Import processed. New items: $newCount. Existing batches updated: $updatedCount."]);

                $pdo->commit();
                echo json_encode(["success" => true, "message" => "Import Successful! Added $newCount new items. Updated $updatedCount existing batches."]);
            } catch (PDOException $e) {
                $pdo->rollBack();
                echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
            }
        break;

        case 'apply_smart_price':
            if (!isset($_SESSION['user_id'])) {
                echo json_encode(["success" => false, "message" => "Unauthorized session."]); 
                exit;
            }
            
            $batchId = $_POST['batch_id'] ?? '';
            $newPrice = $_POST['new_price'] ?? '';
            $oldPrice = $_POST['old_price'] ?? '';

            if (empty($batchId) || $newPrice === '') {
                echo json_encode(["success" => false, "message" => "Missing batch or price data."]); 
                exit;
            }

            try {
                $pdo->beginTransaction();
                
                // 1. Apply the discount and activate the smart pricing flag
                $stmt = $pdo->prepare("UPDATE inventory_batches SET selling_price = ?, smart_pricing_status = 'Active' WHERE batch_id = ?");
                $stmt->execute([$newPrice, $batchId]);
                
                // 2. Fetch item details for the audit log
                $infoStmt = $pdo->prepare("SELECT b.batch_number, p.generic_name FROM inventory_batches b JOIN products p ON b.product_id = p.product_id WHERE b.batch_id = ?");
                $infoStmt->execute([$batchId]);
                $info = $infoStmt->fetch();

                // 3. Log the financial change
                $logStmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action_type, description, timestamp) VALUES (?, 'Smart Pricing', ?, NOW())");
                $desc = "Mitigation applied: Reduced price of {$info['generic_name']} (Batch: {$info['batch_number']}) from ₱{$oldPrice} to ₱{$newPrice}.";
                $logStmt->execute([$_SESSION['user_id'], $desc]);

                $pdo->commit();
                echo json_encode(["success" => true]);
            } catch (PDOException $e) {
                $pdo->rollBack();
                echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
            }
        break;

        default:
            echo json_encode(["success" => false, "message" => "Invalid action."]);
        break;
    }
?>