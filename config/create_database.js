const bcrypt = require('bcrypt-nodejs');
const connectionDetails = require('./db_config');
const pool = require('./dbConnection');

async function createTables() {
  await pool.query(`CREATE DATABASE IF NOT EXISTS \`${connectionDetails.database}\``);
  await pool.query(`USE \`${connectionDetails.database}\``);

  const queries = [
    `
      CREATE TABLE IF NOT EXISTS \`${connectionDetails.database}\`.\`${connectionDetails.users_table}\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`username\` VARCHAR(20) NOT NULL,
        \`password\` CHAR(60) NOT NULL,
        \`active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`designation\` VARCHAR(20) NOT NULL,
        \`device_token\` TEXT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`id_UNIQUE\` (\`id\` DESC),
        UNIQUE INDEX \`username_UNIQUE\` (\`username\` ASC)
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS \`${connectionDetails.database}\`.\`${connectionDetails.locations_table}\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(100) NOT NULL,
        \`description\` TEXT NULL,
        \`boundary\` JSON NULL,
        \`camera_user\` VARCHAR(100) NULL,
        \`camera_pass\` VARCHAR(100) NULL,
        \`border_color\` VARCHAR(20) NOT NULL DEFAULT "red",
        \`fill_color\` VARCHAR(20) NOT NULL DEFAULT "red",
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`id_UNIQUE\` (\`id\` DESC)
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS \`${connectionDetails.database}\`.\`${connectionDetails.zones_table}\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`location_id\` INT UNSIGNED NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`coordinates\` JSON NULL,
        \`border_color\` VARCHAR(20) NOT NULL DEFAULT "black",
        \`fill_color\` VARCHAR(20) NOT NULL DEFAULT "gray",
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`id_UNIQUE\` (\`id\` DESC),
        CONSTRAINT \`fk_zones_location\` FOREIGN KEY (\`location_id\`) REFERENCES \`locations\`(\`id\`) ON DELETE CASCADE
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS \`${connectionDetails.database}\`.\`${connectionDetails.poles_table}\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`zone_id\` INT UNSIGNED NOT NULL,
        \`code\` VARCHAR(100) NOT NULL,
        \`router_ip\` VARCHAR(50) NULL,
        \`router_vpn_ip\` VARCHAR(50) NULL,
        \`lat\` DECIMAL(10,8) NULL,
        \`lng\` DECIMAL(11,8) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`id_UNIQUE\` (\`id\` DESC),
        UNIQUE INDEX \`code_UNIQUE\` (\`code\` ASC),
        INDEX \`zone_id_idx\` (\`zone_id\`),
        CONSTRAINT \`fk_poles_zone\` FOREIGN KEY (\`zone_id\`) REFERENCES \`${connectionDetails.database}\`.\`${connectionDetails.zones_table}\`(\`id\`) ON DELETE CASCADE
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS \`${connectionDetails.database}\`.\`${connectionDetails.cameras_table}\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`pole_id\` INT UNSIGNED NOT NULL,
        \`camera_ip\` VARCHAR(50) NOT NULL,
        \`number_of_parking\` INT UNSIGNED NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`id_UNIQUE\` (\`id\` DESC),
        INDEX \`pole_id_idx\` (\`pole_id\`),
        CONSTRAINT \`fk_cameras_pole\` FOREIGN KEY (\`pole_id\`) REFERENCES \`${connectionDetails.database}\`.\`${connectionDetails.poles_table}\`(\`id\`) ON DELETE CASCADE
      )
    `,
    `
      CREATE TABLE \`${connectionDetails.database}\`.\`${connectionDetails.log_table}\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`id_UNIQUE\` (\`id\` DESC),
        \`descreption\` TEXT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS \`${connectionDetails.database}\`.\`${connectionDetails.notification_table}\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`user_id\` INT UNSIGNED NOT NULL,
        \`pole_router_ip\` VARCHAR(50) NOT NULL,
        \`pole_code\` VARCHAR(50) NOT NULL,
        \`description\` TEXT NULL,
        \`note\` TEXT NULL,
        \`isRead\` TINYINT(1) NOT NULL DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`id_UNIQUE\` (\`id\` DESC),
        INDEX \`user_id_idx\` (\`user_id\`),
        CONSTRAINT \`fk_notification_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`${connectionDetails.database}\`.\`users\`(\`id\`) ON DELETE CASCADE
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS \`${connectionDetails.database}\`.\`${connectionDetails.permission_table}\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(100) NOT NULL,
        \`key\` VARCHAR(100) NOT NULL,
        \`description\` TEXT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`id_UNIQUE\` (\`id\` DESC),
        UNIQUE INDEX \`key_UNIQUE\` (\`key\` ASC)
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS \`${connectionDetails.database}\`.\`${connectionDetails.user_permission}\` (
        \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`user_id\` INT UNSIGNED NOT NULL,
        \`permission_id\` INT UNSIGNED NOT NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`user_id_idx\` (\`user_id\`),
        INDEX \`permission_id_idx\` (\`permission_id\`),
        CONSTRAINT \`fk_up_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`${connectionDetails.database}\`.\`${connectionDetails.users_table}\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_up_permission\` FOREIGN KEY (\`permission_id\`) REFERENCES \`${connectionDetails.database}\`.\`${connectionDetails.permission_table}\`(\`id\`) ON DELETE CASCADE
      )
    `,
  ];

  for (const query of queries) {
    await pool.query(query);
  }
}

