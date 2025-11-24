const express = require('express');
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { verifyToken } = require('../config/auth');
const cameraModel = require('../models/Camera'); // your camera model
const Pagination = require('../utils/pagination');
const { getCamerasWithStatus , excecuteCameraBySocket} = require('../app');
const logger = require('../utils/logger');
const { requirePermission } = require("../middleware/permission_middleware");

/**
 * @openapi
 * /api/cameras:
 *   get:
 *     summary: Get paginated cameras.
 *     tags: [Cameras]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cameras returned.
 * /api/camera/{camera_id}:
 *   get:
 *     summary: Get a camera by ID.
 *     tags: [Cameras]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: camera_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Camera returned.
 * /api/create-camera:
 *   post:
 *     summary: Create a new camera.
 *     tags: [Cameras]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pole_id:
 *                 type: integer
 *               camera_ip:
 *                 type: string
 *     responses:
 *       200:
 *         description: Camera created.
 * /api/update-camera/{id}:
 *   put:
 *     summary: Update a camera.
 *     tags: [Cameras]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Camera updated.
 * /api/delete-camera/{id}:
 *   delete:
 *     summary: Soft delete a camera.
 *     tags: [Cameras]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Camera deleted.
 * /api/restore-camera/{id}:
 *   put:
 *     summary: Restore a deleted camera.
 *     tags: [Cameras]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Camera restored.
 * /api/cameras-pole/{pole_id}:
 *   get:
 *     summary: Get paginated cameras for a pole.
 *     tags: [Cameras]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pole_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cameras for the pole returned.
 * /api/cameras-zone/{zone_id}:
 *   get:
 *     summary: Get paginated cameras for a zone.
 *     tags: [Cameras]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: zone_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cameras for the zone returned.
 * /api/cameras_with_status/{pole_code}:
 *   get:
 *     summary: Get cameras with status for a pole code.
 *     tags: [Cameras]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pole_code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cameras status list returned.
 */
