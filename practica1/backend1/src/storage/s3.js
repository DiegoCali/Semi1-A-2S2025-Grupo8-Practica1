import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function extFromMime(mime) {
  if (!mime) return "bin";
  const m = mime.toLowerCase();
  if (m.includes("jpeg")) return "jpg";
  if (m.includes("png")) return "png";
  if (m.includes("gif")) return "gif";
  if (m.includes("webp")) return "webp";
  if (m.includes("svg")) return "svg";
  return m.split("/")[1] || "bin";
}

export class S3Storage {
  constructor() {
    this.region = process.env.AWS_REGION || "us-east-1";
    this.bucket = process.env.S3_BUCKET_NAME;
    if (!this.bucket) {
      throw new Error("S3_BUCKET_NAME no está definido en el entorno");
    }
    this.client = new S3Client({ region: this.region });
    this.usePublicAcl = String(process.env.S3_USE_PUBLIC_READ_ACL || "").toLowerCase() === "true";
    this.cdnDomain = process.env.CDN_DOMAIN || null; // si usas CloudFront
  }

  /**
   * Sube el archivo al bucket y retorna la KEY (no la URL).
   * @param {Buffer} buffer
   * @param {string} mimeType
   * @param {string} folder - p.ej. "Fotos_Publicadas" | "Fotos_Perfil"
   * @param {string} nameBase - prefijo del nombre de archivo
   */
  async upload({ buffer, mimeType, folder, nameBase }) {
    const ext = extFromMime(mimeType);
    const filename = `${nameBase}-${Date.now()}.${ext}`;
    const Key = `${folder}/${filename}`;

    const putParams = {
      Bucket: this.bucket,
      Key,
      Body: buffer,
      ContentType: mimeType || "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable",
    };

    if (this.usePublicAcl) {
      putParams.ACL = "public-read";
    }

    await this.client.send(new PutObjectCommand(putParams));
    return Key;
  }

  publicUrlFromKey(key) {
    if (this.cdnDomain) {
      return `https://${this.cdnDomain}/${key}`;
    }
    const host =
      this.region === "us-east-1"
        ? "s3.amazonaws.com"
        : `s3.${this.region}.amazonaws.com`;
    return `https://${this.bucket}.${host}/${key}`;
  }

  async signedUrlFromKey(key, expiresInSeconds = 3600) {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, cmd, { expiresIn: expiresInSeconds });
  }
}
