<?php
    session_start();

    header('Content-Type: application/json');

    $host = 'localhost';  // to be replace by proper hosting sites
    $database = 'lyfepharmacydb';
    
    // user credential
    $user = 'root';  // to be replace by user;
    $pass = '';
    
    $dsn = "mysql:host=$host;dbname=$database;charset=utf8mb4";
    
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];
    
    try {
        $pdo = new PDO($dsn, $user, $pass, $options);
    } catch (\PDOException $e) {
        echo json_encode([
            "success" => false, 
            "message" => "Database connection Failed."
        ]);
        exit;
    }

    $action = $_POST['action'] ?? '';

    switch($action){
        case 'login':
            $usernameInput = trim($_POST['username'] ?? '');
            $passwordInput = $_POST['password'] ?? '';

            if(empty($usernameInput) || empty($passwordInput)){
                echo json_encode([
                    "success" => false, 
                    "message" => "Please enter username and password."
                ]);
                exit;
            }

            $sql = 'SELECT u.user_id, u.first_name, u.last_name, u.password, u.status, r.role_name 
                    FROM users u 
                    JOIN roles r ON u.role_id = r.role_id 
                    WHERE u.username = ?';

            $stmt = $pdo->prepare($sql);
            $stmt -> execute([$usernameInput]);
            $userRecord = $stmt->fetch();

            if (!$userRecord){
                echo json_encode([
                    "success" => false, 
                    "message" => "Invalid username or role authorization."
                ]);
                exit;
            }

            // Note: This checks raw passwords for development. 
            // In production, always use password_hash() when saving and password_verify() here.
            if ($passwordInput !== $userRecord['password']) {
                echo json_encode([
                    "success" => false, 
                    "message" => "Invalid password."
                ]);
                exit;
            }

            if (strtolower($userRecord['status']) === 'pending') {
                echo json_encode([
                    "success" => false, 
                    "message" => "Account is disabled or pending approval. Contact the Owner."
                ]);
                exit;
            }

            $_SESSION['user_id'] = $userRecord['user_id']; 
            $updateSession = $pdo->prepare("UPDATE users SET status = 'Online', last_login = NOW(), last_active = NOW() WHERE user_id = ?");
            $updateSession->execute([$userRecord['user_id']]);

            echo json_encode([
                "success" => true, 
                "user" => [
                    "id" => $userRecord['user_id'],
                    "name" => trim($userRecord['first_name'] . ' ' . $userRecord['last_name']),
                    "role" => $userRecord['role_name']
                ]
            ]);
        break;
        
        case 'signup':
            $firstName = trim($_POST['firstName'] ?? '');
            $middleInitial = trim($_POST['middleInitial'] ?? '');
            $surname = trim($_POST['surname'] ?? '');
            $phoneNumber = trim($_POST['phoneNumber'] ?? '');
            $email = trim($_POST['email'] ?? '');
            $username = trim($_POST['username'] ?? '');
            $passwrd = $_POST['password'] ?? '';
            $cfrmpasswrd = $_POST['cfrmpassword'] ?? '';

            if(empty($firstName) || empty($surname) || empty($phoneNumber) || empty($email) || empty($username) || empty($passwrd) || empty($cfrmpasswrd)){
                echo json_encode([
                    "success" => false, 
                    "message" => "All fields are required."
                ]);
                exit;
            }

            if($passwrd !== $cfrmpasswrd){
                echo json_encode([
                    "success" => false,
                    "message" => "The passwords you entered do not match."
                ]);
                exit;
            }

            $checkStmt = $pdo->prepare('SELECT user_id FROM users WHERE username = ?');
            $checkStmt->execute([$username]);
            if($checkStmt->fetch()) {
                echo json_encode([
                    "success" => false, 
                    "message" => "Username is already taken."
                ]);
                exit;
            }

            $roleStmt = $pdo->prepare('SELECT role_id FROM roles WHERE role_name = "Employee"');
            $roleStmt->execute();
            $roleRecord = $roleStmt->fetch();
            
            if(!$roleRecord) {
                echo json_encode([
                    "success" => false, 
                    "message" => "Default Employee role not found."
                ]);
                exit;
            }

            $defaultRoleId = $roleRecord['role_id'];

            $insertStmt = $pdo->prepare('INSERT INTO users (role_id, first_name, middle_initial, last_name, phone_number, email, username, password, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "Pending")');
            if($insertStmt->execute([$defaultRoleId, $firstName, $middleInitial, $surname, $phoneNumber, $email, $username, $passwrd])) {
                echo json_encode([
                    "success" => true, 
                    "message" => "Account request submitted. Waiting for Owner approval."
                ]);
            } else {
                echo json_encode([
                    "success" => false, 
                    "message" => "Failed to create account."
                ]);
            }
        break;

        case 'forgot_password':
            $identifier = trim($_POST['identifier'] ?? '');

            if (empty($identifier)){
                echo json_encode(["success" => false, "message" => "Please enter your username."]);
                exit;
            }

            // Check if the username exists in the database
            $stmt = $pdo->prepare('SELECT user_id, phone_number FROM users WHERE username = ?');
            $stmt->execute([$identifier]);
            $userRecord = $stmt->fetch();

            if (!$userRecord) {
                echo json_encode(["success" => false, "message" => "Username not found in the system."]);
                exit;
            }

            // Optional: Mask the phone number for security (e.g., 09123456789 -> 0912***6789)
            $phone = $userRecord['phone_number'];
            $maskedPhone = (strlen($phone) > 7) ? substr($phone, 0, 4) . '***' . substr($phone, -4) : "your registered number";

            echo json_encode([
                "success" => true, 
                "masked_phone" => $maskedPhone
            ]);

            // $identifier = trim($_POST['identifier'] ?? '');

            // if (empty($identifier)){
            //     echo json_encode([
            //         "success" => false, 
            //         "message" => "Please provide an email or username."
            //     ]);
            //     exit;
            // }

            // $stmt = $pdo -> prepare('SELECT user_id, phone_number FROM users WHERE username = ? OR email = ?');
            // $stmt->execute([$identifier, $identifier]);
            // $userRecord = $stmt -> fetch();

            // if (!$userRecord || empty($userRecord['phone_number'])){
            //     echo json_encode([
            //         "success" => false, 
            //         "message" => "No account found, or no mobile number is registered to this account."
            //     ]);
            //     exit;
            // }

            // $otpCode = rand(100000, 999999);

            // // $API_Key = '';
            // // $recipientNumber = $userRecord['phone_number'];
            // // $smsMessage = "Lyfe Pharmacy: Your password reset OTP is " . $otpCode . ". Do not share this code.";

            // // $ch = curl_init();
            // // $body = array(
            // //     'apikey' => $API_Key,
            // //     'number' => $recipientNumber,
            // //     'message' => $smsMessage,
            // //     // 'sendername' => 
            // // );

            // // // curl_setopt($ch, CURLOPT_URL, 'https://semaphore.co/api/v4/messages');
            // // curl_setopt($ch, CURLOPT_POST, 1);
            // // curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($body));
            // // curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

            // // $output = curl_exec($ch);
            // // $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            // // // curl_close($ch);

            // // if ($httpCode == 200){
            // //     echo json_encode([
            // //         "success" => true, 
            // //         "message" => "A password reset link has been simulated and 'sent' to the email on file."
            // //     ]);
            // // } else {
            // //     echo json_encode([
            // //         "success" => false, 
            // //         "message" => "System error: Failed to dispatch SMS. Please try again later."
            // //     ]);
            // // }

            // echo json_encode([
            //     "success" => true, 
            //     "message" => "A password reset link has been simulated and 'sent' to the email on file."
            // ]);

        break;

        case 'reset_password_default':
            $identifier = trim($_POST['identifier'] ?? '');

            if (empty($identifier)){
                echo json_encode(["success" => false, "message" => "Missing account identifier."]);
                exit;
            }

            // Explicitly overwrite the password to '123' in the database
            $stmt = $pdo->prepare("UPDATE users SET password = '123' WHERE username = ?");
            
            if ($stmt->execute([$identifier])) {
                echo json_encode(["success" => true]);
            } else {
                echo json_encode(["success" => false, "message" => "Database update failed."]);
            }
        break;

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
                $stmt = $pdo->prepare("SELECT u.first_name, u.last_name, r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = ?");
                $stmt->execute([$_SESSION['user_id']]);
                $user = $stmt->fetch();

                if ($user) {
                    // NEW: Instantly reactivate them to 'Online' if they just did a Ctrl+R reload
                    $pdo->prepare("UPDATE users SET status = 'Online', last_active = NOW() WHERE user_id = ?")->execute([$_SESSION['user_id']]);

                    echo json_encode([
                        "success" => true, 
                        "id" => $_SESSION['user_id'],
                        "name" => trim($user['first_name'] . ' ' . $user['last_name']),
                        "role" => $user['role_name']
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

        case 'logout':
            // Explicit log out sets them Offline AND destroys the persistent session
            $userId = $_POST['user_id'] ?? ($_SESSION['user_id'] ?? null);
            if(!empty($userId)) {
                $pdo->prepare("UPDATE users SET status = 'Offline' WHERE user_id = ?")->execute([$userId]);
            }
            session_destroy(); 
            echo json_encode(["success" => true]);
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