import { Order, Product, Role, Ticket, User, AiChatMessage } from './types';

const API_BASE = '/api';

export const DEMO_USERS: Record<Role, User & { token: string }> = {
  CUSTOMER: {
    id: 'cust-demo-1',
    email: 'customer@shopfast.vn',
    fullName: 'Lê Hoàng Khách (VIP)',
    role: 'CUSTOMER',
    token: 'demo-jwt-customer-token',
  },
  AGENT: {
    id: 'agent-demo-1',
    email: 'agent@shopfast.vn',
    fullName: 'Nguyễn Thị CSKH (Support Agent)',
    role: 'AGENT',
    token: 'demo-jwt-agent-token',
  },
  WAREHOUSE: {
    id: 'wh-demo-1',
    email: 'warehouse@shopfast.vn',
    fullName: 'Trần Văn Kho (Warehouse)',
    role: 'WAREHOUSE',
    token: 'demo-jwt-warehouse-token',
  },
  ADMIN: {
    id: 'admin-demo-1',
    email: 'admin@shopfast.vn',
    fullName: 'System Administrator',
    role: 'ADMIN',
    token: 'demo-jwt-admin-token',
  },
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku: 'IPHONE-15-PRO-256',
    name: 'iPhone 15 Pro Max 256GB - Titan Tự Nhiên',
    description: 'Khung titan chuẩn hàng không vũ trụ, chip A17 Pro đột phá, nút tác vụ tùy chỉnh.',
    price: 29990000,
    stock: 45,
    category: 'Smartphones',
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600',
    isActive: true,
  },
  {
    id: 'prod-2',
    sku: 'MACBOOK-M3-PRO-16-512',
    name: 'MacBook Pro 14" M3 Pro 18GB/512GB Space Black',
    description: 'Màn hình Liquid Retina XDR đỉnh cao, thời lượng pin tới 22 giờ, hiệu năng cực mạnh.',
    price: 49990000,
    stock: 22,
    category: 'Laptops',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',
    isActive: true,
  },
  {
    id: 'prod-3',
    sku: 'SONY-WH1000XM5-BLK',
    name: 'Tai nghe chống ồn Sony WH-1000XM5 Đen',
    description: 'Công nghệ chống ồn hàng đầu ngành với bộ xử lý Integrated Processor V1 và HD QN1.',
    price: 6990000,
    stock: 78,
    category: 'Audio',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
    isActive: true,
  },
  {
    id: 'prod-4',
    sku: 'AIRPODS-PRO-2-USBC',
    name: 'Apple AirPods Pro Gen 2 MagSafe (USB-C)',
    description: 'Chống ồn chủ động gấp 2 lần, âm thanh thích ứng và hộp sạc chuẩn USB-C mới.',
    price: 5490000,
    stock: 115,
    category: 'Audio',
    imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600',
    isActive: true,
  },
  {
    id: 'prod-5',
    sku: 'SAMSUNG-S24-ULTRA-512',
    name: 'Samsung Galaxy S24 Ultra 512GB Titanium Gray',
    description: 'Tích hợp Galaxy AI thông minh, camera 200MP zoom sắc nét và bút S-Pen quyền năng.',
    price: 33990000,
    stock: 38,
    category: 'Smartphones',
    imageUrl: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600',
    isActive: true,
  },
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'order-demo-1',
    orderNumber: 'SF-20261102-1001',
    customerId: 'cust-demo-1',
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    totalAmount: 36980000,
    shippingAddress: 'Tòa nhà Landmark 81, Phường 22, Bình Thạnh, TP. Hồ Chí Minh',
    contactPhone: '0901000004',
    notes: 'Giao hàng giờ hành chính',
    items: [
      {
        productId: 'prod-1',
        productName: 'iPhone 15 Pro Max 256GB - Titan Tự Nhiên',
        sku: 'IPHONE-15-PRO-256',
        quantity: 1,
        unitPrice: 29990000,
        subtotal: 29990000,
      },
      {
        productId: 'prod-3',
        productName: 'Tai nghe chống ồn Sony WH-1000XM5 Đen',
        sku: 'SONY-WH1000XM5-BLK',
        quantity: 1,
        unitPrice: 6990000,
        subtotal: 6990000,
      },
    ],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

export const INITIAL_PROPOSALS: Ticket[] = [
  {
    id: 'prop-demo-1',
    ticketNumber: 'PROP-202611-1001',
    customerId: 'cust-demo-1',
    status: 'PENDING_CONFIRMATION',
    proposalStatus: 'PENDING',
    title: 'Yêu cầu hủy đơn hàng: SF-20261102-1001',
    description: 'Khách hàng liên hệ qua AI Chat muốn đổi màu máy sang titan tự nhiên nên xin hủy đơn cũ.',
    orderId: 'order-demo-1',
    proposedAction: 'CANCEL_ORDER',
    actionPayload: { orderId: 'order-demo-1', reason: 'Khách muốn đổi màu sản phẩm' },
    createdAt: new Date().toISOString(),
  },
];

// Helper to make API calls with Bearer Token
export async function apiRequest<T>(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Lỗi yêu cầu: HTTP ${res.status}`);
  }

  return await res.json();
}
