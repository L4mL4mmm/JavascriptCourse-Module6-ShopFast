import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { User } from '../../modules/users/entities/user.entity';
import { Product } from '../../modules/products/entities/product.entity';
import { Order } from '../../modules/orders/entities/order.entity';
import { OrderItem } from '../../modules/orders/entities/order-item.entity';
import { Ticket } from '../../modules/tickets/entities/ticket.entity';
import { Role, OrderStatus, PaymentStatus, TicketStatus, ProposalStatus } from '../../common/enums';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USER || 'shopfast',
  password: process.env.DB_PASSWORD || 'shopfast_secret',
  database: process.env.DB_NAME || 'shopfast_db',
  entities: [User, Product, Order, OrderItem, Ticket],
  synchronize: true,
});

async function runSeed() {
  console.log('Connecting to database for seeding...');
  await dataSource.initialize();

  const userRepo = dataSource.getRepository(User);
  const productRepo = dataSource.getRepository(Product);
  const orderRepo = dataSource.getRepository(Order);
  const orderItemRepo = dataSource.getRepository(OrderItem);
  const ticketRepo = dataSource.getRepository(Ticket);

  console.log('Seeding demo users...');
  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('ShopFast@2026', salt);

  const usersData = [
    {
      email: 'admin@shopfast.vn',
      fullName: 'System Administrator',
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
      phone: '0901000001',
    },
    {
      email: 'agent@shopfast.vn',
      fullName: 'Nguyen Thi CSKH (Support Agent)',
      passwordHash: defaultPasswordHash,
      role: Role.AGENT,
      phone: '0901000002',
    },
    {
      email: 'warehouse@shopfast.vn',
      fullName: 'Tran Van Kho (Warehouse Manager)',
      passwordHash: defaultPasswordHash,
      role: Role.WAREHOUSE,
      phone: '0901000003',
    },
    {
      email: 'customer@shopfast.vn',
      fullName: 'Le Hoang Khach (VIP Customer)',
      passwordHash: defaultPasswordHash,
      role: Role.CUSTOMER,
      phone: '0901000004',
    },
  ];

  const savedUsers: Record<string, User> = {};
  for (const u of usersData) {
    let user = await userRepo.findOne({ where: { email: u.email } });
    if (!user) {
      user = userRepo.create(u);
      user = await userRepo.save(user);
    }
    savedUsers[u.role] = user;
  }
  console.log('Users seeded successfully!');

  console.log('Seeding demo products...');
  const productsData = [
    {
      sku: 'IPHONE-15-PRO-256',
      name: 'iPhone 15 Pro Max 256GB - Titan Tự Nhiên',
      description: 'Khung titan chuẩn hàng không vũ trụ, chip A17 Pro đột phá, nút tác vụ tùy chỉnh.',
      price: 29990000,
      stock: 50,
      category: 'Smartphones',
      imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600',
    },
    {
      sku: 'MACBOOK-M3-PRO-16-512',
      name: 'MacBook Pro 14" M3 Pro 18GB/512GB Space Black',
      description: 'Màn hình Liquid Retina XDR đỉnh cao, thời lượng pin tới 22 giờ, hiệu năng cực mạnh.',
      price: 49990000,
      stock: 25,
      category: 'Laptops',
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',
    },
    {
      sku: 'SONY-WH1000XM5-BLK',
      name: 'Tai nghe chống ồn Sony WH-1000XM5 Đen',
      description: 'Công nghệ chống ồn hàng đầu ngành với bộ xử lý Integrated Processor V1 và HD QN1.',
      price: 6990000,
      stock: 80,
      category: 'Audio',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
    },
    {
      sku: 'AIRPODS-PRO-2-USBC',
      name: 'Apple AirPods Pro Gen 2 MagSafe (USB-C)',
      description: 'Chống ồn chủ động gấp 2 lần, âm thanh thích ứng và hộp sạc chuẩn USB-C mới.',
      price: 5490000,
      stock: 120,
      category: 'Audio',
      imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600',
    },
    {
      sku: 'SAMSUNG-S24-ULTRA-512',
      name: 'Samsung Galaxy S24 Ultra 512GB Titanium Gray',
      description: 'Tích hợp Galaxy AI thông minh, camera 200MP zoom sắc nét và bút S-Pen quyền năng.',
      price: 33990000,
      stock: 40,
      category: 'Smartphones',
      imageUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600',
    },
  ];

  const savedProducts: Product[] = [];
  for (const p of productsData) {
    let product = await productRepo.findOne({ where: { sku: p.sku } });
    if (!product) {
      product = productRepo.create(p);
      product = await productRepo.save(product);
    }
    savedProducts.push(product);
  }
  console.log(`Products seeded: ${savedProducts.length} items!`);

  console.log('Seeding initial demo orders...');
  const customer = savedUsers[Role.CUSTOMER];
  const existingOrder = await orderRepo.findOne({ where: { customerId: customer.id } });

  if (!existingOrder && savedProducts.length >= 2) {
    const p1 = savedProducts[0];
    const p2 = savedProducts[2];

    const orderNumber = `SF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-1001`;
    const totalAmount = Number(p1.price) * 1 + Number(p2.price) * 1;

    const order = orderRepo.create({
      orderNumber,
      customerId: customer.id,
      customer,
      status: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      totalAmount,
      shippingAddress: 'Tòa nhà Landmark 81, Phường 22, Bình Thạnh, TP. Hồ Chí Minh',
      contactPhone: '0901000004',
      notes: 'Giao hàng hỏa tốc trong ngày',
    });

    const savedOrder = await orderRepo.save(order);

    const item1 = orderItemRepo.create({
      orderId: savedOrder.id,
      order: savedOrder,
      productId: p1.id,
      productName: p1.name,
      sku: p1.sku,
      quantity: 1,
      unitPrice: Number(p1.price),
      subtotal: Number(p1.price),
    });

    const item2 = orderItemRepo.create({
      orderId: savedOrder.id,
      order: savedOrder,
      productId: p2.id,
      productName: p2.name,
      sku: p2.sku,
      quantity: 1,
      unitPrice: Number(p2.price),
      subtotal: Number(p2.price),
    });

    await orderItemRepo.save([item1, item2]);

    // Create a demo HITL proposal
    const proposal = ticketRepo.create({
      ticketNumber: 'PROP-202611-1001',
      customerId: customer.id,
      customer,
      status: TicketStatus.PENDING_CONFIRMATION,
      proposalStatus: ProposalStatus.PENDING,
      title: `Yêu cầu hủy đơn hàng: ${savedOrder.orderNumber}`,
      description: 'Khách hàng thay đổi nhu cầu màu sắc nên muốn hủy đơn để đặt lại.',
      orderId: savedOrder.id,
      proposedAction: 'CANCEL_ORDER',
      actionPayload: { orderId: savedOrder.id, reason: 'Khách đổi màu máy' },
    });

    await ticketRepo.save(proposal);
    console.log(`Demo Order #${savedOrder.orderNumber} and Demo Proposal seeded!`);
  }

  console.log('Seeding finished successfully!');
  await dataSource.destroy();
}

runSeed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
