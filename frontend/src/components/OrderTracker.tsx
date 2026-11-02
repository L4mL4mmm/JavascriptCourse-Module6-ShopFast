import React, { useEffect, useState } from 'react';
import { Order, OrderStatus, Role } from '../types';
import { subscribeToOrder, unsubscribeFromOrder } from '../socket';
import {
  Clock,
  CheckCircle2,
  Package,
  Truck,
  CheckCheck,
  XCircle,
  Radio,
  MapPin,
  Calendar,
  Layers,
} from 'lucide-react';

interface OrderTrackerProps {
  orders: Order[];
  currentRole: Role;
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
}

const STEPS: { status: OrderStatus; label: string; icon: any; desc: string }[] = [
  { status: 'PENDING', label: 'Chờ xác nhận', icon: Clock, desc: 'Đơn hàng vừa được đặt thành công' },
  { status: 'CONFIRMED', label: 'Đã xác nhận', icon: CheckCircle2, desc: 'Kho hàng đã khóa tồn kho và xác nhận' },
  { status: 'PROCESSING', label: 'Đang đóng gói', icon: Package, desc: 'Nhân viên kho đang chuẩn bị kiện hàng' },
  { status: 'SHIPPED', label: 'Đang giao hàng', icon: Truck, desc: 'Shipper đang vận chuyển tới bạn' },
  { status: 'DELIVERED', label: 'Đã giao thành công', icon: CheckCheck, desc: 'Khách hàng đã nhận và kiểm tra hàng' },
];

export const OrderTracker: React.FC<OrderTrackerProps> = ({
  orders,
  currentRole,
  onUpdateOrderStatus,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [liveEventNotice, setLiveEventNotice] = useState<string | null>(null);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  useEffect(() => {
    if (!selectedOrder) return;

    // Subscribe to dynamic room: order:{orderId}
    subscribeToOrder(
      selectedOrder.id,
      (data) => {
        console.log('[WebSocket Live] Order updated:', data);
        onUpdateOrderStatus(data.orderId, data.status);
        setLiveEventNotice(
          `[WebSocket Event] Đơn hàng #${data.orderNumber} vừa chuyển trạng thái sang: "${data.status}" lúc ${new Date().toLocaleTimeString()}`,
        );
      },
      (initialState) => {
        console.log('[WebSocket Live] Room Subscribed:', initialState);
      },
    );

    return () => {
      unsubscribeFromOrder(selectedOrder.id);
    };
  }, [selectedOrder?.id]);

  const getStepIndex = (status: OrderStatus) => {
    if (status === 'CANCELLED') return -1;
    return STEPS.findIndex((s) => s.status === status);
  };

  const currentStepIndex = selectedOrder ? getStepIndex(selectedOrder.status) : 0;
  const isCancelled = selectedOrder?.status === 'CANCELLED';

  const handleAdvanceStatus = (nextStatus: OrderStatus) => {
    if (!selectedOrder) return;
    onUpdateOrderStatus(selectedOrder.id, nextStatus);
    setLiveEventNotice(
      `[Mô phỏng Thao tác Kho] Trạng thái được cập nhật sang "${nextStatus}". WebSocket Gateway đang broadcast tới room order:${selectedOrder.id}`,
    );
  };

  if (!selectedOrder) {
    return (
      <div className="glass-panel p-12 text-center rounded-3xl">
        <Package className="h-12 w-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-300">Chưa có đơn hàng nào</h3>
        <p className="text-xs text-slate-500 mt-1">Hãy chuyển sang tab "Sản phẩm & Mua hàng" để tạo đơn ngay!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Realtime Status Banner */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-emerald-500">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 animate-pulse">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100">
                Phòng WebSocket Realtime: <code className="text-emerald-400 font-mono">order:{selectedOrder.id}</code>
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                Subscribed
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {liveEventNotice || 'Hệ thống đang lắng nghe sự kiện push từ Redis Pub/Sub adapter...'}
            </p>
          </div>
        </div>

        {/* Order Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Chọn đơn:</span>
          <select
            value={selectedOrder.id}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs font-mono text-emerald-400 px-3 py-1.5 rounded-xl outline-none"
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                #{o.orderNumber} ({o.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Order Card */}
      <div className="glass-panel p-6 lg:p-8 rounded-3xl space-y-8">
        {/* Header Info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800/80 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-extrabold text-white">Đơn hàng #{selectedOrder.orderNumber}</h2>
              {isCancelled ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" /> Đã hủy
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  {selectedOrder.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {new Date(selectedOrder.createdAt).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {selectedOrder.shippingAddress}
              </span>
            </div>
          </div>

          <div className="text-left md:text-right">
            <span className="text-xs text-slate-400">Tổng giá trị thanh toán</span>
            <div className="text-2xl font-black text-emerald-400">
              {Number(selectedOrder.totalAmount).toLocaleString()} ₫
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              Thanh toán: <span className="text-slate-200">{selectedOrder.paymentStatus}</span>
            </span>
          </div>
        </div>

        {/* Visual Realtime Stepper */}
        {!isCancelled ? (
          <div className="py-4">
            <div className="relative">
              {/* Connector line */}
              <div className="absolute top-5 left-6 right-6 h-0.5 bg-slate-800 -z-0">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                  style={{
                    width: `${(Math.max(0, currentStepIndex) / (STEPS.length - 1)) * 100}%`,
                  }}
                />
              </div>

              {/* Steps */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 relative z-10">
                {STEPS.map((step, idx) => {
                  const isCompleted = idx <= currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  const Icon = step.icon;

                  return (
                    <div key={step.status} className="flex flex-col items-center text-center">
                      <div
                        className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                          isCurrent
                            ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-500/20'
                            : isCompleted
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                            : 'bg-slate-900 text-slate-600 border border-slate-800'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span
                        className={`text-xs font-bold mt-3 ${
                          isCurrent ? 'text-emerald-400' : isCompleted ? 'text-slate-200' : 'text-slate-500'
                        }`}
                      >
                        {step.label}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1 max-w-[120px] hidden sm:block">
                        {step.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center">
            <p className="text-sm font-bold text-rose-400">Đơn hàng này đã bị hủy theo yêu cầu đề xuất HITL.</p>
            <p className="text-xs text-slate-400 mt-1">Toàn bộ tồn kho sản phẩm đã được tự động hoàn trả vào database.</p>
          </div>
        )}

        {/* Staff Simulation Controls (Advance Status) */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Layers className="h-4 w-4 text-emerald-400" />
            <span>
              <strong>Bảng điều khiển Nhân viên ({currentRole}):</strong> Mô phỏng cập nhật tiến độ đơn hàng
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleAdvanceStatus('CONFIRMED')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              1. Xác nhận
            </button>
            <button
              onClick={() => handleAdvanceStatus('PROCESSING')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              2. Đóng gói
            </button>
            <button
              onClick={() => handleAdvanceStatus('SHIPPED')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              3. Giao hàng
            </button>
            <button
              onClick={() => handleAdvanceStatus('DELIVERED')}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors font-bold"
            >
              4. Hoàn tất giao
            </button>
          </div>
        </div>

        {/* Order Items List */}
        <div>
          <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">
            Sản phẩm trong kiện hàng ({selectedOrder.items?.length || 0})
          </h4>
          <div className="divide-y divide-slate-800/80 rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            {selectedOrder.items?.map((item, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{item.productName}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">SKU: {item.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-emerald-400">
                    {Number(item.subtotal || item.unitPrice * item.quantity).toLocaleString()} ₫
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {item.quantity} x {Number(item.unitPrice).toLocaleString()} ₫
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
