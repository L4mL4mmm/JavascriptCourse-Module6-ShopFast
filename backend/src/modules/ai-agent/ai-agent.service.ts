import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { TicketsService } from '../tickets/tickets.service';
import { AiChatDto, AiChatResponseDto, AiToolCallResult } from './dto';

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  // System Prompt strictly restricting scope to ShopFast (F01)
  public readonly systemPrompt = `
Bạn là trợ lý AI chuyên trách hỗ trợ khách hàng của nền tảng thương mại điện tử ShopFast.
Quy tắc bảo mật & phạm vi hoạt động:
1. Bạn CHỈ ĐƯỢC PHÉP hỗ trợ các vấn đề liên quan đến ShopFast: tra cứu sản phẩm, kiểm tra tồn kho, kiểm tra trạng thái đơn hàng, chính sách giao hàng và đổi trả.
2. NẾU khách hàng hỏi về bất kỳ chủ đề nào ngoài ShopFast (ví dụ: lập trình, thời sự, toán học, đối thủ cạnh tranh, câu hỏi giải trí chung), bạn PHẢI TỪ CHỐI LỊCH SỰ và hướng dẫn người dùng quay lại các thắc mắc về đơn hàng hoặc sản phẩm ShopFast.
3. Các công cụ có sẵn (Function Calling Tools):
   - getOrderStatus(orderId): Lấy trạng thái, timeline xử lý và chi tiết đơn hàng.
   - checkInventory(sku): Lấy số lượng tồn kho và giá niêm yết theo mã SKU.
4. QUY TRÌNH HUMAN-IN-THE-LOOP (HITL) CHO CÁC THAO TÁC THAY ĐỔI TRẠNG THÁI:
   - Các thao tác: Hủy đơn hàng, Yêu cầu hoàn tiền, Đổi địa chỉ nhận hàng.
   - BẠN TUYỆT ĐỐI KHÔNG được tự ý thực thi trực tiếp.
   - Bạn PHẢI tạo đề xuất (Action Proposal) chuyển cho Nhân viên CSKH (Human Agent) phê duyệt, và thông báo mã phiếu đề xuất cho khách hàng an tâm theo dõi.
`.trim();

  constructor(
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
    private readonly productsService: ProductsService,
    private readonly ticketsService: TicketsService,
  ) {}

  /**
   * Tool: getOrderStatus(orderId)
   */
  async getOrderStatus(orderId: string): Promise<any> {
    try {
      let order = null;
      if (orderId.startsWith('SF-')) {
        order = await this.ordersService.findByOrderNumber(orderId);
      } else {
        order = await this.ordersService.findById(orderId);
      }

      if (!order) {
        return { found: false, message: `Không tìm thấy đơn hàng với mã '${orderId}' trong hệ thống ShopFast.` };
      }

      return {
        found: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt,
        itemCount: order.items?.length || 0,
        items: order.items?.map((i) => ({
          name: i.productName,
          sku: i.sku,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      };
    } catch (err: any) {
      return { found: false, message: `Lỗi khi tra cứu đơn hàng: ${err.message}` };
    }
  }

  /**
   * Tool: checkInventory(sku)
   */
  async checkInventory(sku: string): Promise<any> {
    try {
      const product = await this.productsService.findBySku(sku);
      if (!product) {
        return { found: false, message: `Mã sản phẩm SKU '${sku}' không tồn tại trong hệ thống ShopFast.` };
      }

      return {
        found: true,
        sku: product.sku,
        name: product.name,
        stock: product.stock,
        price: product.price,
        inStock: product.stock > 0,
        category: product.category,
      };
    } catch (err: any) {
      return { found: false, message: `Lỗi khi kiểm tra tồn kho: ${err.message}` };
    }
  }

  /**
   * Tool: proposeOrderAction (Human-in-the-loop workflow)
   */
  async proposeOrderAction(
    customerId: string,
    action: 'CANCEL_ORDER' | 'UPDATE_SHIPPING_ADDRESS' | 'REFUND_ORDER',
    orderId: string,
    reason: string,
    payload: Record<string, any> = {},
  ): Promise<any> {
    const proposal = await this.ticketsService.createProposal(
      customerId,
      `Yêu cầu ${action === 'CANCEL_ORDER' ? 'hủy đơn hàng' : action === 'UPDATE_SHIPPING_ADDRESS' ? 'đổi địa chỉ' : 'hoàn tiền'}: ${orderId}`,
      reason,
      action,
      { orderId, reason, ...payload },
      orderId,
    );

    return {
      proposalId: proposal.id,
      ticketNumber: proposal.ticketNumber,
      action,
      status: proposal.status,
      message: `Đề xuất '${action}' đã được ghi nhận vào hệ thống với mã ${proposal.ticketNumber} và đang chờ nhân viên kiểm duyệt.`,
    };
  }

  /**
   * Chat endpoint processing customer message
   */
  async chat(customerId: string, dto: AiChatDto): Promise<AiChatResponseDto> {
    const userMessage = dto.message.trim();
    this.logger.log(`[AI Agent] Customer ${customerId} asked: "${userMessage}"`);

    // 1. Guardrail / Scope Check: Strictly restrict to ShopFast domain
    const outOfScopePatterns = [
      /\b(thời sự|chính trị|bầu cử|chiến tranh)\b/i,
      /\b(viết code|python|javascript|java|c\+\+|html|css)\b/i,
      /\b(giải toán|đạo hàm|tích phân|vật lý|hóa học)\b/i,
      /\b(shopee|lazada|tiki|amazon|tiktok shop)\b/i,
      /\b(thủ đô|tổng thống|dân số)\b/i,
    ];

    const isOutOfScope = outOfScopePatterns.some((pattern) => pattern.test(userMessage));
    if (isOutOfScope) {
      return {
        reply:
          'Tôi là trợ lý AI chuyên trách của ShopFast. Tôi chỉ có thể hỗ trợ các thông tin liên quan đến sản phẩm, tồn kho và đơn hàng của ShopFast. Quý khách vui lòng cho biết tôi có thể hỗ trợ gì về sản phẩm hoặc đơn hàng của quý khách ạ?',
        toolCalls: [],
      };
    }

    const toolCalls: AiToolCallResult[] = [];
    let proposalCreated = false;
    let proposalInfo: any = undefined;

    // 2. Detect & Execute Function Calling Tools:
    // A) HITL State-Changing Intent: Cancel Order
    const cancelMatch = userMessage.match(/(hủy|huy|cancel)\s*(đơn|don|đơn hàng|order)?\s*(SF-[\w-]+|[a-f0-9-]{36})/i);
    if (cancelMatch) {
      const orderId = cancelMatch[3];
      const result = await this.proposeOrderAction(
        customerId,
        'CANCEL_ORDER',
        orderId,
        `Khách hàng yêu cầu hủy đơn qua AI Chat: "${userMessage}"`,
      );
      toolCalls.push({
        toolName: 'proposeOrderAction',
        args: { action: 'CANCEL_ORDER', orderId },
        result,
      });
      proposalCreated = true;
      proposalInfo = {
        id: result.proposalId,
        ticketNumber: result.ticketNumber,
        proposedAction: 'CANCEL_ORDER',
        status: result.status,
      };

      return {
        reply: `Dạ, em đã tiếp nhận yêu cầu hủy đơn hàng #${orderId} của quý khách. Vì lý do an toàn dữ liệu, hệ thống ShopFast đã tạo Phiếu đề xuất kiểm duyệt #${result.ticketNumber}. Nhân viên chăm sóc khách hàng của ShopFast sẽ xác nhận và xử lý yêu cầu hủy đơn trong ít phút ạ!`,
        toolCalls,
        proposalCreated: true,
        proposal: proposalInfo,
      };
    }

    // B) HITL State-Changing Intent: Update Shipping Address
    const addressMatch = userMessage.match(/(đổi|thay đổi|update)\s*địa chỉ\s*(cho đơn|đơn hàng)?\s*(SF-[\w-]+|[a-f0-9-]{36})?\s*(sang|thành|về)?\s*(.+)/i);
    if (addressMatch && addressMatch[3]) {
      const orderId = addressMatch[3];
      const newAddress = addressMatch[5]?.trim() || 'Địa chỉ mới theo yêu cầu';
      const result = await this.proposeOrderAction(
        customerId,
        'UPDATE_SHIPPING_ADDRESS',
        orderId,
        `Yêu cầu đổi địa chỉ sang: ${newAddress}`,
        { newAddress },
      );
      toolCalls.push({
        toolName: 'proposeOrderAction',
        args: { action: 'UPDATE_SHIPPING_ADDRESS', orderId, newAddress },
        result,
      });
      proposalCreated = true;
      proposalInfo = {
        id: result.proposalId,
        ticketNumber: result.ticketNumber,
        proposedAction: 'UPDATE_SHIPPING_ADDRESS',
        status: result.status,
      };

      return {
        reply: `Dạ, em đã tạo phiếu yêu cầu cập nhật địa chỉ giao hàng cho đơn #${orderId} thành "${newAddress}" với mã phiếu #${result.ticketNumber}. Nhân viên hỗ trợ sẽ kiểm tra lộ trình và phê duyệt cập nhật ngay cho quý khách ạ!`,
        toolCalls,
        proposalCreated: true,
        proposal: proposalInfo,
      };
    }

    // C) Tool: getOrderStatus(orderId)
    const orderMatch = userMessage.match(/(SF-\d{8}-\d{4}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (orderMatch) {
      const orderId = orderMatch[1];
      const orderData = await this.getOrderStatus(orderId);
      toolCalls.push({
        toolName: 'getOrderStatus',
        args: { orderId },
        result: orderData,
      });

      if (!orderData.found) {
        return {
          reply: `Dạ, em đã kiểm tra trên hệ thống ShopFast nhưng không tìm thấy đơn hàng nào có mã "${orderId}". Quý khách vui lòng kiểm tra lại mã đơn hàng hoặc đăng nhập để xem danh sách đơn hàng đã đặt nhé!`,
          toolCalls,
        };
      }

      const statusMap: Record<string, string> = {
        PENDING: 'Đang chờ xác nhận',
        CONFIRMED: 'Đã xác nhận & đang chuẩn bị hàng',
        PROCESSING: 'Đang xử lý đóng gói tại kho',
        SHIPPED: 'Đang được vận chuyển đến bạn',
        DELIVERED: 'Đã giao hàng thành công',
        CANCELLED: 'Đã hủy',
      };

      const friendlyStatus = statusMap[orderData.status] || orderData.status;
      return {
        reply: `Dạ, em xin gửi thông tin chi tiết đơn hàng #${orderData.orderNumber}:\n- Trạng thái hiện tại: **${friendlyStatus}**\n- Trạng thái thanh toán: **${orderData.paymentStatus}**\n- Tổng tiền: **${Number(orderData.totalAmount).toLocaleString()} VNĐ**\n- Địa chỉ giao hàng: **${orderData.shippingAddress}**\n- Số lượng mặt hàng: **${orderData.itemCount}**\nQuý khách có thể theo dõi hành trình trực tiếp theo thời gian thực tại màn hình Theo dõi đơn hàng của ShopFast ạ!`,
        toolCalls,
      };
    }

    // D) Tool: checkInventory(sku)
    // Extract potential SKU (e.g. IPHONE-15-PRO-256, MACBOOK-M3-16-512, SONY-WH1000XM5)
    const skuMatch = userMessage.match(/([A-Z0-9]+(?:-[A-Z0-9]+)+)/i);
    if (skuMatch || /tồn kho|còn hàng|giá bao nhiêu/i.test(userMessage)) {
      const sku = skuMatch ? skuMatch[1].toUpperCase() : 'IPHONE-15-PRO-256';
      const inventoryData = await this.checkInventory(sku);
      toolCalls.push({
        toolName: 'checkInventory',
        args: { sku },
        result: inventoryData,
      });

      if (!inventoryData.found) {
        return {
          reply: `Dạ, hiện tại ShopFast chưa tìm thấy sản phẩm có mã SKU "${sku}". Quý khách có thể xem thêm các sản phẩm điện thoại và công nghệ hot tại danh mục trang chủ nhé!`,
          toolCalls,
        };
      }

      const stockStatus = inventoryData.stock > 0
        ? `còn **${inventoryData.stock}** sản phẩm sẵn sàng giao nhanh`
        : 'hiện đang tạm hết hàng';

      return {
        reply: `Dạ, thông tin tồn kho sản phẩm **${inventoryData.name}** (SKU: \`${inventoryData.sku}\`):\n- Tình trạng: ${stockStatus}.\n- Giá niêm yết: **${Number(inventoryData.price).toLocaleString()} VNĐ**.\n- Danh mục: **${inventoryData.category}**.\nQuý khách có thể đặt hàng ngay để được áp dụng giao hỏa tốc 2 giờ nhé!`,
        toolCalls,
      };
    }

    // General ShopFast greeting & assistant prompt
    return {
      reply:
        'Xin chào quý khách! Em là trợ lý ảo AI của ShopFast. Em có thể hỗ trợ quý khách:\n1. Kiểm tra trạng thái đơn hàng (ví dụ: *"Kiểm tra đơn hàng SF-..."*)\n2. Kiểm tra tồn kho và giá sản phẩm (ví dụ: *"Kiểm tra tồn kho IPHONE-15-PRO-256"*)\n3. Hỗ trợ yêu cầu hủy đơn hoặc đổi địa chỉ giao hàng qua quy trình xác nhận an toàn.\nQuý khách cần em hỗ trợ thông tin gì ạ?',
      toolCalls: [],
    };
  }
}
