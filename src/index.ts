import express, { Request, Response, NextFunction } from "express";
import multer, { MulterError } from "multer";
import cors from "cors";

const upload = multer({ dest: "uploads/" });
const app = express();
app.use(cors()); // This will enable all CORS requests. For production, configure this properly.

app.post("/upload", upload.array("images"), (req: Request, res: Response) => {
  // Assuming 'req.files' would be an array of files
  if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
    // If no files are uploaded, send a 400 Bad Request response
    return res.status(400).send("No files were uploaded.");
  }

  // If files are uploaded, log them and send a 200 OK response
  console.log(req.files);
  res.status(200).send("Files uploaded successfully");
});

const port = process.env.PORT || 2000;
app.listen(port, () => console.log(`Server running on port ${port}`));
