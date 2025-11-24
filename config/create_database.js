const mysql = require('mysql2');
var bcrypt = require('bcrypt-nodejs');
var connectionDetails = require('./db_config');

var connection = mysql.createConnection(connectionDetails.connection);

// connection.query('CREATE DATABASE ' + connectionDetails.database);
connection.query('CREATE DATABASE IF NOT EXISTS `' + connectionDetails.database + '`');


connection.query('\
CREATE TABLE IF NOT EXISTS `' + connectionDetails.database + '`.`' + connectionDetails.users_table + '` ( \
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, \
    `username` VARCHAR(20) NOT NULL, \
    `password` CHAR(60) NOT NULL, \
    `active` TINYINT(1) NOT NULL DEFAULT 1, \
    `designation` VARCHAR(20) NOT NULL, \
    `device_token` TEXT NULL, \
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \
    `deleted_at` TIMESTAMP NULL DEFAULT NULL, \
    PRIMARY KEY (`id`), \
    UNIQUE INDEX `id_UNIQUE` (`id` DESC), \
    UNIQUE INDEX `username_UNIQUE` (`username` ASC) \
)'); 


connection.query('\
CREATE TABLE IF NOT EXISTS `' + connectionDetails.database + '`.`' + connectionDetails.locations_table + '` ( \
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, \
    `name` VARCHAR(100) NOT NULL, \
    `description` TEXT NULL, \
    `boundary` JSON NULL, \
    `camera_user` VARCHAR(100) NULL, \
    `camera_pass` VARCHAR(100) NULL, \
    `border_color` VARCHAR(20) NOT NULL DEFAULT "red", \
    `fill_color` VARCHAR(20) NOT NULL DEFAULT "red", \
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \
    `deleted_at` TIMESTAMP NULL DEFAULT NULL, \
    PRIMARY KEY (`id`), \
    UNIQUE INDEX `id_UNIQUE` (`id` DESC) \
)');
connection.query('\
CREATE TABLE IF NOT EXISTS `' + connectionDetails.database + '`.`' + connectionDetails.zones_table + '` ( \
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, \
    `location_id` INT UNSIGNED NOT NULL, \
    `name` VARCHAR(100) NOT NULL, \
    `coordinates` JSON NULL, \
    `border_color` VARCHAR(20) NOT NULL DEFAULT "black", \
    `fill_color` VARCHAR(20) NOT NULL DEFAULT "gray", \
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \
    `deleted_at` TIMESTAMP NULL DEFAULT NULL, \
    PRIMARY KEY (`id`), \
    UNIQUE INDEX `id_UNIQUE` (`id` DESC), \
    CONSTRAINT `fk_zones_location` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE CASCADE \
)');
connection.query('\
CREATE TABLE IF NOT EXISTS `' + connectionDetails.database + '`.`' + connectionDetails.poles_table + '` ( \
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, \
    `zone_id` INT UNSIGNED NOT NULL, \
    `code` VARCHAR(100) NOT NULL, \
    `router_ip` VARCHAR(50) NULL, \
    `router_vpn_ip` VARCHAR(50) NULL, \
    `lat` DECIMAL(10,8) NULL, \
    `lng` DECIMAL(11,8) NULL, \
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \
    `deleted_at` TIMESTAMP NULL DEFAULT NULL, \
    PRIMARY KEY (`id`), \
    UNIQUE INDEX `id_UNIQUE` (`id` DESC), \
    UNIQUE INDEX `code_UNIQUE` (`code` ASC),\
    INDEX `zone_id_idx` (`zone_id`), \
    CONSTRAINT `fk_poles_zone` FOREIGN KEY (`zone_id`) REFERENCES `' + connectionDetails.database + '`.`' + connectionDetails.zones_table + '`(`id`) ON DELETE CASCADE \
)');

connection.query('\
CREATE TABLE IF NOT EXISTS `' + connectionDetails.database + '`.`' + connectionDetails.cameras_table + '` ( \
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, \
    `pole_id` INT UNSIGNED NOT NULL, \
    `camera_ip` VARCHAR(50) NOT NULL, \
    `number_of_parking` INT UNSIGNED NULL, \
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \
    `deleted_at` TIMESTAMP NULL DEFAULT NULL, \
    PRIMARY KEY (`id`), \
    UNIQUE INDEX `id_UNIQUE` (`id` DESC), \
    INDEX `pole_id_idx` (`pole_id`), \
    CONSTRAINT `fk_cameras_pole` FOREIGN KEY (`pole_id`) REFERENCES `' + connectionDetails.database + '`.`' + connectionDetails.poles_table + '`(`id`) ON DELETE CASCADE \
)');
connection.query('\
CREATE TABLE `' + connectionDetails.database + '`.`' + connectionDetails.log_table + '` ( \
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, \
        PRIMARY KEY (`id`), \
    UNIQUE INDEX `id_UNIQUE` (`id` DESC), \
    `descreption` TEXT NULL, \
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP \
)');
connection.query('\
CREATE TABLE IF NOT EXISTS `' + connectionDetails.database + '`.`' + connectionDetails.notification_table + '` ( \
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, \
    `user_id` INT UNSIGNED NOT NULL, \
    `pole_router_ip` VARCHAR(50) NOT NULL, \
    `pole_code` VARCHAR(50) NOT NULL, \
    `description` TEXT NULL, \
    `note` TEXT NULL, \
    `isRead` TINYINT(1) NOT NULL DEFAULT 0, \
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \
    PRIMARY KEY (`id`), \
    UNIQUE INDEX `id_UNIQUE` (`id` DESC), \
    INDEX `user_id_idx` (`user_id`), \
    CONSTRAINT `fk_notification_user` FOREIGN KEY (`user_id`) REFERENCES `' + connectionDetails.database + '`.`users`(`id`) ON DELETE CASCADE \
)');

