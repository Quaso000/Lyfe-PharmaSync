<?php
    require_once 'db_connect.php';

    $action = $_POST['action' ?? ''];

    switch($action) {
        case 'fetch_inventory':
            // Join the batches table with the products table to get all details at once
            $sql = "SELECT 
                        b.batch_id, 
                        b.batch_number, 
                        b.expiry_date, 
                        b.quantity_in_stock, 
                        b.selling_price, 
                        p.generic_name, 
                        p.brand_name, 
                        p.category, 
                        p.reorder_level
                    FROM inventory_batches b
                    JOIN products p ON b.product_id = p.product_id
                    ORDER BY b.expiry_date ASC"; // Sorts by items expiring soonest
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $inventoryData = $stmt->fetchAll();

            // Format the data and attach the computed status
            $formattedInventory = [];
            $today = new DateTime();

            foreach ($inventoryData as $item) {
                $expDate = new DateTime($item['expiry_date']);
                $daysToExpiry = $today->diff($expDate)->days;
                $isExpired = $today > $expDate;

                // Determine System Status
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
                    'status' => $status
                ];
            }

            echo json_encode(["success" => true, "inventory" => $formattedInventory]);
        break;

        case 'delete_inventory':
            $batchId = $_POST['batch_id'] ?? '';
            
            if (empty($batchId)) {
                echo json_encode(["success" => false, "message" => "No batch ID provided."]);
                exit;
            }

            try {
                $stmt = $pdo->prepare("DELETE FROM inventory_batches WHERE batch_id = ?");
                $stmt->execute([$batchId]);
                
                echo json_encode(["success" => true]);
                
            } catch (PDOException $e) {
                // SQLSTATE 23000 means a Foreign Key Constraint failed (item already exists in sales_items)
                if ($e->getCode() == '23000') {
                    echo json_encode(["success" => false, "message" => "Cannot delete this batch because it is linked to existing POS sales transactions. Update the stock to 0 instead."]);
                } else {
                    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
                }
            }
        break;

        default:
            echo json_encode(["success" => false, "message" => "Invalid action."]);
        break;
    }
?>