const { GoogleGenerativeAI } = require("@google/generative-ai");

async function generateFoodRecommendation(amount, group, items) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("AI service not configured. Set GEMINI_API_KEY in .env");
    return "Tính năng phân tích AI đang tạm tắt do thiếu API Key.";
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const itemList = items.map(i => `${i.qty.toFixed(1)} ${i.unit} ${i.name}`).join(', ');
  const groupName = group === 'all' ? 'Tất cả các em' : `Nhóm ${group.toUpperCase()}`;

  const prompt = `Với số tiền quyên góp là ${amount.toLocaleString('vi-VN')} VNĐ dành cho trẻ em thuộc ${groupName}, chúng tôi dự kiến mua được danh sách thực phẩm sau: ${itemList}. 
  Hãy đóng vai là một chuyên gia dinh dưỡng, phân tích ngắn gọn (khoảng 2 câu) xem với danh sách thức ăn trên, cần bổ sung thêm loại vitamin, khoáng chất hay thực phẩm cụ thể nào để tối ưu dinh dưỡng. Trả lời bằng tiếng Anh. Không dùng định dạng markdown.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Lỗi khi gọi Gemini API:", error);
    return "Could not retrieve AI analysis at this moment. Please try again later.";
  }
}

module.exports = { generateFoodRecommendation };