// Get all cameras without pagination
router.get('/cameras', verifyToken, requirePermission("view_camera"), async (req, res) => {
  try {
    logger.info("get cameras: ",{ admin: req.user,body: req.query });
    const page_id = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 9;
    const offset = (page_id - 1) * perPage;

    const totalCount = await cameraModel.getCamerasTotalCount();

    const currentPage = page_id;
    const pageUri = '/cameras';
    const Paginate = new Pagination(totalCount, currentPage, pageUri, perPage);

    const camerasPaginate = await cameraModel.getCamerasPaginate(perPage, offset);
    logger.success("get cameras successfully", {admin: req.user, totalCount: totalCount});
    res.json({
      message: 'Cameras fetched successfully',
      total: totalCount,
      data: camerasPaginate,
      links: Paginate.links()
    });
  } catch (err) {
    logger.error('get cameras failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// Get camera by id
router.get('/camera/:camera_id', verifyToken, requirePermission("view_camera"), async (req, res) => {
  try {
    logger.info("get camera by id: ",{ admin: req.user, body: req.params });
    const camera_id = req.params.camera_id;
    const camera = await cameraModel.getCameraById(camera_id);
    
    logger.success("get camera by id successfully", { admin: req.user, camera: camera });
    res.json({
      message: 'Camera fetched successfully',
      data: camera
    });
  } catch (err) {
    logger.error('get cameras failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// create new camera
router.post('/create-camera', verifyToken, requirePermission("create_camera"), upload.none(), async (req, res) => {
  try {
    logger.info("create camera: ",{ admin: req.user, body: req.body });
    const { pole_id, camera_ip, number_of_parking} = req.body;

    // Validate required fields
    if (!pole_id) {
      return res.status(400).json({ message: "Pole ID is required" });
    }
    if (!camera_ip) {
      return res.status(400).json({ message: "Camera IP is required" });
    }

    const result = await cameraModel.createCamera({
      pole_id: Number(pole_id),
      camera_ip: camera_ip || null,
      number_of_parking: number_of_parking !== undefined ? Number(number_of_parking) : null
    });
    const integration_data = {data:req.body, type:'create'};
    await excecuteCameraBySocket(integration_data);

    logger.success("get cameras successfully", { admin: req.user, result: result });
    res.json({
      message: 'Camera created successfully',
      data: result,
    });

  } catch (err) {
    logger.error('get cameras failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});


// update camera
router.put('/update-camera/:id', upload.none(), verifyToken, requirePermission("edit_camera"), async (req, res) => {
  try {
    logger.info("update camera: ",{ admin: req.user, body: req.body });
    const id = req.params.id;
    const { pole_id, camera_ip, number_of_parking } = req.body;
    const old_camera = await cameraModel.getCameraById(id);
    const result = await cameraModel.updateCamera(id, {
      pole_id,
      camera_ip,
      number_of_parking
    });

    if (!result) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    const integration_data = {data:req.body,old_camera_id:old_camera[0].camera_ip,type:'edit'};
    await excecuteCameraBySocket(integration_data);

    logger.success("update cameras successfully", { admin: req.user, result: result});
    res.json({
      message: 'Camera updated successfully',
      data: result
    });

  } catch (err) {
    logger.error('get cameras failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});



// Soft delete camera
router.delete('/delete-camera/:id', verifyToken, requirePermission("delete_camera"), async (req, res) => {
  try {
    logger.info("delete camera: ",{ admin: req.user, camera_id: req.params.id });
    const id = req.params.id;

    const old_camera = await cameraModel.getCameraById(id);
    const data = {pole_code: old_camera[0].pole_code};
    const integration_data = {data,old_camera_id:old_camera[0].camera_ip,type:'delete'};
    await excecuteCameraBySocket(integration_data);

    const result = await cameraModel.softDeleteCamera(id);

    if (!result) return res.status(400).json({ message: 'Camera not found or already deleted' });

    logger.success("delete camera successfully", { admin: req.user, old_camera: old_camera });
    res.json({
      message: 'Camera deleted successfully',
      data: result
    });

  } catch (err) {
    logger.error('get camera failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// Restore camera
router.put('/restore-camera/:id', verifyToken, requirePermission("restore_camera"), async (req, res) => {
  try {
    logger.info("restore camera: ",{ admin: req.user, camera_id: req.params.id });
    const id = req.params.id;

    const old_camera = await cameraModel.getDeletedCameraById(id);
    const data = {pole_code: old_camera[0].pole_code};
    const integration_data = {data,old_camera_id:old_camera[0].camera_ip,type:'restore'};
    await excecuteCameraBySocket(integration_data);

    const result = await cameraModel.restoreCamera(id);

    if (!result) return res.status(400).json({ message: 'Camera not found or not deleted' });
    
    logger.success("restore camera successfully", { admin: req.user, old_camera: old_camera });
    res.json({
      message: 'Camera restored successfully',
      data: result
    });

  } catch (err) {
    logger.error('get cameras failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// get cameras by pole id
router.get('/cameras-pole/:pole_id', verifyToken, requirePermission("view_camera"), async (req, res) => {
  try {
    logger.info("get cameras by pole: ",{ admin: req.user, pole_id: req.params.pole_id });
    const pole_id = parseInt(req.params.pole_id);
    const page_id = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 9;
    const offset = (page_id - 1) * perPage;

    // Get total cameras count for this pole
    const totalCountQuery = await cameraModel.getCamerasCountByPole(pole_id);

    const currentPage = page_id;
    const pageUri = `/cameras-pole/${pole_id}`;
    const Paginate = new Pagination(totalCountQuery, currentPage, pageUri, perPage);

    // Fetch paginated cameras for this pole
    const camerasByPole = await cameraModel.getCamerasByPole(pole_id, perPage, offset);

    logger.success("get pole's cameras successfully", { admin: req.user, total: totalCountQuery });
    res.json({
      message: 'Cameras for pole fetched successfully',
      total: totalCountQuery,
      data: camerasByPole,
      links: Paginate.links()
    });

  } catch (err) {
    logger.error('get cameras failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

// Get cameras by zone with pagination
router.get('/cameras-zone/:zone_id', verifyToken, requirePermission("view_camera"), async (req, res) => {
  try {
    logger.info("get cameras by zone: ",{ admin: req.user, body: req.query });
    const zone_id = parseInt(req.params.zone_id);
    const page_id = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 9;
    const offset = (page_id - 1) * perPage;

    const totalCountQuery = await cameraModel.getCamerasCountByZone(zone_id);

    const currentPage = page_id;
    const pageUri = `/cameras-zone/${zone_id}`;
    const Paginate = new Pagination(totalCountQuery, currentPage, pageUri, perPage);

    const camerasByZone = await cameraModel.getCamerasByZone(zone_id, perPage, offset);

    logger.success("get zone's cameras successfully", { admin: req.user, total: totalCountQuery });
    res.json({
      message: 'Cameras for zone fetched successfully',
      total: totalCountQuery,
      data: camerasByZone,
      links: Paginate.links()
    });

  } catch (err) {
    logger.error("get zone's cameras failed", { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

router.get("/cameras_with_status/:pole_code", verifyToken, requirePermission("view_camera"), async (req, res) => {
  try {
    logger.info("get cameras status: ",{ admin: req.user, pole_code: req.params.pole_code });
    const pole_code = req.params.pole_code;
    const cameras = await getCamerasWithStatus(pole_code);

    logger.success("get cameras status successfully", { admin: req.user, pole_code: pole_code });
    res.json(cameras);
  } catch (err) {
    logger.error('get cameras failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).send("Error fetching poles");
  }
});

module.exports = router;
