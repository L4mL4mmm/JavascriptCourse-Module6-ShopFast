export type Role = 'CUSTOMER' | 'AGENT' | 'WAREHOUSE' | 'ADMIN';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED';

export type TicketStatus = 'OPEN' | 'PENDING_CONFIRMATION' | 'RESOLVED' | 'CLOSED';
export type ProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface OrderItem {
  id?: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  shippingAddress: string;
  contactPhone: string;
  notes?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  customerId: string;
  assignedAgentId?: string;
  status: TicketStatus;
  title: string;
  description: string;
  orderId?: string;
  proposedAction?: string;
  actionPayload?: Record<string, any>;
  proposalStatus: ProposalStatus;
  resolutionNotes?: string;
  createdAt: string;
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  toolCalls?: Array<{
    toolName: string;
    args: any;
    result: any;
  }>;
  proposal?: {
    id: string;
    ticketNumber: string;
    proposedAction: string;
    status: string;
  };
}
