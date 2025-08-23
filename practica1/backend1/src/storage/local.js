import fs from "fs";
import path from "path";

export class LocalStorage {
    constructor() {
        this.baseDir = process.env.LOCAL_UPLOAD_DIR || "./uploads";
        if (!fs.existsSync(this.baseDir))
            fs.mkdirSync(this.baseDir, { recursive: true });
    }

    async upload({ buffer, mimeType, folder, nameBase }) {
        const ext = (mimeType?.split("/")[1] || "bin").replace("+xml", "");
        const dir = path.join(this.baseDir, folder);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const filename = `${nameBase}-${Date.now()}.${ext}`;
        const filePath = path.join(dir, filename);
        await fs.promises.writeFile(filePath, buffer);
        // “key” que simula la de S3:
        const key = `${folder}/${filename}`;
        return key;
    }

    publicUrlFromKey(key) {
        return `/static/${key}`;
    }
}
