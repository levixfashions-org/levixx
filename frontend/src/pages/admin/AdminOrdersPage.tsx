import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/api';
import { AdminNav } from '../../components/admin/AdminNav';
import { 
  ShoppingBag, 
  Search, 
  CheckCircle2, 
  Truck, 
  Package, 
  ExternalLink, 
  X, 
  Plus, 
  Trash2, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Save 
} from 'lucide-react';

export const AdminOrdersPage: React.FC = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Courier edit state inside modal
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [savingCourier, setSavingCourier] = useState(false);
  const [showUnpaid, setShowUnpaid] = useState(false);

  const navigate = useNavigate();

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/orders', { includeUnpaid: showUnpaid ? 'true' : undefined, limit: 200 });
      setOrders(res.data.orders || []);
    } catch (err) {
      console.warn('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/login');
      return;
    }
    if (user && isAdmin) loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, authLoading, navigate, showUnpaid]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingId(orderId);
      await apiClient.patch(`/admin/orders/${orderId}/status`, { status: newStatus });
      const ordNo = orders.find((o) => o.id === orderId)?.orderNumber || '';
      setActionMsg(`✓ Order ${ordNo} marked as ${newStatus}.`);
      await loadOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveCourier = async () => {
    if (!selectedOrder) return;
    setSavingCourier(true);
    try {
      await apiClient.patch(`/admin/orders/${selectedOrder.id}/status`, {
        courier: courierName.trim(),
        trackingNumber: trackingNumber.trim()
      });
      setActionMsg(`✓ Courier & tracking number updated for Order ${selectedOrder.orderNumber}!`);
      await loadOrders();
      setSelectedOrder({
        ...selectedOrder,
        courier: courierName.trim(),
        trackingNumber: trackingNumber.trim()
      });
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update tracking');
    } finally {
      setSavingCourier(false);
    }
  };

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`Delete order ${orderNumber} permanently?`)) return;
    try {
      await apiClient.delete(`/admin/orders/${orderId}`);
      setActionMsg(`✓ Order ${orderNumber} deleted.`);
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      await loadOrders();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete order');
    }
  };

  const openOrderInspector = (ord: any) => {
    setSelectedOrder(ord);
    setCourierName(ord.courier || '');
    setTrackingNumber(ord.trackingNumber || '');
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = 
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#EFEFEF] pb-24">
      <AdminNav />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 py-10 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/10 pb-6 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-[#FF5400] font-bold">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>FULFILLMENT & COURIER LOGISTICS</span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tight text-black mt-1">
              Customer Orders Administration
            </h1>
            <p className="text-xs text-neutral-600 mt-1">
              Paid orders from Razorpay. Add courier tracking and update status — customers see it in My Orders.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <label className="flex items-center gap-2 text-[11px] font-semibold text-neutral-700 cursor-pointer">
              <input type="checkbox" checked={showUnpaid} onChange={(e) => setShowUnpaid(e.target.checked)} className="accent-black" />
              Show abandoned / unpaid checkouts
            </label>
            <button onClick={loadOrders} className="px-4 py-2.5 border border-black text-black text-xs font-bold uppercase tracking-wider hover:bg-black hover:text-white">
              Refresh
            </button>
          </div>
        </div>

        {actionMsg && (
          <div className="p-4 bg-black text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-[#FF5400]" />
              <span>{actionMsg}</span>
            </div>
            <button onClick={() => setActionMsg(null)} className="opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Toolbar: Search & Status Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 border border-black/10 shadow-xs">
          
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by order number (e.g. LVX-), customer name or email..."
              className="w-full pl-9 pr-4 py-2 border border-black/20 text-xs focus:border-black focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
            {['ALL', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'PAID', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xs transition-all ${
                  statusFilter === st
                    ? 'bg-black text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="py-20 text-center font-mono text-xs uppercase text-neutral-500">
            Loading order registry...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white border border-black/10 p-12 text-center space-y-3">
            <p className="text-xs font-mono uppercase text-neutral-500">No orders found matching your filter.</p>
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); }}
              className="text-xs font-bold uppercase text-[#FF5400] underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="bg-white border border-black/10 shadow-sm overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-black/10 uppercase tracking-wider text-[10px] text-neutral-500 bg-neutral-50">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Total (INR)</th>
                  <th className="py-3 px-4">Fulfillment State</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 font-sans">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold font-mono text-black">
                      <button
                        onClick={() => openOrderInspector(ord)}
                        className="text-black hover:text-[#FF5400] transition-colors underline font-bold"
                      >
                        {ord.orderNumber}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-500 text-[11px]">
                      {new Date(ord.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-black">{ord.customerName}</p>
                      <p className="text-[11px] text-neutral-500">{ord.customerEmail}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-neutral-700">
                        {ord.items?.length || 1} item(s)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-xs ${
                        ord.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {ord.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-black">
                      RS. {(ord.totalPaise / 100).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={ord.status}
                        disabled={updatingId === ord.id}
                        onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                        className="border border-black/20 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wider cursor-pointer focus:outline-none"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="PAID">PAID</option>
                        <option value="PROCESSING">PROCESSING</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openOrderInspector(ord)}
                          className="px-2.5 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-800"
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(ord.id, ord.orderNumber)}
                          className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                          title="Delete Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Order Detail Inspector Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white max-w-xl w-full shadow-2xl border border-black/20 overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-black/10 bg-neutral-50">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-display font-black text-xl text-black">
                    {selectedOrder.orderNumber}
                  </span>
                  <span className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-xs ${
                    selectedOrder.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                    selectedOrder.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                    selectedOrder.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-neutral-500 mt-0.5">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                </p>
              </div>

              <button onClick={() => setSelectedOrder(null)} className="text-neutral-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto text-xs">
              
              {/* Customer Info Card */}
              <div className="p-4 bg-neutral-50 border border-black/10 space-y-2">
                <div className="flex items-center space-x-1.5 font-bold uppercase text-neutral-700 tracking-wider">
                  <User className="w-3.5 h-3.5 text-[#FF5400]" />
                  <span>Customer Profile</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-neutral-600">
                  <p><span className="font-semibold text-black">Name:</span> {selectedOrder.customerName}</p>
                  <p><span className="font-semibold text-black">Email:</span> {selectedOrder.customerEmail}</p>
                  <p><span className="font-semibold text-black">Phone:</span> {selectedOrder.customerPhone || 'N/A'}</p>
                  <p><span className="font-semibold text-black">Payment:</span> <span className={selectedOrder.paymentStatus === 'PAID' ? 'text-green-700 font-bold' : 'text-yellow-700 font-bold'}>{selectedOrder.paymentStatus} (Razorpay)</span></p>
                  {selectedOrder.payment?.razorpayPaymentId && (
                    <p><span className="font-semibold text-black">Payment ID:</span> <span className="font-mono">{selectedOrder.payment.razorpayPaymentId}</span></p>
                  )}
                  {selectedOrder.couponCode && (
                    <p><span className="font-semibold text-black">Coupon:</span> {selectedOrder.couponCode} (- RS. {(selectedOrder.discountPaise / 100).toLocaleString('en-IN')})</p>
                  )}
                  {selectedOrder.adminNotes && (
                    <p className="text-yellow-800 bg-yellow-50 border border-yellow-200 p-2 whitespace-pre-line">{selectedOrder.adminNotes}</p>
                  )}
                </div>
                <div className="pt-2 border-t border-black/5">
                  <p className="font-semibold text-black flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Shipping Address:</span>
                  </p>
                  <p className="text-neutral-700 font-sans mt-0.5">
                    {selectedOrder.shippingAddress || '—'}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-black">Purchased Items</h4>
                <div className="border border-black/10 divide-y divide-black/5">
                  {selectedOrder.items?.map((it: any, i: number) => (
                    <div key={i} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-black">{it.productName}</p>
                        <p className="text-[10px] font-mono text-neutral-500">Size: <span className="font-bold text-black">{it.size}</span>{it.color ? <> | Colour: <span className="font-bold text-black">{it.color}</span></> : null} | Qty: {it.quantity}</p>
                      </div>
                      <p className="font-mono font-bold text-black">
                        RS. {(((it.subtotalPaise ?? it.unitPricePaise * it.quantity) || 0) / 100).toLocaleString('en-IN')}
                      </p>
                    </div>
                  ))}
                  <div className="p-3 bg-neutral-50 flex items-center justify-between font-bold">
                    <span className="uppercase text-neutral-700">Total Order Value:</span>
                    <span className="font-mono text-black text-sm">
                      RS. {(selectedOrder.totalPaise / 100).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Courier & Tracking Assignment */}
              <div className="p-4 bg-neutral-50 border border-black/10 space-y-3">
                <div className="flex items-center space-x-1.5 font-bold uppercase text-neutral-700 tracking-wider">
                  <Truck className="w-3.5 h-3.5 text-[#FF5400]" />
                  <span>Courier Fulfillment & Airway Bill (AWB)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">
                      Courier Partner
                    </label>
                    <input
                      type="text"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      placeholder="e.g. Blue Dart Express, Delhivery"
                      className="w-full bg-white border border-black/20 p-2 text-xs focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-neutral-600 mb-1">
                      Tracking / AWB Number
                    </label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="e.g. BD7892182IN"
                      className="w-full bg-white border border-black/20 p-2 text-xs font-mono focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={savingCourier}
                    onClick={handleSaveCourier}
                    className="px-3.5 py-1.5 bg-black text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 hover:bg-neutral-800"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingCourier ? 'Updating...' : 'Save Tracking'}</span>
                  </button>
                </div>
              </div>

              {/* Fast Status Transition Buttons */}
              <div className="space-y-2 pt-2 border-t border-black/10">
                <span className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold">
                  Quick Status Action:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'SHIPPED')}
                    className="px-3 py-1.5 bg-blue-600 text-white font-bold uppercase tracking-wider text-[10px] hover:bg-blue-700"
                  >
                    Mark as Shipped
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'DELIVERED')}
                    className="px-3 py-1.5 bg-green-700 text-white font-bold uppercase tracking-wider text-[10px] hover:bg-green-800"
                  >
                    Mark as Delivered
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'PROCESSING')}
                    className="px-3 py-1.5 bg-neutral-800 text-white font-bold uppercase tracking-wider text-[10px] hover:bg-black"
                  >
                    Set to Processing
                  </button>
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'CANCELLED')}
                    className="px-3 py-1.5 border border-red-300 text-red-600 font-bold uppercase tracking-wider text-[10px] hover:bg-red-50"
                  >
                    Cancel Order
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-black/10 bg-neutral-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 bg-black text-white uppercase font-bold text-xs"
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};