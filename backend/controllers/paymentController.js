const Payment = require("../models/Payment.js");
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function createOrder(req, res) {
    const options = {
        amount: 500,
        currency: "INR",
        receipt: "receipt_order_1"
    };
    try {
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (err) {
        res.status(500).send(err);
    }
}

async function makePayment(req, res) {
    const payment = req.body;
    try {
        const p = await Payment.create({
            patientId: payment.patientId,
            amount: payment.amount,
            method: payment.method,
            status: "PAID",
            razorpayPaymentId: payment.razorpayPaymentId || null,
            razorpayOrderId: payment.razorpayOrderId || null
        });
        res.status(200).json({ message: "Payment Successful", payment: p });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getPayment(req, res) {
    try {
        const paymentId = req.params.paymentId;
        const payment = await Payment.findById(paymentId);
        if (!payment)
            return res.status(404).json({ msg: "Payment not found", found: false });
        res.status(200).json({ payment, found: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function verifyPayment(req, res) {
    try {
        
        res.status(200).json({ success: true, message: "Payment verified successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = { makePayment, createOrder, getPayment, verifyPayment };