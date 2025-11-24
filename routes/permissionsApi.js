const express = require('express');
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { verifyToken } = require('../config/auth');
const permissionModel = require('../models/Permission');
const Pagination = require('../utils/pagination');
const logger = require('../utils/logger');
const { requirePermission } = require("../middleware/permission_middleware");

/**
 * @openapi
 * /api/user/{user_id}/permissions:
 *   get:
 *     summary: Get permissions for a user with status flags.
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User permissions returned.
 * /api/user-permissions/{user_id}:
 *   put:
 *     summary: Update permissions for a user.
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: User permissions updated.
 */
router.get('/user/:user_id/permissions', verifyToken, requirePermission("view_permission"), async (req, res) => {
  try {
    logger.info("get user permissions by user_d: ",{ admin: req.user, user_id: req.params.user_id });
    const user_id = req.params.user_id;
    const permissions = await permissionModel.getUserPermissionsWithStatus(user_id);

    logger.success("get user permissions by user_d", {admin: req.user, user_id: req.params.user_id});
    res.json({
      message: 'Permissions fetched successfully',
      data: permissions
    });
  } catch (err) {
    logger.error('get user permissions by user_d failed', { admin: req.user, user_id: req.params.user_id, error: err.message });
    console.error('Error fetching permissions:', err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// update user permissions
router.put('/user-permissions/:user_id', verifyToken, requirePermission("edit_permission"), upload.none(), async (req, res) => {
  try {
    logger.info("update user permissions: ",{ admin: req.user, user_id: req.params.user_id });
    const user_id = req.params.user_id;
    const { permissions } = req.body;

    // Ensure permissions is an array
    const parsedPermissions = Array.isArray(permissions)
      ? permissions
      : JSON.parse(permissions || '[]');

    const result = await permissionModel.updateUserPermissions(user_id, parsedPermissions);

    logger.success("update user permissions successfully ", {admin: req.user, user_id: req.params.user_id, result:result});
    res.json({
      message: 'User permissions updated successfully',
      data: result
    });

  } catch (err) {
    logger.error('update user permissions failed:', { admin: req.user, user_id: req.params.user_id, error: err.message });
    console.error('Error updating user permissions:', err);
    res.status(500).json({
      message: 'Database error',
      error: err.message
    });
  }
});

module.exports = router;