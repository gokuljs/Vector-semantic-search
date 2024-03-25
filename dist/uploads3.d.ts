/// <reference types="express-serve-static-core" />
/// <reference types="multer" />
export declare const uploadToS3: (file: Express.Multer.File) => Promise<string>;
