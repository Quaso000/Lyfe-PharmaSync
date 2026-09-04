<?php
    require_once 'db_connect.php';

    $action = $_POST['action'] ?? '';

    switch($action){
        case 'process_checkout':
            if (!isset($_SESSION['user_id'])) {
                echo json_encode(["success" => false, "message" => "Unauthorized session."]); 
                exit;
            }

            $cartData = json_decode($_POST['cart_data'], true);
            if (!$cartData || empty($cartData)) {
                echo json_encode(["success" => false, "message" => "Terminal basket is empty."]); 
                exit;
            }

            $customerName = trim($_POST['customer_name'] ?? '');
            $prcLicense = trim($_POST['prc_license'] ?? '');
            $ptrNumber = trim($_POST['ptr_number'] ?? '');
            $paymentMethod = 'Cash'; 

            try {
                $pdo->beginTransaction();

                $totalAmount = 0;
                $totalQty = 0;
                $logItemsList = []; // Array to track items for the audit log
                
                foreach ($cartData as $item) {
                    $totalAmount += ((float)$item['price'] * (int)$item['qty']);
                    $totalQty += (int)$item['qty'];
                    $logItemsList[] = $item['name'] . " (x" . (int)$item['qty'] . ")";
                }

                // 1. Create Master Sales Record
                $salesStmt = $pdo->prepare("INSERT INTO sales_transactions (user_id, transaction_date, total_amount, total_qty, payment_method, customer_name, prc_license, ptr_number) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?)");
                $salesStmt->execute([$_SESSION['user_id'], $totalAmount, $totalQty, $paymentMethod, $customerName, $prcLicense, $ptrNumber]);
                
                $dbTxnId = $pdo->lastInsertId();
                $formattedTxnId = "TXN-" . str_pad($dbTxnId, 6, "0", STR_PAD_LEFT);

                // 2. Insert items and deduct stock
                $salesItemStmt = $pdo->prepare("INSERT INTO sales_items (transaction_id, batch_id, quantity_sold, subtotal) VALUES (?, ?, ?, ?)");
                $stockUpdateStmt = $pdo->prepare("UPDATE inventory_batches SET quantity_in_stock = quantity_in_stock - ? WHERE batch_id = ? AND quantity_in_stock >= ?");

                foreach ($cartData as $item) {
                    $batchId = $item['id']; 
                    $qty = (int)$item['qty'];
                    $subtotal = ((float)$item['price'] * $qty);

                    $salesItemStmt->execute([$dbTxnId, $batchId, $qty, $subtotal]);

                    $stockUpdateStmt->execute([$qty, $batchId, $qty]);
                    if ($stockUpdateStmt->rowCount() === 0) {
                        throw new Exception("Transaction Failed: Insufficient stock for " . $item['name'] . " (Batch: " . $item['batch'] . ").");
                    }
                }

                // 3. Log the Inventory Change to the Audit History
                $auditStmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action_type, description, timestamp) VALUES (?, 'POS Sale', ?, NOW())");
                $auditDesc = "Stock deducted for $formattedTxnId. Items: " . implode(", ", $logItemsList) . ".";
                $auditStmt->execute([$_SESSION['user_id'], $auditDesc]);

                // 4. Log Prescription Compliance (if applicable)
                if ($customerName && $prcLicense) {
                    $rxStmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action_type, description, timestamp) VALUES (?, 'Rx Verification', ?, NOW())");
                    $rxDesc = "Prescription verified for $formattedTxnId. Patient: $customerName, Lic: $prcLicense, PTR: $ptrNumber.";
                    $rxStmt->execute([$_SESSION['user_id'], $rxDesc]);
                }

                $pdo->commit();
                echo json_encode(["success" => true, "transaction_id" => $formattedTxnId]);
                
            } catch (Exception $e) {
                $pdo->rollBack();
                echo json_encode(["success" => false, "message" => $e->getMessage()]);
            }
        break;

        case 'fetch_sales':
            if (!isset($_SESSION['user_id'])) {
                echo json_encode(["success" => false]); 
                exit;
            }

            try {
                // Joins the 4 tables and groups the items into a single summary string per transaction
                $sql = "SELECT 
                            st.transaction_id AS raw_id,
                            st.transaction_date,
                            st.total_qty,
                            st.total_amount,
                            CONCAT(u.first_name, ' ', u.last_name) AS cashier,
                            GROUP_CONCAT(CONCAT(p.generic_name, ' (x', si.quantity_sold, ')') SEPARATOR ' | ') AS items_summary
                        FROM sales_transactions st
                        JOIN users u ON st.user_id = u.user_id
                        LEFT JOIN sales_items si ON si.transaction_id = st.transaction_id
                        LEFT JOIN inventory_batches ib ON si.batch_id = ib.batch_id
                        LEFT JOIN products p ON ib.product_id = p.product_id
                        GROUP BY st.transaction_id
                        ORDER BY st.transaction_date DESC";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute();
                $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $formattedSales = [];
                foreach($sales as $row) {
                    $formattedTxnId = "TXN-" . str_pad($row['raw_id'], 6, "0", STR_PAD_LEFT);

                    $formattedSales[] = [
                        'txn' => $formattedTxnId,
                        'items' => $row['items_summary'] ?: 'Unknown Items',
                        'qty' => $row['total_qty'],
                        'total' => (float)$row['total_amount'],
                        'time' => date('M d, Y h:i A', strtotime($row['transaction_date'])),
                        'raw_date' => $row['transaction_date'], // Required for Quarter filtering
                        'cashier' => $row['cashier']
                    ];
                }

                echo json_encode(["success" => true, "sales" => $formattedSales]);
            } catch(PDOException $e) {
                echo json_encode(["success" => false, "message" => $e->getMessage()]);
            }
        break;
        
        default:
            echo json_encode(["success" => false, "message" => "Invalid action."]);
        break;
    }
?>