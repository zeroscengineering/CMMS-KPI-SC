// อัปโหลดไฟล์รายงานไป Google Drive (ฝั่ง Server เท่านั้น)
import { google } from "googleapis";
import { Readable } from "stream";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function getAuth() {
  // วิธี A: OAuth refresh token (ไฟล์จะอยู่ใน Drive ของเจ้าของบัญชี เหมาะกับ Gmail ส่วนตัว)
  if (process.env.GOOGLE_OAUTH_REFRESH_TOKEN) {
    const oauth = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET
    );
    oauth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
    return oauth;
  }
  // วิธี B: Service Account (ต้องอัปโหลดเข้า Shared Drive เท่านั้น)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
  }
  throw new Error(
    "ยังไม่ได้ตั้งค่า Google Drive: ใส่ GOOGLE_OAUTH_* หรือ GOOGLE_SERVICE_ACCOUNT_* ใน environment variables"
  );
}

export async function uploadXlsxToDrive(opts: {
  filename: string;
  buffer: Buffer;
  convertToSheets?: boolean; // true = แปลงเป็น Google Sheets
}) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) throw new Error("ยังไม่ได้ตั้งค่า GOOGLE_DRIVE_FOLDER_ID");

  const drive = google.drive({ version: "v3", auth: getAuth() });
  const res = await drive.files.create({
    requestBody: {
      name: opts.convertToSheets ? opts.filename.replace(/\.xlsx$/, "") : opts.filename,
      parents: [folderId],
      ...(opts.convertToSheets ? { mimeType: "application/vnd.google-apps.spreadsheet" } : {}),
    },
    media: { mimeType: XLSX_MIME, body: Readable.from(opts.buffer) },
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });
  return { id: res.data.id!, name: res.data.name!, link: res.data.webViewLink! };
}
