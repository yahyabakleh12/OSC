const express = require('express');
const router = express.Router();
const authRoutes = require("./authApi");
const locationsRoutes = require("./locationsApi");
const zonesRoutes = require("./zonesApi");
const PolesRoutes = require("./polesApi");
const CamerasRoutes = require("./camerasApi");
const NotificationsRoutes = require("./notificationsApi");
const PermissionsRoutes = require("./permissionsApi.js");
const UsersRoutes = require("./usersApi.js");

router.use(authRoutes);
router.use(locationsRoutes);
router.use(zonesRoutes);
router.use(PolesRoutes);
router.use(CamerasRoutes);
router.use(NotificationsRoutes);
router.use(PermissionsRoutes);
router.use(UsersRoutes);

module.exports = router;