connection.query('\
CREATE TABLE IF NOT EXISTS `' + connectionDetails.database + '`.`' + connectionDetails.permission_table + '` ( \
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, \
    `name` VARCHAR(100) NOT NULL, \
    `key` VARCHAR(100) NOT NULL, \
    `description` TEXT NULL, \
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, \
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \
    PRIMARY KEY (`id`), \
    UNIQUE INDEX `id_UNIQUE` (`id` DESC), \
    UNIQUE INDEX `key_UNIQUE` (`key` ASC) \
)');
connection.query('\
CREATE TABLE IF NOT EXISTS `' + connectionDetails.database + '`.`' + connectionDetails.user_permission + '` ( \
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, \
    `user_id` INT UNSIGNED NOT NULL, \
    `permission_id` INT UNSIGNED NOT NULL, \
    PRIMARY KEY (`id`), \
    INDEX `user_id_idx` (`user_id`), \
    INDEX `permission_id_idx` (`permission_id`), \
    CONSTRAINT `fk_up_user` FOREIGN KEY (`user_id`) REFERENCES `' + connectionDetails.database + '`.`' + connectionDetails.users_table + '` (`id`) ON DELETE CASCADE, \
    CONSTRAINT `fk_up_permission` FOREIGN KEY (`permission_id`) REFERENCES `' + connectionDetails.database + '`.`' + connectionDetails.permission_table + '`(`id`) ON DELETE CASCADE \
)');






connection.query('USE ' + connectionDetails.database);

// users
var insertQuery = "INSERT INTO users ( username, password, active, designation) values (?,?,?,?)";
var pass = bcrypt.hashSync(123456789, null, null);
connection.query(insertQuery,['admin',pass, 1, 'Admin']);
// connection.query(insertQuery,['Admin',pass, 0, 'Admin']);
// locations
var insertQuery = "INSERT INTO locations ( name, description, boundary, camera_user , camera_pass ) values (?,?,?,?,?)";
connection.query(insertQuery,['test_location_1','test description', '[{"lat": 25.070156966356073, "lng": 55.1419716454384}, {"lat": 25.06809671853142, "lng": 55.141735611045085}, {"lat": 25.067873198995, "lng": 55.14561944969865}, {"lat": 25.070186120557747, "lng": 55.14581256874772}]', 'admin', 'Parkonic@123']);
// connection.query(insertQuery,['test_location_2','test description2', '{"type":"Polygon","coordinates":[[[10,10],[10,20],[20,20],[20,10],[10,10]]]}', 'uptown_cam', 'pass456']);
// zones
var insertQuery = "INSERT INTO zones ( location_id, name, coordinates ) values (?,?,?)";
connection.query(insertQuery,[1, 'Zone A', '[{"lat": 25.070111711686614, "lng": 55.14207088717195}, {"lat": 25.06815836364392, "lng": 55.141845581614696}, {"lat": 25.068109772499504, "lng": 55.14363729723664}, {"lat": 25.070101993614248, "lng": 55.1438089586136}]']);
// connection.query(insertQuery,[1, 'Zone B', '{"type":"Polygon","coordinates":[[[5,5],[5,10],[10,10],[10,5],[5,5]]]}']);
// connection.query(insertQuery,[2, 'Zone C', '{"type":"Polygon","coordinates":[[[10,10],[10,15],[15,15],[15,10],[10,10]]]}']);
// poles
var insertQuery = "INSERT INTO poles ( zone_id, code, router_ip, router_vpn_ip, lat, lng ) values (?,?,?,?,?,?)";
// connection.query(insertQuery,[1, 'P1', '192.168.100.10', '10.0.0.10', 25.06992616, 55.14263952]);
connection.query(insertQuery,[1, 'P2', '192.168.1.2', '10.0.0.2', 25.06992616, 55.14263952]);
// connection.query(insertQuery,[2, 'P3', '192.168.2.1', '10.0.1.1', 25.2100, 55.2750]);
// cameras
var insertQuery = "INSERT INTO cameras ( pole_id, camera_ip, number_of_parking ) values (?,?,?)";
connection.query(insertQuery,[1, '10.11.5.144', 20]);
connection.query(insertQuery,[1, '10.11.5.145', 15]);
// connection.query(insertQuery,[2, '192.168.1.201', 10]);
// connection.query(insertQuery,[3, '192.168.2.101', 25]);

