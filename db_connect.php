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
?>