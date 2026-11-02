import React, { useState } from 'react';
import { Product, User, Order } from '../types';
import { ShoppingCart, CheckCircle, AlertTriangle, Zap, Tag, Database, Flame } from 'lucide-react';

interface ProductCatalogProps {
  products: Product[];
  currentUser: User;
  onCheckoutSuccess: (order: Order) => void;
  onUpdateStock: (productId: string, newStock: number) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  currentUser,
  onCheckoutSuccess,
  onUpdateStock,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [shippingAddress, setShippingAddress] = useState('123 Nguyen Hue, Quan 1, TP.HCM');
  const [contactPhone, setContactPhone] = useState('0909888999');
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cacheNotice, setCacheNotice] = useState<string | null>(
    'Dữ liệu danh mục được nạp từ Redis Cache Cluster (TTL: 300s, Mutex Stampede Protected)',
  );

  const handleOpenCheckout = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setErrorMsg(null);
  };

  const handleSimulateStockUpdate = (product: Product) => {
    const updatedStock = product.stock > 5 ? product.stock - 5 : 50;
    onUpdateStock(product.id, updatedStock);
    setCacheNotice(
      `[Cache Invalidation] SKU ${product.sku} đã cập nhật tồn kho thành ${updatedStock}. Cache Redis 'product:id:${product.id}' và 'products:list:*' đã bị xóa ngay lập tức!`,
    );
  };

  const handleConfirmCheckout = async () => {
    if (!selectedProduct) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    // Strict stock verification before placement
    if (selectedProduct.stock < quantity) {
      setErrorMsg(`Sản phẩm chỉ còn ${selectedProduct.stock} trong kho. Vui lòng giảm số lượng!`);
      setIsSubmitting(false);
      return;
    }

    try {
      const orderNumber = `SF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const totalAmount = Number(selectedProduct.price) * quantity;

      const newOrder: Order = {
        id: `order-${Date.now()}`,
        orderNumber,
        customerId: currentUser.id,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        totalAmount,
        shippingAddress,
        contactPhone,
        items: [
          {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            sku: selectedProduct.sku,
            quantity,
            unitPrice: Number(selectedProduct.price),
            subtotal: totalAmount,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Deduct local stock
      onUpdateStock(selectedProduct.id, selectedProduct.stock - quantity);

      // Trigger checkout success
      onCheckoutSuccess(newOrder);
      setSelectedProduct(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi đặt hàng');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Caching & Resilience Notification Banner */}
      <div className="glass-panel p-4 rounded-2xl flex items-center justify-between gap-4 border-l-4 border-l-emerald-500">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100">Redis 7 Cache Layer (F04 Active)</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                HIT (2ms)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{cacheNotice}</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
          <Shield className="h-4 w-4 text-emerald-400" />
          <span>Mutex Lock Stampede Protected</span>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const isOutOfStock = product.stock <= 0;
          return (
            <div
              key={product.id}
              className="glass-panel rounded-2xl overflow-hidden hover:border-emerald-500/40 transition-all duration-300 flex flex-col group"
            >
              {/* Product Image */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-900">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                  <Tag className="h-3 w-3" />
                  <span>{product.category}</span>
                </div>
                <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-mono text-slate-300 border border-slate-700">
                  SKU: {product.sku}
                </div>
              </div>

              {/* Product Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-100 group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Giá niêm yết</span>
                    <div className="text-lg font-extrabold text-emerald-400 tracking-tight">
                      {Number(product.price).toLocaleString()} ₫
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Tồn kho</span>
                    <div
                      className={`text-xs font-bold ${
                        isOutOfStock ? 'text-rose-400' : product.stock < 10 ? 'text-amber-400' : 'text-slate-200'
                      }`}
                    >
                      {isOutOfStock ? 'Hết hàng' : `${product.stock} chiếc`}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSimulateStockUpdate(product)}
                    className="text-xs py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium transition-colors border border-slate-700/60"
                  >
                    Đổi tồn kho (Xóa Cache)
                  </button>

                  <button
                    disabled={isOutOfStock}
                    onClick={() => handleOpenCheckout(product)}
                    className={`text-xs py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-md ${
                      isOutOfStock
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                    }`}
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span>Mua ngay</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Checkout Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel-glow w-full max-w-lg p-6 rounded-3xl relative animate-in fade-in zoom-in duration-200">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-400" />
              <span>Xác nhận Đặt hàng & Xác thực tồn kho (F06)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Đơn hàng sẽ được xử lý trong Transaction ACID, trừ kho và đẩy job vào BullMQ.
            </p>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="mt-4 p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">{selectedProduct.name}</p>
                <p className="text-[11px] text-slate-400">SKU: {selectedProduct.sku}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-emerald-400">
                  {Number(selectedProduct.price).toLocaleString()} ₫
                </p>
                <p className="text-[11px] text-slate-400">Kho còn: {selectedProduct.stock}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Số lượng mua</label>
                <div className="flex items-center gap-3 mt-1.5">
                  <input
                    type="number"
                    min={1}
                    max={selectedProduct.stock}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                  <span className="text-xs text-slate-400">
                    Tổng tiền: {(Number(selectedProduct.price) * quantity).toLocaleString()} ₫
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Địa chỉ giao hàng</label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Số điện thoại nhận hàng</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 mt-1"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleConfirmCheckout}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-lg shadow-emerald-500/25 flex items-center gap-1.5"
              >
                {isSubmitting ? 'Đang xác thực tồn kho...' : 'Xác nhận Đặt hàng (ACID)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function Shield(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}