var insertQuery = "INSERT INTO permissions (`name`, `key`, `description`) VALUES (?,?,?)";

connection.query(insertQuery,['View Notifications', 'view_notification', 'users can view notifications']);
connection.query(insertQuery,['Read Notification', 'read_notification', 'users can Read notifications']);
connection.query(insertQuery,['Delete Notification', 'delete_notification', 'users can delete notifications']);

// connection.query(insertQuery,['View Logs', 'view_log', 'users can view Logs']);

connection.query(insertQuery,['View Permissions', 'view_permission', 'users can view permissions']);
// connection.query(insertQuery,['Create Permission', 'create_permission', 'users can create permissions']);
connection.query(insertQuery,['Edit Permission', 'edit_permission', 'users can edit permissions']);
// connection.query(insertQuery,['Delete Permission', 'delete_permission', 'users can delete permissions']);

connection.query(insertQuery,['View Users', 'view_user', 'users can view users']);
connection.query(insertQuery,['Create User', 'create_user', 'users can create users']);
connection.query(insertQuery,['Edit User', 'edit_user', 'users can edit users']);
connection.query(insertQuery,['Delete User', 'delete_user', 'users can delete users']);

connection.query(insertQuery,['View Locations', 'view_location', 'users can view locations']);
connection.query(insertQuery,['Create Location', 'create_location', 'users can create locations']);
connection.query(insertQuery,['Edit Location', 'edit_location', 'users can edit locations']);
connection.query(insertQuery,['Delete Location', 'delete_location', 'users can delete locations']);
connection.query(insertQuery,['Restore Location', 'restore_location', 'users can restore locations']);

connection.query(insertQuery,['View Zones', 'view_zone', 'users can view zones']);
connection.query(insertQuery,['Create Zone', 'create_zone', 'users can create zones']);
connection.query(insertQuery,['Edit Zone', 'edit_zone', 'users can edit zones']);
connection.query(insertQuery,['Delete Zone', 'delete_zone', 'users can delete zones']);
connection.query(insertQuery,['Restore Zone', 'restore_zone', 'users can restore zones']);

connection.query(insertQuery,['View Poles', 'view_pole', 'users can view poles']);
connection.query(insertQuery,['Create Pole', 'create_pole', 'users can create poles']);
connection.query(insertQuery,['Edit Pole', 'edit_pole', 'users can edit poles']);
connection.query(insertQuery,['Delete Pole', 'delete_pole', 'users can delete poles']);
connection.query(insertQuery,['Restore Pole', 'restore_pole', 'users can restor poles']);

connection.query(insertQuery,['View Cameras', 'view_camera', 'users can view cameras']);
connection.query(insertQuery,['Create Camera', 'create_camera', 'users can create cameras']);
connection.query(insertQuery,['Edit Camera', 'edit_camera', 'users can edit cameras']);
connection.query(insertQuery,['Delete Camera', 'delete_camera', 'users can delete cameras']);
connection.query(insertQuery,['Restore Camera', 'restore_camera', 'users can restore cameras']);

connection.query(insertQuery,['Restore User', 'restore_user', 'users can restore user']);

var insertQuery = "INSERT INTO user_permissions (user_id, permission_id) VALUES (?,?)";
connection.query(insertQuery,[1, 1]);
connection.query(insertQuery,[1, 2]);
connection.query(insertQuery,[1, 3]);
connection.query(insertQuery,[1, 4]);
connection.query(insertQuery,[1, 5]);
connection.query(insertQuery,[1, 6]);
connection.query(insertQuery,[1, 7]);
connection.query(insertQuery,[1, 8]);
connection.query(insertQuery,[1, 9]);
connection.query(insertQuery,[1, 10]);
connection.query(insertQuery,[1, 11]);
connection.query(insertQuery,[1, 12]);
connection.query(insertQuery,[1, 13]);
connection.query(insertQuery,[1, 14]);
connection.query(insertQuery,[1, 15]);
connection.query(insertQuery,[1, 16]);
connection.query(insertQuery,[1, 17]);
connection.query(insertQuery,[1, 18]);
connection.query(insertQuery,[1, 19]);
connection.query(insertQuery,[1, 20]);
connection.query(insertQuery,[1, 21]);
connection.query(insertQuery,[1, 22]);
connection.query(insertQuery,[1, 23]);
connection.query(insertQuery,[1, 24]);
connection.query(insertQuery,[1, 25]);
connection.query(insertQuery,[1, 26]);
connection.query(insertQuery,[1, 27]);
connection.query(insertQuery,[1, 28]);
connection.query(insertQuery,[1, 29]);
connection.query(insertQuery,[1, 30]);
// connection.query(insertQuery,[1, 31]);
// connection.query(insertQuery,[1, 32]);
// connection.query(insertQuery,[1, 33]);

console.log('Success: Database Created!')

connection.end();