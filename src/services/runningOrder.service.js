import { Order } from "../models/RunningOrder.model.js";
import { DeliveryTicket } from "../models/DeliveryTicket.model.js";
import ReturnTicketModel from "../models/ReturnTicket.model.js";

export const getAllOrders = async ({
  user,
  page = 1,
  limit = 10,
  search = "",
  status,
  transaction_type,
  currency,
}) => {
  const query = {};

  // Role-based data isolation
  const roleName = (typeof user?.role === 'object' ? user.role?.name : user?.role)?.toLowerCase() || "";
  const isAdmin = roleName === "admin" || roleName === "super admin";

  if (!isAdmin && user?.id) {
    query.createdBy = user.id;
  }

  if (search) {
    query.$or = [
      { company_name: { $regex: search, $options: "i" } },
      { client_name: { $regex: search, $options: "i" } },
      { order_number: { $regex: search, $options: "i" } },
      { invoice_number: { $regex: search, $options: "i" } },
      { sales_person: { $regex: search, $options: "i" } },
    ];
  }

  if (status) {
    if (status === 'Ongoing') {
      query.status = { $nin: ['Completed', 'Closed'] };
    } else if (status === 'Completed') {
      query.status = { $in: ['Completed', 'Closed'] };
    } else {
      query.status = status;
    }
  }

  if (transaction_type) {
    query.transaction_type = transaction_type;
  }

  if (currency) {
    query.currency = currency;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, totalCount] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("createdBy", "name"),
    Order.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalCount / Number(limit));

  return {
    content: orders,
    totalCount,
    totalPages,
    currentPage: Number(page),
  };
};

export const getOrderById = async (id) => {
  return Order.findById(id).populate("createdBy", "name");
};

export const createOrder = async (orderData) => {
  if (!orderData.order_number) {
    orderData.order_number = await getLatestRunningOrderNo();
  }
  return Order.create(orderData);
};

export const updateOrderById = async (id, orderData) => {
  return Order.findByIdAndUpdate(id, orderData, {
    new: true,
    runValidators: true,
  });
};

export const deleteOrderById = async (id) => {
  return Order.findByIdAndDelete(id);
};

export const getOrdersDropdown = async () => {
  return Order.find({}, { _id: 1, order_number: 1, invoice_number: 1, po_number: 1, client_name: 1, company_name: 1, items: 1, transaction_type: 1, project_location: 1 }).sort({ createdAt: -1 });
};

export const getFulfillmentStats = async (id, { startDate, endDate } = {}) => {
  const order = await Order.findById(id);
  if (!order) return null;

  const ticketQuery = { runningOrderId: id };
  if (startDate || endDate) {
    const dateQuery = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);

    // Apply to deliveryDate and returnDate respectively
    const [deliveries, returns] = await Promise.all([
      DeliveryTicket.find({ ...ticketQuery, deliveryDate: dateQuery }),
      ReturnTicketModel.find({ ...ticketQuery, returnDate: dateQuery })
    ]);
    return calculateFulfillment(order, deliveries, returns);
  }

  const [deliveries, returns] = await Promise.all([
    DeliveryTicket.find(ticketQuery),
    ReturnTicketModel.find(ticketQuery)
  ]);
  
  return calculateFulfillment(order, deliveries, returns);
};

// Helper function to calculate stats
const calculateFulfillment = (order, deliveries, returns) => {
  const stats = order.items.map(orderItem => {
    // Total delivered for this product
    const deliveredQty = deliveries.reduce((acc, dn) => {
      const dnItem = dn.items.find(i => i.productId.toString() === orderItem.productId.toString());
      return acc + (dnItem ? dnItem.quantity : 0);
    }, 0);

    // Total returned for this product
    const returnedQty = returns.reduce((acc, rn) => {
      const rnItem = rn.items.find(i => i.productId.toString() === orderItem.productId.toString());
      return acc + (rnItem ? rnItem.returnQty : 0);
    }, 0);

    const netDelivered = deliveredQty - returnedQty;
    const pendingQty = orderItem.quantity - netDelivered;

    return {
      productId: orderItem.productId,
      name: orderItem.name,
      itemCode: orderItem.itemCode,
      unit: orderItem.unit,
      orderedQty: orderItem.quantity,
      deliveredQty,
      returnedQty,
      netDelivered,
      pendingQty: Math.max(0, pendingQty),
      status: orderItem.status || 'Order Placed'
    };
  });

  return {
    orderStatus: order.status,
    items: stats,
    tickets: {
      deliveries: deliveries.map(d => ({ _id: d._id, ticketNo: d.ticketNo, date: d.deliveryDate, qty: d.items.reduce((a, b) => a + b.quantity, 0) })),
      returns: returns.map(r => ({ _id: r._id, ticketNo: r.ticketNo, date: r.returnDate, qty: r.items.reduce((a, b) => a + b.returnQty, 0) }))
    }
  };
};

export const getLatestRunningOrderNo = async () => {
    const latest = await Order.findOne().sort({ order_number: -1 }).lean();
    let nextNo = "RO-00001";
    if (latest?.order_number) {
        const lastNumber = parseInt(latest.order_number.replace("RO-", ""), 10);
        if (!isNaN(lastNumber)) {
            nextNo = `RO-${String(lastNumber + 1).padStart(5, "0")}`;
        }
    }
    return nextNo;
};
