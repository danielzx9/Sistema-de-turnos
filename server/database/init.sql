-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 10, 2025 at 05:38 AM
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
-- Database: `mydb`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `idadmins` int(11) NOT NULL,
  `barbershop_id` int(11) DEFAULT NULL,
  `username` varchar(45) NOT NULL,
  `email` varchar(45) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(45) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`idadmins`, `barbershop_id`, `username`, `email`, `password`, `name`, `created_at`, `updated_at`) VALUES
(1, 1, 'admin', 'admin@mibarberia.com', '$2a$10$lj032hOIcgOrtz/2KXFB4.T9Fid58NMKHPbSlsqGUvWQqlWdld/rG', 'Administrador', '2025-09-25 11:05:12', '2025-09-25 11:05:12');

-- --------------------------------------------------------

--
-- Table structure for table `appointments`
--

CREATE TABLE `appointments` (
  `idappointments` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `service_id` int(11) DEFAULT NULL,
  `barbershop_id` int(11) DEFAULT NULL,
  `barber_id` int(11) DEFAULT NULL,
  `appointment_date` date NOT NULL,
  `appointment_time` datetime NOT NULL,
  `status` enum('pending','notavailable','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
  `notes` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `appointments`
--


-- --------------------------------------------------------

--
-- Table structure for table `barbers`
--

CREATE TABLE `barbers` (
  `idbarbers` int(11) NOT NULL,
  `barbershop_id` int(11) NOT NULL,
  `name` varchar(45) NOT NULL,
  `phone` varchar(45) DEFAULT NULL,
  `is_active` tinyint(4) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `barbers`
--

INSERT INTO `barbers` (`idbarbers`, `barbershop_id`, `name`, `phone`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'Barbero Principal', '+1234567890', 1, '2025-09-25 11:05:12', '2025-09-25 11:05:12');

-- --------------------------------------------------------

--
-- Table structure for table `barbershops`
--

CREATE TABLE `barbershops` (
  `idbarbershops` int(11) NOT NULL,
  `business_name` varchar(45) NOT NULL,
  `business_phone` varchar(45) DEFAULT NULL,
  `business_address` varchar(45) DEFAULT NULL,
  `business_email` varchar(45) DEFAULT NULL,
  `open_time` varchar(45) DEFAULT '8:00',
  `close_time` varchar(45) DEFAULT '18:00',
  `slot_duration` int(11) DEFAULT 30,
  `working_days` varchar(45) DEFAULT '1,2,3,4,5,6',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `license_key` varchar(100) DEFAULT NULL,
  `license_start` date DEFAULT NULL,
  `license_end` date DEFAULT NULL,
  `license_status` enum('active','expired','trial','suspended') DEFAULT 'trial',
  `plan_type` enum('basic','premium') DEFAULT 'basic'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `barbershops`
--

INSERT INTO `barbershops` (`idbarbershops`, `business_name`, `business_phone`, `business_address`, `business_email`, `open_time`, `close_time`, `slot_duration`, `working_days`, `created_at`, `updated_at`, `license_key`, `license_start`, `license_end`, `license_status`, `plan_type`) VALUES
(1, 'hola', '573011875263', 'Carrea 9 #11', 'contacto@mibarberia.com', '08:00', '20:00', 30, '1,2,3,4,5,6,0', '2025-09-25 11:05:12', '2025-10-09 21:06:28', NULL, NULL, '2025-10-31', 'active', 'basic');

-- --------------------------------------------------------

--
-- Table structure for table `barber_services`
--

CREATE TABLE `barber_services` (
  `idbarber_services` int(11) NOT NULL,
  `barber_id` int(11) DEFAULT NULL,
  `service_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `barber_services`
--

INSERT INTO `barber_services` (`idbarber_services`, `barber_id`, `service_id`) VALUES
(0, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `clients`
--

CREATE TABLE `clients` (
  `idclients` int(11) NOT NULL,
  `barbershop_id` int(11) DEFAULT NULL,
  `name` varchar(45) NOT NULL,
  `phone` varchar(45) NOT NULL,
  `email` varchar(45) DEFAULT NULL,
  `whatsapp` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clients`
--

INSERT INTO `clients` (`idclients`, `barbershop_id`, `name`, `phone`, `email`, `whatsapp`, `created_at`, `updated_at`) VALUES
(1, 1, 'Daniel', '573114812310', NULL, NULL, '2025-09-25 11:23:03', '2025-10-09 21:04:59'),
(5, 1, 'Juan monte guerra', '573104171721', NULL, NULL, '2025-10-08 21:17:36', '2025-10-09 20:48:56');

-- --------------------------------------------------------

--
-- Table structure for table `services`
--

CREATE TABLE `services` (
  `idservices` int(11) NOT NULL,
  `barbershop_id` int(11) DEFAULT NULL,
  `name` varchar(45) NOT NULL,
  `description` varchar(45) DEFAULT NULL,
  `duration` int(11) NOT NULL,
  `price` decimal(10,0) DEFAULT NULL,
  `is_active` tinyint(4) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `services`
--

INSERT INTO `services` (`idservices`, `barbershop_id`, `name`, `description`, `duration`, `price`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 1, 'Corte de cabello', 'Corte de cabello profesional', 30, 15, 1, '2025-09-25 11:05:12', '2025-09-25 11:05:12'),
(2, 1, 'Barba', 'Arreglo de barba y bigote', 20, 10, 1, '2025-09-25 11:05:12', '2025-09-25 11:05:12');

-- --------------------------------------------------------

--
-- Table structure for table `special_schedules`
--

CREATE TABLE `special_schedules` (
  `idspecial_schedules` int(11) NOT NULL,
  `barbershop_id` int(11) DEFAULT NULL,
  `date` date NOT NULL,
  `is_closed` tinyint(4) DEFAULT 0,
  `open_time` varchar(45) DEFAULT NULL,
  `close_time` varchar(45) DEFAULT NULL,
  `notes` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`idadmins`),
  ADD KEY `fk_admins_1` (`barbershop_id`);

--
-- Indexes for table `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`idappointments`),
  ADD KEY `clientId` (`client_id`),
  ADD KEY `serviceId` (`service_id`),
  ADD KEY `fk_appointments_1` (`barbershop_id`),
  ADD KEY `fk_appointments_2` (`barber_id`);

--
-- Indexes for table `barbers`
--
ALTER TABLE `barbers`
  ADD PRIMARY KEY (`idbarbers`),
  ADD KEY `fk_barbers_1` (`barbershop_id`);

--
-- Indexes for table `barbershops`
--
ALTER TABLE `barbershops`
  ADD PRIMARY KEY (`idbarbershops`);

--
-- Indexes for table `barber_services`
--
ALTER TABLE `barber_services`
  ADD PRIMARY KEY (`idbarber_services`),
  ADD KEY `fk_barber_services_1` (`barber_id`),
  ADD KEY `fk_barber_services_2` (`service_id`);

--
-- Indexes for table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`idclients`),
  ADD KEY `barber` (`barbershop_id`);

--
-- Indexes for table `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`idservices`),
  ADD KEY `fk_services_1` (`barbershop_id`);

--
-- Indexes for table `special_schedules`
--
ALTER TABLE `special_schedules`
  ADD PRIMARY KEY (`idspecial_schedules`),
  ADD KEY `fk_special_schedules_1` (`barbershop_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `idadmins` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `appointments`
--
ALTER TABLE `appointments`
  MODIFY `idappointments` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=60;

--
-- AUTO_INCREMENT for table `barbers`
--
ALTER TABLE `barbers`
  MODIFY `idbarbers` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `barbershops`
--
ALTER TABLE `barbershops`
  MODIFY `idbarbershops` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `clients`
--
ALTER TABLE `clients`
  MODIFY `idclients` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `services`
--
ALTER TABLE `services`
  MODIFY `idservices` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `special_schedules`
--
ALTER TABLE `special_schedules`
  MODIFY `idspecial_schedules` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admins`
--
ALTER TABLE `admins`
  ADD CONSTRAINT `fk_admins_1` FOREIGN KEY (`barbershop_id`) REFERENCES `barbershops` (`idbarbershops`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `appointments`
--
ALTER TABLE `appointments`
  ADD CONSTRAINT `clientId` FOREIGN KEY (`client_id`) REFERENCES `clients` (`idclients`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_appointments_1` FOREIGN KEY (`barbershop_id`) REFERENCES `barbershops` (`idbarbershops`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_appointments_2` FOREIGN KEY (`barber_id`) REFERENCES `barbers` (`idbarbers`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `serviceId` FOREIGN KEY (`service_id`) REFERENCES `services` (`idservices`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `barbers`
--
ALTER TABLE `barbers`
  ADD CONSTRAINT `fk_barbers_1` FOREIGN KEY (`barbershop_id`) REFERENCES `barbershops` (`idbarbershops`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `barber_services`
--
ALTER TABLE `barber_services`
  ADD CONSTRAINT `fk_barber_services_1` FOREIGN KEY (`barber_id`) REFERENCES `barbers` (`idbarbers`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_barber_services_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`idservices`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `clients`
--
ALTER TABLE `clients`
  ADD CONSTRAINT `barber` FOREIGN KEY (`barbershop_id`) REFERENCES `barbershops` (`idbarbershops`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `services`
--
ALTER TABLE `services`
  ADD CONSTRAINT `fk_services_1` FOREIGN KEY (`barbershop_id`) REFERENCES `barbershops` (`idbarbershops`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `special_schedules`
--
ALTER TABLE `special_schedules`
  ADD CONSTRAINT `fk_special_schedules_1` FOREIGN KEY (`barbershop_id`) REFERENCES `barbershops` (`idbarbershops`) ON DELETE NO ACTION ON UPDATE NO ACTION;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
