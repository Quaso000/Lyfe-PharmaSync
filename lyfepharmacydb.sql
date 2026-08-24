-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 24, 2026 at 08:16 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `lyfepharmacydb`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `log_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action_type` text NOT NULL,
  `description` text NOT NULL,
  `timestamp` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_batches`
--

CREATE TABLE `inventory_batches` (
  `batch_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `batch_number` text NOT NULL,
  `expiry_date` date NOT NULL,
  `quantity_in_stock` int(11) NOT NULL,
  `selling_price` decimal(10,2) NOT NULL,
  `smart_pricing_status` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventory_batches`
--

INSERT INTO `inventory_batches` (`batch_id`, `product_id`, `batch_number`, `expiry_date`, `quantity_in_stock`, `selling_price`, `smart_pricing_status`) VALUES
(1, 1, 'B-101', '2027-05-10', 350, 13.00, 'Inactive'),
(2, 2, 'B-102', '2027-11-20', 15, 5.00, 'Inactive'),
(3, 3, 'B-103', '2026-04-15', 120, 150.00, 'Inactive'),
(4, 4, 'B-104', '2028-01-12', 200, 9.00, 'Inactive'),
(5, 5, 'B-105', '2026-08-30', 85, 15.00, 'Inactive'),
(6, 6, 'B-106', '2027-02-28', 50, 6.00, 'Inactive'),
(7, 7, 'B-107', '2028-11-05', 300, 5.00, 'Inactive'),
(8, 8, 'B-108', '2026-05-20', 18, 22.00, 'Inactive'),
(9, 9, 'B-109', '2027-09-15', 150, 35.00, 'Inactive'),
(10, 10, 'B-110', '2026-04-18', 110, 12.00, 'Inactive');

-- --------------------------------------------------------

--
-- Table structure for table `po_items`
--

CREATE TABLE `po_items` (
  `po_item_id` int(11) NOT NULL,
  `po_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `recommended_quantity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `product_id` int(11) NOT NULL,
  `barcode` text NOT NULL,
  `generic_name` text NOT NULL,
  `brand_name` text NOT NULL,
  `category` text NOT NULL,
  `reorder_level` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`product_id`, `barcode`, `generic_name`, `brand_name`, `category`, `reorder_level`) VALUES
(1, 'BAR-101', 'Amoxicillin 500mg Cap', 'Generic', 'Antibiotic', 50),
(2, 'BAR-102', 'Paracetamol 500mg Tab', 'Generic', 'Analgesic', 50),
(3, 'BAR-103', 'Ascorbic Acid (Vit C)', 'Generic', 'Vitamins', 50),
(4, 'BAR-104', 'Ibuprofen 400mg Tab', 'Generic', 'NSAID', 50),
(5, 'BAR-105', 'Cetirizine 10mg Tab', 'Generic', 'Antihistamine', 50),
(6, 'BAR-106', 'Loperamide 2mg Cap', 'Generic', 'Antidiarrheal', 50),
(7, 'BAR-107', 'Salbutamol 2mg Tab', 'Generic', 'Bronchodilator', 50),
(8, 'BAR-108', 'Losartan 50mg Tab', 'Generic', 'Antihypertensive', 50),
(9, 'BAR-109', 'Omeprazole 20mg Cap', 'Generic', 'PPI', 50),
(10, 'BAR-110', 'Mefenamic Acid 500mg', 'Generic', 'NSAID', 50);

-- --------------------------------------------------------

--
-- Table structure for table `purchase_orders`
--

CREATE TABLE `purchase_orders` (
  `po_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `date_generated` date NOT NULL,
  `status` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `role_id` int(11) NOT NULL,
  `role_name` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`role_id`, `role_name`) VALUES
(1, 'Owner'),
(2, 'Employee');

-- --------------------------------------------------------

--
-- Table structure for table `sales_items`
--

CREATE TABLE `sales_items` (
  `sales_item_id` int(11) NOT NULL,
  `transaction_id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL,
  `quantity_sold` int(11) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sales_items`
--

INSERT INTO `sales_items` (`sales_item_id`, `transaction_id`, `batch_id`, `quantity_sold`, `subtotal`) VALUES
(1, 1, 2, 1, 5.00),
(2, 1, 5, 1, 15.00),
(3, 2, 8, 1, 22.00),
(4, 2, 3, 1, 150.00),
(5, 3, 1, 1, 13.00),
(6, 4, 10, 1, 12.00),
(7, 4, 6, 1, 6.00),
(8, 4, 7, 1, 5.00);

-- --------------------------------------------------------

--
-- Table structure for table `sales_transactions`
--

CREATE TABLE `sales_transactions` (
  `transaction_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `transaction_date` date NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `payment_method` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sales_transactions`
--

INSERT INTO `sales_transactions` (`transaction_id`, `user_id`, `transaction_date`, `total_amount`, `payment_method`) VALUES
(1, 2, '2026-07-15', 20.00, 'Cash'),
(2, 3, '2026-07-15', 172.00, 'Cash'),
(3, 2, '2026-07-15', 13.00, 'Cash'),
(4, 3, '2026-07-15', 22.00, 'Cash');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `first_name` text NOT NULL,
  `middle_initial` varchar(5) NOT NULL,
  `last_name` text NOT NULL,
  `phone_number` varchar(15) NOT NULL,
  `email` text NOT NULL,
  `username` text NOT NULL,
  `password` text NOT NULL,
  `status` text NOT NULL,
  `last_login` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `role_id`, `first_name`, `middle_initial`, `last_name`, `phone_number`, `email`, `username`, `password`, `status`, `last_login`) VALUES
(1, 1, 'John Kaye', '', 'Fernandez', '', 'admin', 'johnkaye123', 'lyfe2026', 'Offline', '2026-08-24 03:17:26'),
(2, 2, 'Joseph', '', 'Osena', '', 'joseph_staff', 'osep123', 'lyfe2026', 'Offline', '2026-08-24 03:07:24'),
(3, 2, 'Francis', '', 'Mariscal', '', 'francis_staff', 'francis123', 'lyfe2026', 'Offline', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `inventory_batches`
--
ALTER TABLE `inventory_batches`
  ADD PRIMARY KEY (`batch_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `po_items`
--
ALTER TABLE `po_items`
  ADD PRIMARY KEY (`po_item_id`),
  ADD KEY `po_id` (`po_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`);

--
-- Indexes for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`po_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`role_id`);

--
-- Indexes for table `sales_items`
--
ALTER TABLE `sales_items`
  ADD PRIMARY KEY (`sales_item_id`),
  ADD KEY `transaction_id` (`transaction_id`),
  ADD KEY `batch_id` (`batch_id`);

--
-- Indexes for table `sales_transactions`
--
ALTER TABLE `sales_transactions`
  ADD PRIMARY KEY (`transaction_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `role_id` (`role_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `inventory_batches`
--
ALTER TABLE `inventory_batches`
  ADD CONSTRAINT `inventory_batches_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);

--
-- Constraints for table `po_items`
--
ALTER TABLE `po_items`
  ADD CONSTRAINT `po_items_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`po_id`),
  ADD CONSTRAINT `po_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);

--
-- Constraints for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `sales_items`
--
ALTER TABLE `sales_items`
  ADD CONSTRAINT `sales_items_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `sales_transactions` (`transaction_id`),
  ADD CONSTRAINT `sales_items_ibfk_2` FOREIGN KEY (`batch_id`) REFERENCES `inventory_batches` (`batch_id`);

--
-- Constraints for table `sales_transactions`
--
ALTER TABLE `sales_transactions`
  ADD CONSTRAINT `sales_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
