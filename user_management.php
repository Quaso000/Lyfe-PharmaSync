<?php
    require_once 'db_connect.php';

    $action = $_POST['action'] ?? '';

    switch($action){
        case 'heartbeat':
            if (isset($_SESSION['user_id'])) {
                // Keep the timestamp fresh AND ensure their database status is set to Online
                $pdo->prepare("UPDATE users SET last_active = NOW(), status = 'Online' WHERE user_id = ?")->execute([$_SESSION['user_id']]);
                echo json_encode(["success" => true]);
            }
        break;

        case 'tab_closed':
            $userId = $_POST['user_id'] ?? ($_SESSION['user_id'] ?? null);
            if ($userId) {
                // Anti-Race Condition: Only set Offline if the last active ping wasn't within the last 5 seconds
                $pdo->prepare("UPDATE users SET status = 'Offline' WHERE user_id = ? AND last_active < NOW() - INTERVAL 5 SECOND")->execute([$userId]);
            }
        break;

        case 'check_session':
            if (isset($_SESSION['user_id'])) {
                $stmt = $pdo->prepare("SELECT u.first_name, u.last_name, u.phone_number, u.sms_alerts_enabled, r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = ?");
                $stmt->execute([$_SESSION['user_id']]);
                $user = $stmt->fetch();

                if ($user) {
                    // NEW: Instantly reactivate them to 'Online' if they just did a Ctrl+R reload
                    $pdo->prepare("UPDATE users SET status = 'Online', last_active = NOW() WHERE user_id = ?")->execute([$_SESSION['user_id']]);

                    echo json_encode([
                        "success" => true, 
                        "id" => $_SESSION['user_id'],
                        "name" => trim($user['first_name'] . ' ' . $user['last_name']),
                        "role" => $user['role_name'],
                        "phone_number" => $user['phone_number'],
                        "sms_enabled" => $user['sms_alerts_enabled'] ?? 1
                    ]);
                    exit;
                }
            }
            
            echo json_encode(["success" => false]);
        break;

        case 'fetch_users':
            // Prioritizes explicit Pending/Offline statuses, then calculates the 20-min Idle window
            $stmt = $pdo->prepare("
                SELECT u.user_id, u.first_name, u.middle_initial, u.last_name, u.last_login, r.role_name, u.role_id,
                       IF(u.status = 'Pending', 'Pending', 
                          IF(u.status = 'Offline', 'Offline', 
                             IF(u.last_active >= NOW() - INTERVAL 20 MINUTE, 'Online', 'Idle')
                          )
                       ) AS status 
                FROM users u 
                JOIN roles r ON u.role_id = r.role_id 
                ORDER BY u.role_id ASC, u.first_name ASC, u.last_name ASC
            ");
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(["success" => true, "users" => $users]);
        break;

        case 'update_user_access':
            $targetUserId = $_POST['target_user_id'] ?? '';
            $newStatus = trim($_POST['new_status'] ?? '');
            $newRoleId = $_POST['new_role_id'] ?? '';

            if (empty($targetUserId) || empty($newStatus) || empty($newRoleId)) {
                echo json_encode([
                    "success" => false, 
                    "message" => "Missing required data."
                ]);
                exit;
            }

            // Update the user's status (e.g., from Pending to Active) and their role
            $updateStmt = $pdo->prepare('UPDATE users SET status = ?, role_id = ? WHERE user_id = ?');
            if ($updateStmt->execute([$newStatus, $newRoleId, $targetUserId])) {
                echo json_encode([
                    "success" => true, 
                    "message" => "User access updated successfully."
                    ]);
            } else {
                echo json_encode([
                    "success" => false, 
                    "message" => "Failed to update user in the database."
                ]);
            }
        break;

        case 'approve_user':
            $targetId = $_POST['target_id'] ?? '';
            
            if ($targetId) {
                // Change status from Pending to Offline
                $pdo->prepare("UPDATE users SET status = 'Offline' WHERE user_id = ?")->execute([$targetId]);
                echo json_encode(["success" => true]);
            } else {
                echo json_encode(["success" => false, "message" => "No user ID provided."]);
            }
        break;

        case 'void_user':
            $targetId = $_POST['target_id'] ?? '';
            if ($targetId) {
                // Safety check: Ensure ONLY pending accounts can be deleted this way
                $pdo->prepare("DELETE FROM users WHERE user_id = ? AND status = 'Pending'")->execute([$targetId]);
                echo json_encode(["success" => true]);
            } else {
                echo json_encode(["success" => false, "message" => "No user ID provided."]);
            }
        break;

        case 'promote_user':
            $targetId = $_POST['target_id'] ?? '';
            if ($targetId) {
                // Role ID 1 represents the "Owner" in the roles table
                $pdo->prepare("UPDATE users SET role_id = 1 WHERE user_id = ?")->execute([$targetId]);
                echo json_encode(["success" => true]);
            } else {
                echo json_encode(["success" => false, "message" => "No user ID provided."]);
            }
        break;

        case 'get_profile':
            if (!isset($_SESSION['user_id'])) {
                echo json_encode(["success" => false]); exit;
            }
            $stmt = $pdo->prepare("SELECT first_name, middle_initial, last_name, email, phone_number, username FROM users WHERE user_id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            echo json_encode(["success" => true, "profile" => $stmt->fetch()]);
        break;

        case 'update_profile':
            if (!isset($_SESSION['user_id'])) {
                echo json_encode(["success" => false, "message" => "Unauthorized session."]); exit;
            }

            $fn = trim($_POST['first_name'] ?? '');
            $mi = strtoupper(str_replace('.', '', trim($_POST['middle_initial'] ?? '')));
            $ln = trim($_POST['last_name'] ?? '');
            $em = trim($_POST['email'] ?? '');
            $ph = trim($_POST['phone_number'] ?? '');
            $un = trim($_POST['username'] ?? '');

            if (empty($fn) || empty($ln) || empty($em) || empty($un)) {
                echo json_encode(["success" => false, "message" => "First Name, Last Name, Email, and Username are required."]); exit;
            }

            // Verify the requested username is not already taken by ANOTHER user
            $checkStmt = $pdo->prepare('SELECT user_id FROM users WHERE username = ? AND user_id != ?');
            $checkStmt->execute([$un, $_SESSION['user_id']]);
            if($checkStmt->fetch()) {
                echo json_encode(["success" => false, "message" => "That username is already taken by another account."]);
                exit;
            }

            $stmt = $pdo->prepare("UPDATE users SET first_name = ?, middle_initial = ?, last_name = ?, email = ?, phone_number = ?, username = ? WHERE user_id = ?");
            if ($stmt->execute([$fn, $mi, $ln, $em, $ph, $un, $_SESSION['user_id']])) {
                echo json_encode(["success" => true]);
            } else {
                echo json_encode(["success" => false, "message" => "Database update failed."]);
            }
        break;

        case 'update_phone':
            if (!isset($_SESSION['user_id'])) {
                echo json_encode(["success" => false, "message" => "Unauthorized session."]); 
                exit;
            }

            $newPhone = trim($_POST['phone_number'] ?? '');
            
            if (empty($newPhone)) {
                echo json_encode(["success" => false, "message" => "Phone number cannot be empty."]); 
                exit;
            }

            try {
                $stmt = $pdo->prepare("UPDATE users SET phone_number = ?, sms_alerts_enabled = 1 WHERE user_id = ?");
                if ($stmt->execute([$newPhone, $_SESSION['user_id']])) {
                    echo json_encode(["success" => true, "message" => "Phone number updated successfully."]);
                } else {
                    echo json_encode(["success" => false, "message" => "Failed to update database."]);
                }
            } catch (PDOException $e) {
                echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
            }
        break;

        // Saves the ON/OFF toggle state to the database
        case 'toggle_sms':
            if (!isset($_SESSION['user_id'])) {
                echo json_encode(["success" => false, "message" => "Unauthorized session."]); 
                exit;
            }

            $isEnabled = $_POST['is_enabled'] === 'true' ? 1 : 0;
            
            try {
                $stmt = $pdo->prepare("UPDATE users SET sms_alerts_enabled = ? WHERE user_id = ?");
                if ($stmt->execute([$isEnabled, $_SESSION['user_id']])) {
                    echo json_encode(["success" => true]);
                } else {
                    echo json_encode(["success" => false]);
                }
            } catch (PDOException $e) {
                echo json_encode(["success" => false]);
            }
        break;

        case 'update_password':
            // 1. Ensure they are actually logged in
            if (!isset($_SESSION['user_id'])) {
                echo json_encode(["success" => false, "message" => "Unauthorized session."]);
                exit;
            }

            $currentPwd = $_POST['current_password'] ?? '';
            $newPwd = $_POST['new_password'] ?? '';

            // 2. Fetch their current password from the database
            $stmt = $pdo->prepare("SELECT password FROM users WHERE user_id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            $user = $stmt->fetch();

            // 3. Verify the old password matches
            if ($user['password'] !== $currentPwd) {
                echo json_encode(["success" => false, "message" => "Incorrect current password."]);
                exit;
            }

            // 4. Save the new password
            $update = $pdo->prepare("UPDATE users SET password = ? WHERE user_id = ?");
            if ($update->execute([$newPwd, $_SESSION['user_id']])) {
                echo json_encode(["success" => true]);
            } else {
                echo json_encode(["success" => false, "message" => "Database error."]);
            }
        break;

        default:
            echo json_encode([
                "success" => false, 
                "message" => "Invalid action."
            ]);
        break;
    }
?>


