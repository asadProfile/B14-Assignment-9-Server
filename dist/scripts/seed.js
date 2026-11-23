import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { Service } from '../models/Service.js';
import { Appointment } from '../models/Appointment.js';
dotenv.config();
export const seedDatabase = async () => {
    try {
        console.log('🌱 Checking seed data...');
        // 1. Seed Admin Account if not exists
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@salonbook.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
        let admin = await User.findOne({ email: adminEmail.toLowerCase() });
        if (!admin) {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            admin = await User.create({
                name: 'SalonBook Administrator',
                email: adminEmail.toLowerCase(),
                password: hashedPassword,
                image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
                role: 'admin',
                isBlocked: false,
                phone: '+1 (555) 019-2834',
            });
            console.log(`✅ Admin account seeded: ${adminEmail} / ${adminPassword}`);
        }
        // 2. Seed Customer Account if not exists
        const customerEmail = 'customer@salonbook.com';
        let customer = await User.findOne({ email: customerEmail.toLowerCase() });
        if (!customer) {
            const hashedPassword = await bcrypt.hash('Customer123!', 10);
            customer = await User.create({
                name: 'Sarah Jenkins',
                email: customerEmail.toLowerCase(),
                password: hashedPassword,
                image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
                role: 'customer',
                isBlocked: false,
                phone: '+1 (555) 432-8765',
            });
            console.log(`✅ Demo customer seeded: ${customerEmail} / Customer123!`);
        }
        // 3. Seed Services if count < 6
        const serviceCount = await Service.countDocuments();
        if (serviceCount === 0) {
            const initialServices = [
                {
                    serviceName: 'Signature Precision Haircut & Styling',
                    category: 'Haircut & Styling',
                    description: 'A customized haircut tailored to your face shape and personal style, including a relaxing shampoo wash, scalp massage, and expert blow-dry finish.',
                    price: 55,
                    duration: 45,
                    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
                    status: 'active',
                },
                {
                    serviceName: 'Balayage & Dimensional Color Melting',
                    category: 'Hair Coloring',
                    description: 'Hand-painted sun-kissed highlights creating natural dimension with seamless transition, enriched with conditioning gloss toner for ultimate radiance.',
                    price: 160,
                    duration: 120,
                    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
                    status: 'active',
                },
                {
                    serviceName: 'Keratin Smoothing & Restorative Therapy',
                    category: 'Hair Treatment',
                    description: 'Intense anti-frizz keratin protein treatment that seals the hair cuticle, repairs split ends, and delivers salon-smooth shine lasting up to 4 months.',
                    price: 180,
                    duration: 90,
                    image: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=800&q=80',
                    status: 'active',
                },
                {
                    serviceName: 'Hydra-Glow Deep Cleansing Facial',
                    category: 'Facial & Skincare',
                    description: 'Gentle exfoliation, blackhead extraction, deep pore cleansing, followed by hyaluronic acid infusion and an antioxidant collagen mask.',
                    price: 95,
                    duration: 60,
                    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
                    status: 'active',
                },
                {
                    serviceName: 'Luxury Bridal & Glamour Makeup',
                    category: 'Makeup',
                    description: 'Flawless camera-ready makeup artistry using premier luxury cosmetics, individual lash application, and high-definition contouring for your special moments.',
                    price: 120,
                    duration: 75,
                    image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80',
                    status: 'active',
                },
                {
                    serviceName: 'Deluxe Gel Manicure & Botanical Pedicure',
                    category: 'Manicure & Pedicure',
                    description: 'Complete nail shaping, cuticle nourishment, organic lavender scrub, paraffin wax dip, and chip-free gel polish that shines brilliantly for weeks.',
                    price: 75,
                    duration: 60,
                    image: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80',
                    status: 'active',
                },
                {
                    serviceName: 'Aromatherapy Hot Stone Full Body Massage',
                    category: 'Spa & Massage',
                    description: 'Warm volcanic stones combined with organic essential oils melt away muscle tension, boost circulation, and restore complete serenity to body and mind.',
                    price: 110,
                    duration: 75,
                    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
                    status: 'active',
                },
                {
                    serviceName: 'Gentlemen’s Grooming & Beard Sculpting',
                    category: 'Haircut & Styling',
                    description: 'Precision scissor and clipper cut, hot towel straight-razor shave, beard oil conditioning, and soothing aftershave balm treatment.',
                    price: 45,
                    duration: 40,
                    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
                    status: 'active',
                },
            ];
            await Service.insertMany(initialServices);
            console.log(`✅ Seeded ${initialServices.length} professional salon services.`);
        }
        // 4. Seed a demo appointment if none exist
        const appointmentCount = await Appointment.countDocuments();
        if (appointmentCount === 0 && customer && admin) {
            const sampleService = await Service.findOne({ status: 'active' });
            if (sampleService) {
                const appointment = await Appointment.create({
                    serviceId: sampleService._id,
                    customerId: customer._id,
                    appointmentDate: '2026-12-05',
                    timeSlot: '11:00 AM - 12:00 PM',
                    message: 'Looking forward to the styling session for my anniversary dinner!',
                    servicePrice: sampleService.price,
                    paymentStatus: 'unpaid',
                    status: 'pending',
                });
                console.log(`✅ Demo appointment seeded: ${appointment._id}`);
            }
        }
    }
    catch (error) {
        console.error('❌ Error seeding database:', error);
    }
};