async function seedData() {
  await pool.query(`USE \`${connectionDetails.database}\``);

  const userQuery = "INSERT INTO users ( username, password, active, designation) values (?,?,?,?)";
  const pass = bcrypt.hashSync(123456789, null, null);
  await pool.query(userQuery, ['admin', pass, 1, 'Admin']);

  const locationQuery = "INSERT INTO locations ( name, description, boundary, camera_user , camera_pass ) values (?,?,?,?,?)";
  await pool.query(locationQuery, ['test_location_1', 'test description', '[{"lat": 25.070156966356073, "lng": 55.1419716454384}, {"lat": 25.06809671853142, "lng": 55.141735611045085}, {"lat": 25.067873198995, "lng": 55.14561944969865}, {"lat": 25.070186120557747, "lng": 55.14581256874772}]', 'admin', 'Parkonic@123']);

  const zoneQuery = "INSERT INTO zones ( location_id, name, coordinates ) values (?,?,?)";
  await pool.query(zoneQuery, [1, 'Zone A', '[{"lat": 25.070111711686614, "lng": 55.14207088717195}, {"lat": 25.06815836364392, "lng": 55.141845581614696}, {"lat": 25.068109772499504, "lng": 55.14363729723664}, {"lat": 25.070101993614248, "lng": 55.1438089586136}]']);

  const poleQuery = "INSERT INTO poles ( zone_id, code, router_ip, router_vpn_ip, lat, lng ) values (?,?,?,?,?,?)";
  await pool.query(poleQuery, [1, 'P2', '192.168.1.2', '10.0.0.2', 25.06992616, 55.14263952]);

  const cameraQuery = "INSERT INTO cameras ( pole_id, camera_ip, number_of_parking ) values (?,?,?)";
  await pool.query(cameraQuery, [1, '10.11.5.144', 20]);
  await pool.query(cameraQuery, [1, '10.11.5.145', 15]);

  const permissionQuery = "INSERT INTO permissions (`name`, `key`, `description`) VALUES (?,?,?)";

  const permissions = [
    ['View Notifications', 'view_notification', 'users can view notifications'],
    ['Read Notification', 'read_notification', 'users can Read notifications'],
    ['Delete Notification', 'delete_notification', 'users can delete notifications'],
    ['View Permissions', 'view_permission', 'users can view permissions'],
    ['Edit Permission', 'edit_permission', 'users can edit permissions'],
    ['View Users', 'view_user', 'users can view users'],
    ['Create User', 'create_user', 'users can create users'],
    ['Edit User', 'edit_user', 'users can edit users'],
    ['Delete User', 'delete_user', 'users can delete users'],
    ['View Locations', 'view_location', 'users can view locations'],
    ['Create Location', 'create_location', 'users can create locations'],
    ['Edit Location', 'edit_location', 'users can edit locations'],
    ['Delete Location', 'delete_location', 'users can delete locations'],
    ['Restore Location', 'restore_location', 'users can restore locations'],
    ['View Zones', 'view_zone', 'users can view zones'],
    ['Create Zone', 'create_zone', 'users can create zones'],
  ];

  for (const permission of permissions) {
    await pool.query(permissionQuery, permission);
  }
}

async function main() {
  try {
    await createTables();
    await seedData();
    console.log('Database setup completed successfully.');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exitCode = 1;
  }
}

main();
