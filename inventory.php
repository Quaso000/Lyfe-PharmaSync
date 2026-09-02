<?php
    require_once 'db_connect.php';

    $action = $_POST['action'] ?? '';

    switch($action) {
        case 'fetch_inventory':
            $sql = "SELECT 
                        b.batch_id, 
                        b.batch_number, 
                        b.expiry_date, 
                        b.quantity_in_stock, 
                        b.selling_price, 
                        p.generic_name, 
                        p.brand_name, 
                        p.category, 
                        p.reorder_level,
                        p.drug_type
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

        default:
            echo json_encode(["success" => false, "message" => "Invalid action."]);
        break;
    }
?>