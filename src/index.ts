import express from "express";
import multer from "multer";
const upload = multer({ dest: "uploads/" }); // Files will be saved in the "uploads" directory

const app = express();
const PORT = process.env.PORT || 7000;

app.post("/upload", upload.array("files"), (req, res) => {
  console.log("Files uploaded:", req.files);
  res.send("Files uploaded successfully");
});

app.listen(PORT, () => {
  console.log("Server is running on port 5000"); // Correct the port number in the log
});
