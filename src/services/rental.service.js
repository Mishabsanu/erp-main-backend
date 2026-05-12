import { DeliveryTicket } from "../models/DeliveryTicket.model.js";
import ReturnTicket from "../models/ReturnTicket.model.js";
import { Order } from "../models/RunningOrder.model.js";

/**
 * Get all rental (Hire) orders with aggregated summary
 */
export const getRentals = async ({ page = 1, limit = 10, search = "", status = "" }) => {
  const allTypes = await Order.distinct('transaction_type');
  console.log('Rental Tracking: All transaction types in DB:', allTypes);
  
  const query = {
    transaction_type: "Hire"
  };

  console.log('Rental Tracking: Fetching data with query:', JSON.stringify(query));

  if (search) {
    query.$or = [
      { order_number: { $regex: search, $options: "i" } },
      { invoice_number: { $regex: search, $options: "i" } },
      { company_name: { $regex: search, $options: "i" } },
      { client_name: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCount = await Order.countDocuments(query);
  console.log(`Rental Tracking: Found ${orders.length} orders out of ${totalCount} total hire orders`);

  // Aggregate stats for each order
  const rentals = await Promise.all(orders.map(async (order) => {
    const orderId = order._id;

    // Get all delivery tickets for this order
    const deliveries = await DeliveryTicket.find({ runningOrderId: orderId });
    // Get all return tickets for this order
    const returns = await ReturnTicket.find({ runningOrderId: orderId });

    // Calculate aggregated item stats
    const itemStats = order.items.map(orderItem => {
      const productId = orderItem.productId?.toString();
      
      // Total delivered for this product
      const deliveredQty = deliveries.reduce((sum, dt) => {
        const dtItem = dt.items.find(i => i.productId?.toString() === productId);
        return sum + (dtItem ? dtItem.quantity : 0);
      }, 0);

      // Total returned for this product
      const returnedQty = returns.reduce((sum, rt) => {
        const rtItem = rt.items.find(i => i.productId?.toString() === productId);
        return sum + (rtItem ? rtItem.returnQty : 0);
      }, 0);

      const siteBalance = Math.max(0, deliveredQty - returnedQty);
      const isClosed = returnedQty >= orderItem.quantity && orderItem.quantity > 0;

      return {
        productId,
        name: orderItem.name,
        itemCode: orderItem.itemCode,
        orderedQty: orderItem.quantity,
        deliveredQty,
        returnedQty,
        siteBalance,
        isClosed
      };
    });

    const isFullyReturned = itemStats.every(item => item.siteBalance === 0 && item.deliveredQty > 0);

    return {
      _id: order._id,
      orderNumber: order.order_number,
      invoiceNumber: order.invoice_number,
      poNumber: order.po_number,
      companyName: order.company_name,
      clientName: order.client_name,
      orderedDate: order.ordered_date,
      projectLocation: order.project_location,
      status: isFullyReturned ? "Closed" : "Active",
      itemStats
    };
  }));

  // Apply status filter if provided
  let filteredRentals = rentals;
  if (status) {
    filteredRentals = rentals.filter(r => r.status === status);
  }

  return {
    content: filteredRentals,
    totalCount: status ? filteredRentals.length : totalCount,
    totalPages: Math.ceil((status ? filteredRentals.length : totalCount) / limit),
    currentPage: page,
    limit
  };
};

/**
 * Get detailed rental lifecycle for a specific order
 */
export const getRentalDetails = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  const deliveries = await DeliveryTicket.find({ runningOrderId: orderId }).sort({ createdAt: 1 });
  const returns = await ReturnTicket.find({ runningOrderId: orderId }).sort({ createdAt: 1 });

  const itemStats = order.items.map(orderItem => {
    const productId = orderItem.productId?.toString();
    
    const deliveredQty = deliveries.reduce((sum, dt) => {
      const dtItem = dt.items.find(i => i.productId?.toString() === productId);
      return sum + (dtItem ? dtItem.quantity : 0);
    }, 0);

    const returnedQty = returns.reduce((sum, rt) => {
      const rtItem = rt.items.find(i => i.productId?.toString() === productId);
      return sum + (rtItem ? rtItem.returnQty : 0);
    }, 0);

    return {
      productId,
      name: orderItem.name,
      itemCode: orderItem.itemCode,
      orderedQty: orderItem.quantity,
      deliveredQty,
      returnedQty,
      siteBalance: Math.max(0, deliveredQty - returnedQty)
    };
  });

  return {
    order: {
      _id: order._id,
      orderNumber: order.order_number,
      invoiceNumber: order.invoice_number,
      companyName: order.company_name,
      poNumber: order.po_number,
      projectLocation: order.project_location
    },
    itemStats,
    history: {
      deliveries: deliveries.map(d => ({
        _id: d._id,
        ticketNo: d.ticketNo,
        date: d.deliveryDate,
        items: d.items
      })),
      returns: returns.map(r => ({
        _id: r._id,
        ticketNo: r.ticketNo,
        date: r.returnDate,
        items: r.items
      }))
    }
  };
};
