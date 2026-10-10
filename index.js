require("dotenv").config();
const express = require("express");
const path = require("path");

// Nhúng các file Router
const apiRouter = require("./routers/api");
const emailRouter = require("./routers/email");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Cấu hình các đường dẫn API
app.use("/api", apiRouter);
app.use("/api", emailRouter);

// Route trang chủ
app.get("/", (req, res) => {
  res.redirect("/home");
});

// Route load các file HTML trong thư mục public
app.get("/:page", (req, res, next) => {
  const page = req.params.page;

  if (page === "api") {
    return next();
  }

  const filePath = path.join(__dirname, "public", `${page}.html`);

  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send("Trang không tồn tại!");
    }
  });
});

// Khởi chạy server
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});