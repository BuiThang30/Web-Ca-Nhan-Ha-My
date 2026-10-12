const express = require("express");
const nodemailer = require("nodemailer");
const { rateLimit } = require("express-rate-limit");
require("dotenv").config();

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please try again later." },
});

// 📧 Tạo transporter Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Hàm dọn dẹp chống chèn mã độc HTML
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 📨 API GỬI EMAIL: POST /api/send-email
router.post("/send-email", limiter, async (req, res) => {
  try {
    const { type, email, amount, estimateText, items, details } = req.body;
    const time = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

    // Cài đặt email đích (hòm thư của trang)
    const emailTo = process.env.DIARY_TO || "thenourishspoon@gmail.com"; 
    
    let subject = "";
    let htmlContent = "";

    // Xử lý nội dung tùy theo loại quyên góp
    if (type === "financial") {
      subject = "[The Nourish Spoon] New Financial Donation";
      htmlContent = `
        <h2 style="color: #8b0a4f;">New Financial Transfer Confirmed</h2>
        <p><b>Time:</b> ${time}</p>
        <p><b>Donor Email:</b> ${escapeHtml(email)}</p>
        <p><b>Amount Registered:</b> ${escapeHtml(amount)} VND</p>
        <div style="background:#fffdd8; padding:15px; border-radius:10px; margin-top:20px; color:#8b0a4f;">
          <h3 style="margin-top:0;">Analysis of recommended food:</h3>
          <p style="white-space: pre-wrap; font-family: sans-serif;">${escapeHtml(estimateText)}</p>
        </div>
      `;
    } else if (type === "supplies") {
      subject = "[The Nourish Spoon] New Supplies Donation";
      htmlContent = `
        <h2 style="color: #8b0a4f;">New Supplies Donation Confirmed</h2>
        <p><b>Time:</b> ${time}</p>
        <p><b>Donor Email:</b> ${escapeHtml(email)}</p>
        <p><b>Donor Details:</b> ${escapeHtml(details || "Not provided")}</p>
        <div style="background:#fffdd8; padding:15px; border-radius:10px; margin-top:20px; color:#8b0a4f;">
          <h3 style="margin-top:0;">Items Registered:</h3>
          <p style="white-space: pre-wrap; font-family: sans-serif;">${escapeHtml(items)}</p>
        </div>
      `;
    } else {
      return res.status(400).json({ success: false, error: "Invalid donation type." });
    }

    // Thực hiện gửi mail
    await transporter.sendMail({
      from: `"The Nourish Spoon" <${process.env.MAIL_USER}>`,
      to: emailTo,
      subject: subject,
      html: htmlContent,
    });

    res.json({ success: true, message: "Email sent successfully." });

  } catch (err) {
    console.error("Mail error:", err);
    res.status(500).json({ success: false, error: "Could not send the email." });
  }
});

module.exports = router;