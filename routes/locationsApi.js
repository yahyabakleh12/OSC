const express = require('express');
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { verifyToken } = require('../config/auth');
const locationModel = require('../models/Location');
const Pagination = require('../utils/pagination');
const logger = require('../utils/logger');
const { requirePermission } = require("../middleware/permission_middleware");

/**
 * @openapi
 * /api/locations-all:
 *   get:
 *     summary: Get all locations without pagination.
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all locations.
 */
// get all locations without paginate
router.get('/locations-all', verifyToken, requirePermission("view_location"), async (req, res) => {
  try {
    logger.info("get all locations without paginate.",{ admin: req.user });
    const locations = await locationModel.getLocations();
    
    logger.success("get all locations without paginate successfully.",{admin: req.user});
    res.json({
      message: 'Locations fetched successfully',
      data: locations,
    });
  } catch (err) {
    logger.error('get all locations without paginate failed.', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

/**
 * @openapi
 * /api/locations:
 *   get:
 *     summary: Get paginated locations with totals and zones count.
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated locations list.
 */
// get locations paginate with total and zones count
router.get('/locations', verifyToken, requirePermission("view_location"), async (req, res) => {
  try {
    logger.info("get locations: ",{ admin: req.user });
    const page_id = parseInt(req.query.page) || 1;
    const currentPage = page_id;
    const pageUri = '/locations';
    const perPage = parseInt(req.query.perPage) || 9;
    const totalCount = await locationModel.getLocationsTotalCount();
    const offset = (page_id - 1) * perPage;
    const Paginate = new Pagination(totalCount,currentPage,pageUri,perPage);
    const locationsPaginate = await locationModel.getLocationsPaginate(perPage,offset);

    logger.success("get locations successfully", { admin: req.user, total: totalCount });
    res.json({
      message: 'Locations fetched successfully',
      total: totalCount,
      data: locationsPaginate,
      links: Paginate.links()
    });
  } catch (err) {
    logger.error('get locations paginate failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

/**
 * @openapi
 * /api/location/{location_id}:
 *   get:
 *     summary: Get a location by ID.
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: location_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Location details returned.
 */
// get location by id
router.get('/location/:location_id', verifyToken, requirePermission("view_location"), async (req, res) => {
  try {
    logger.info("get location by id: ",{ admin: req.user, location_id: req.params.location_id });
    const location_id = req.params.location_id;
    const location = await locationModel.getLocationById(location_id);

    logger.success("get location by id successfully", { admin: req.user, location: location});
    res.json({
      message: 'location fetched successfully',
      data: location
    });
  } catch (err) {
    logger.error('get location by id failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err });
  }
});

/**
 * @openapi
 * /api/create-location:
 *   post:
 *     summary: Create a new location.
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               boundary:
 *                 type: string
 *               camera_user:
 *                 type: string
 *               camera_pass:
 *                 type: string
 *     responses:
 *       200:
 *         description: Location created successfully.
 */
// create new location
router.post('/create-location', verifyToken, requirePermission("create_location"), upload.none(), async (req, res) => {
  try {
    logger.info("create location: ",{ admin: req.user, body: req.body });
    const { name, description, boundary, camera_user, camera_pass, border_color, fill_color } = req.body;
    const boundaryObj = JSON.parse(boundary);
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const result = await locationModel.createLocation({
      name,
      description: description || null,
      boundary: boundary || null,
      camera_user: camera_user || null,
      camera_pass: camera_pass || null,
      border_color: border_color || 'red',
      fill_color: fill_color || 'red',
    });

    logger.success("create location successfully", { admin: req.user, result: result });
    res.json({
      message: 'Location created successfully',
      data: result,
    });

  } catch (err) {
    logger.error('create location failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @openapi
 * /api/update-location/{id}:
 *   put:
 *     summary: Update an existing location.
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Location updated successfully.
 */
// update location
router.put('/update-location/:id', upload.none(), verifyToken, requirePermission("edit_location"), async (req, res) => {
  try {
    logger.info("update location: ",{ admin: req.user, body: req.body });
    const id = req.params.id;
    const { name, description, boundary, camera_user, camera_pass, border_color, fill_color } = req.body;

    const result = await locationModel.updateLocation(id, {
      name,
      description,
      boundary,
      camera_user,
      camera_pass,
      border_color,
      fill_color,
    });

    if (!result) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    logger.success("update location successfully", { admin: req.user, result: result });
    res.json({
      message: 'Location updated successfully',
      data: result
    });

  } catch (err) {
    logger.error('update location failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @openapi
 * /api/delete-location/{id}:
 *   delete:
 *     summary: Soft delete a location by ID.
 *     tags: [Locations]
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
 *         description: Location deleted.
 */
// delete location
router.delete('/delete-location/:id', verifyToken, requirePermission("delete_location"), async (req, res) => {
  try {
    logger.info("delete location: ",{ admin: req.user, location_id: req.params.id });
    const location_id = parseInt(req.params.id, 10); // convert to number
    if (!location_id) {
      return res.status(400).json({ message: 'Location ID is required and must be a number' });
    }

    const result = await locationModel.softDeleteLocation(location_id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Location not found or already deleted' });
    }

    logger.success("delete location successfully", { admin: req.user, result: result });
    res.json({ message: 'Location soft-deleted successfully', id: location_id,data:result });
  } catch (err) {
    logger.error('delete location failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @openapi
 * /api/restore-location/{id}:
 *   put:
 *     summary: Restore a deleted location.
 *     tags: [Locations]
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
 *         description: Location restored successfully.
 */
// restore location
router.put('/restore-location/:id', verifyToken, requirePermission("restore_location"), async (req, res) => {
  try {
    logger.info("restore location: ",{ admin: req.user, location_id: req.params.id });
    const locationId = parseInt(req.params.id, 10);
    if (!locationId) {
      return res.status(400).json({ message: 'Location ID is required and must be a number' });
    }

    const result = await locationModel.restoreLocation(locationId);

    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ message: 'Location not found or not deleted' });
    }

    logger.success("restore location successfully", { admin: req.user, result: result });
    res.json({ message: 'Location restored successfully', id: locationId });
  } catch (err) {
    logger.error('restore location failed', { admin: req.user, error: err.message });
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

module.exports = router;