import { Router } from 'express';
import { Service } from '../models/Service.js';
import { verifyToken, verifyNotBlocked, verifyAdmin } from '../middlewares/auth.js';
const router = Router();
// GET /api/services - Browse services with search, category filter, sorting
router.get('/', async (req, res) => {
    try {
        const { search, category, sort, all } = req.query;
        const query = {};
        // Only show active services to public unless admin explicitly requested all=true
        if (all !== 'true') {
            query.status = 'active';
        }
        if (category && category !== 'All') {
            query.category = category;
        }
        if (search && typeof search === 'string' && search.trim() !== '') {
            query.$or = [
                { serviceName: { $regex: search.trim(), $options: 'i' } },
                { description: { $regex: search.trim(), $options: 'i' } },
                { category: { $regex: search.trim(), $options: 'i' } },
            ];
        }
        let sortOption = { createdAt: -1 };
        if (sort === 'price_asc') {
            sortOption = { price: 1 };
        }
        else if (sort === 'price_desc') {
            sortOption = { price: -1 };
        }
        const services = await Service.find(query).sort(sortOption);
        res.json({
            success: true,
            count: services.length,
            data: services,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch services.' });
    }
});
// GET /api/services/featured - Show at least 6 active services
router.get('/featured', async (_req, res) => {
    try {
        const services = await Service.find({ status: 'active' }).sort({ createdAt: -1 }).limit(6);
        res.json({
            success: true,
            data: services,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch featured services.' });
    }
});
// GET /api/services/categories - List available categories with counts
router.get('/categories', async (_req, res) => {
    try {
        const categories = await Service.aggregate([
            { $match: { status: 'active' } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);
        res.json({
            success: true,
            data: categories.map((c) => ({ category: c._id, count: c.count })),
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch categories.' });
    }
});
// GET /api/services/:id - Get service details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const service = await Service.findById(id);
        if (!service) {
            res.status(404).json({ success: false, message: 'Service not found.' });
            return;
        }
        res.json({
            success: true,
            data: service,
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: 'Invalid service ID.' });
    }
});
// POST /api/services - Admin only: Add new service
router.post('/', verifyToken, verifyNotBlocked, verifyAdmin, async (req, res) => {
    try {
        const { serviceName, category, description, price, duration, image, status } = req.body;
        if (!serviceName || !category || !description || price === undefined || duration === undefined || !image) {
            res.status(400).json({ success: false, message: 'All required service fields must be provided.' });
            return;
        }
        const numPrice = Number(price);
        const numDuration = Number(duration);
        if (isNaN(numPrice) || numPrice <= 0) {
            res.status(400).json({ success: false, message: 'Price must be a positive number.' });
            return;
        }
        if (isNaN(numDuration) || numDuration <= 0) {
            res.status(400).json({ success: false, message: 'Duration must be a positive number.' });
            return;
        }
        const newService = await Service.create({
            serviceName: serviceName.trim(),
            category: category.trim(),
            description: description.trim(),
            price: numPrice,
            duration: numDuration,
            image: image.trim(),
            status: status === 'inactive' ? 'inactive' : 'active',
        });
        res.status(201).json({
            success: true,
            message: 'Service created successfully!',
            data: newService,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to create service.' });
    }
});
// PUT /api/services/:id - Admin only: Update service
router.put('/:id', verifyToken, verifyNotBlocked, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { serviceName, category, description, price, duration, image, status } = req.body;
        const service = await Service.findById(id);
        if (!service) {
            res.status(404).json({ success: false, message: 'Service not found.' });
            return;
        }
        if (serviceName)
            service.serviceName = serviceName.trim();
        if (category)
            service.category = category.trim();
        if (description)
            service.description = description.trim();
        if (image)
            service.image = image.trim();
        if (status)
            service.status = status;
        if (price !== undefined) {
            const numPrice = Number(price);
            if (isNaN(numPrice) || numPrice <= 0) {
                res.status(400).json({ success: false, message: 'Price must be a positive number.' });
                return;
            }
            service.price = numPrice;
        }
        if (duration !== undefined) {
            const numDuration = Number(duration);
            if (isNaN(numDuration) || numDuration <= 0) {
                res.status(400).json({ success: false, message: 'Duration must be a positive number.' });
                return;
            }
            service.duration = numDuration;
        }
        await service.save();
        res.json({
            success: true,
            message: 'Service updated successfully!',
            data: service,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to update service.' });
    }
});
// PATCH /api/services/:id/status - Admin only: Toggle active/inactive
router.patch('/:id/status', verifyToken, verifyNotBlocked, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['active', 'inactive'].includes(status)) {
            res.status(400).json({ success: false, message: "Status must be 'active' or 'inactive'." });
            return;
        }
        const service = await Service.findByIdAndUpdate(id, { status }, { new: true });
        if (!service) {
            res.status(404).json({ success: false, message: 'Service not found.' });
            return;
        }
        res.json({
            success: true,
            message: `Service status updated to ${status}.`,
            data: service,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to update status.' });
    }
});
// DELETE /api/services/:id - Admin only: Delete service
router.delete('/:id', verifyToken, verifyNotBlocked, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const service = await Service.findByIdAndDelete(id);
        if (!service) {
            res.status(404).json({ success: false, message: 'Service not found.' });
            return;
        }
        res.json({
            success: true,
            message: 'Service deleted successfully.',
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Failed to delete service.' });
    }
});
export default router;
