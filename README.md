# Veo3 AI Studio - Web App Tạo Ảnh & Video Bằng AI (Cá Nhân)

Web application cá nhân (single-user) chuyên biệt để tạo hình ảnh và video AI đỉnh cao với giao diện phong cách tối giản, hiện đại (dark mode mặc định, gradient tím-xanh tương tự veo3ai), tích hợp trực tiếp với **Google Veo** (Video Generation) và **Imagen 3** (Image Generation) qua Gemini API (`@google/genai`).

---

## 🌟 Tính Năng Chính

1. **Text-to-Image (T2I)**: Tạo hình ảnh chất lượng cao từ mô tả văn bản bằng Google Imagen 3 (`imagen-3.0-generate-002`). Hỗ trợ tỉ lệ 1:1, 16:9, 9:16, 4:3, 3:4 và sinh từ 1 đến 4 ảnh đồng thời.
2. **Image-to-Image (I2I)**: Tải ảnh mẫu làm tham chiếu, kết hợp prompt để biến đổi hình ảnh.
3. **Text-to-Video (T2V)**: Tạo video chân thực với chuyển động mượt mà bằng Google Veo 2.0 (`veo-2.0-generate-001`). Hỗ trợ tỉ lệ 16:9, 9:16, thời lượng 5s hoặc 8s, độ phân giải 720p/1080p, tùy chọn âm thanh nền.
4. **Image-to-Video (I2V)**: Tải ảnh bất kỳ (hoặc bấm nút "Dùng làm ảnh đầu cho video" từ ảnh có sẵn trong thư viện) để làm khung hình đầu tiên khởi tạo video.
5. **Cải thiện prompt thông minh (Prompt Enhancer)**: Tích hợp Gemini Flash viết lại prompt thô thành prompt tiếng Anh giàu chi tiết (ánh sáng, góc máy, camera movement, atmosphere) kèm modal duyệt trước khi áp dụng.
6. **Thư viện tác phẩm (Gallery)**:
   - Lưới hiển thị masonry responsive.
   - **Tự động phát preview (muted) khi hover chuột vào video**.
   - Bộ lọc theo định dạng (All, Video, Image), trạng thái (Completed, Processing, Failed), mục Yêu thích (Star).
   - Tìm kiếm nhanh theo nội dung prompt.
   - Trình xem chi tiết full-size (video player có thanh điều khiển).
   - Thao tác: Tải về, Sao chép prompt, Tạo lại với cùng thông số (Remix), Dùng làm ảnh đầu cho video, Đánh dấu yêu thích, Xoá.
   - **Thao tác hàng loạt**: Chọn nhiều, xoá hàng loạt, tải nén ZIP hàng loạt (`jszip`).
7. **Hàng đợi ngầm & Khôi phục (In-process Queue)**:
   - Bấm tạo -> Trả về ID tác phẩm ngay, giao diện hiển thị card tiến độ thời gian thực.
   - Tự động polling và cập nhật thông báo Toast khi hoàn tất.
   - **Tự động phục hồi**: Các tác vụ đang chạy khi server khởi động lại sẽ tự động được đưa về hàng đợi hoặc đánh dấu rõ ràng.
   - Hỗ trợ nút "Thử lại" (Retry) cho các tác vụ bị lỗi.
   - Hỗ trợ "Huỷ" các tác vụ đang trong hàng đợi chờ xử lý.
8. **Kiểm soát chi phí & Ngân sách (Cost Tracking)**:
   - Tự động ước tính và lưu trữ chi phí từng lượt tạo dựa trên `models.config.ts`.
   - Dashboard thống kê: Chi phí hôm nay, 7 ngày qua, 30 ngày qua, tổng chi phí, tỉ lệ thành công, phân bố ảnh/video.
   - **Hạn mức chi tiêu hàng ngày (Daily Budget Cap)**: Cho phép đặt ngân sách tối đa/ngày (ví dụ $10.00). Khi chạm ngưỡng, hệ thống tự động khoá tạo mới để bảo vệ ngân sách.
9. **Lưu trữ & Xử lý đa phương tiện**:
   - Tự động tải video từ Google server về máy local `/storage`.
   - Sử dụng `ffmpeg-static` để trích xuất thumbnail video chuẩn xác mà không cần cài đặt ffmpeg thủ công trên máy.
   - Thiết kế dạng abstraction (`StorageProvider`), sẵn sàng đổi sang AWS S3 / Cloudflare R2 khi cần.
10. **Bảo mật cá nhân**:
    - Xác thực bằng một mật khẩu duy nhất cấu hình trong `.env` (`APP_PASSWORD`).
    - Session bảo mật qua cookie HTTP-Only ký bởi `jose` (JWT).
    - Toàn bộ tệp trong `/storage` được bảo vệ, chỉ người dùng đã đăng nhập mới có quyền xem/tải qua `/api/assets/[...path]`.
    - Rate limiter chống spam yêu cầu API.
    - Toàn bộ dữ liệu đầu vào được xác thực nghiêm ngặt bằng Zod schemas.

---

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Lucide Icons + Framer Motion.
- **Backend**: Next.js Route Handlers + Streaming Range 206 (hỗ trợ tua video mượt mà).
- **Database**: SQLite + Prisma ORM (chạy local, nhẹ, không cần setup service phụ).
- **AI SDK**: `@google/genai` (SDK chính thức của Google cho Gemini, Imagen 3, Veo LRO).
- **Media**: `ffmpeg-static` (tự động đính kèm binary ffmpeg chạy trên Windows x64 và Linux).
- **Bảo mật**: `jose` (JWT HS256), cookie signed, in-memory rate limiter.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Local

### 1. Yêu cầu hệ thống
- Node.js version 20 trở lên (khuyên dùng Node 20 hoặc 22/24).
- Không yêu cầu cài đặt C++ Build Tools hay ffmpeg hệ thống (đã tích hợp `ffmpeg-static`).

### 2. Chuẩn bị file `.env`
Sao chép file `.env.example` thành `.env`:
```powershell
Copy-Item .env.example .env
```

Mở file `.env` và điền:
```env
# 1. API key lấy từ https://aistudio.google.com/
GEMINI_API_KEY=AIzaSy...

# 2. Mật khẩu đăng nhập web app của bạn (tuỳ chọn đổi)
APP_PASSWORD=admin123456

# 3. Chuỗi bí mật ký cookie phiên (tối thiểu 32 ký tự)
SESSION_SECRET=veo3ai_super_secret_session_key_32_characters_long_min

# 4. Cơ sở dữ liệu và lưu trữ
DATABASE_URL="file:./dev.db"
STORAGE_DIR="./storage"
PORT=3000
```

> **Cách lấy GEMINI_API_KEY:**
> 1. Truy cập [Google AI Studio](https://aistudio.google.com/).
> 2. Đăng nhập tài khoản Google và bấm **Get API Key** -> **Create API Key**.
> 3. Đảm bảo tài khoản của bạn đã liên kết thanh toán (GCP Billing) nếu bạn muốn dùng model Google Veo sản xuất (`veo-2.0-generate-001`).

### 3. Đồng bộ Database SQLite
```powershell
npx prisma db push
```

### 4. Khởi chạy môi trường phát triển (Development)
```powershell
npm run dev
```
Truy cập trình duyệt tại: **http://localhost:3000**
- Nhập mật khẩu đã đặt trong `.env` (`admin123456`) để đăng nhập.

---

## 🐳 Triển Khai Bằng Docker & Docker Compose

Dự án có sẵn `Dockerfile` (multi-stage build tối ưu kích thước) và `docker-compose.yml`.

### Chạy bằng Docker Compose:
```powershell
docker compose up -d --build
```
Dữ liệu database (`./prisma/dev.db`) và toàn bộ file ảnh, video (`./storage`) sẽ được mount ra ngoài thư mục máy chủ để bảo toàn dữ liệu vĩnh viễn khi restart container.

---

## ⚙️ Cấu Hình Model & Đơn Giá (`lib/config/models.config.ts`)

Mọi thông số về model, đơn giá và phong cách đều được tách biệt trong `lib/config/models.config.ts`:

```typescript
// Thêm hoặc sửa model Video:
videoModels: [
  {
    id: "veo-2.0-generate-001",
    name: "Google Veo 2.0 (Tiêu chuẩn)",
    pricing: { perSecond: 0.06 }, // $0.06 / giây
    supportedAspectRatios: ["16:9", "9:16"],
    supportedDurations: [5, 8],
    supportedResolutions: ["720p", "1080p"],
    supportsAudio: true,
    supportsImageToVideo: true,
  },
  // Thêm model mới...
]
```

---

## 🧩 Hướng Dẫn Mở Rộng Thêm AI Provider Mới

Kiến trúc áp dụng mẫu thiết kế **Provider Pattern**. Để thêm nhà cung cấp khác (ví dụ Runway, OpenAI Sora, Fal.ai):

1. Tạo file mới `lib/providers/runway.ts` implement interface `AIProvider`:
   ```typescript
   import { AIProvider, GenerateImageInput, GenerateVideoInput } from "./types";

   export class RunwayProvider implements AIProvider {
     id = "runway";
     name = "Runway Gen-3";

     async generateImage(input: GenerateImageInput) { ... }
     async generateVideo(input: GenerateVideoInput) { ... }
     async enhancePrompt(prompt: string, type: "image" | "video") { ... }
   }
   ```
2. Đăng ký trong `lib/providers/index.ts`:
   ```typescript
   import { RunwayProvider } from "./runway";
   registerAIProvider(new RunwayProvider());
   ```

---

## 🧪 Kiểm Thử Hệ Thống (Unit Tests)

Dự án có sẵn bộ unit test cho các luồng nghiệp vụ quan trọng (Zod validation, thuật toán tính chi phí, cơ chế lưu trữ):

```powershell
npm test
```

Kiểm tra tính toàn vẹn TypeScript:
```powershell
npx tsc --noEmit
```

---

## ✅ Checklist Kiểm Tra Nghiệm Thu (Verification Checklist)

1. [x] **Khởi động**: Chạy `npm run dev`, mở `http://localhost:3000` -> tự động chuyển hướng sang `/login`.
2. [x] **Đăng nhập**: Nhập sai mật khẩu -> báo lỗi; nhập đúng `admin123456` -> chuyển vào trang `/create`.
3. [x] **Cải thiện prompt**: Nhập prompt ngắn (ví dụ: `con mèo trong vũ trụ`) -> Bấm "Cải thiện prompt" -> Gemini Flash gợi ý prompt chi tiết -> Bấm "Áp dụng prompt này".
4. [x] **Text-to-Image**: Chọn tab Tạo Ảnh -> Chọn tỉ lệ 16:9 -> Bấm "Tạo Ảnh với Imagen" -> Card tiến độ xuất hiện -> Khi xong, có thông báo Toast và ảnh hiển thị.
5. [x] **Text-to-Video**: Chọn tab Tạo Video -> Bấm "Prompt mẫu gợi ý" -> Bấm "Tạo Video với Veo" -> Veo bắt đầu LRO polling -> Video hoàn tất và tự động lưu về local `/storage/videos`.
6. [x] **Image-to-Video**:
   - Cách 1: Tải ảnh lên trong khung tham chiếu ở trang `/create` -> Bấm tạo video.
   - Cách 2: Trong trang `/gallery`, mở một ảnh đã tạo -> Bấm "Dùng làm ảnh đầu cho video" -> Tự động điền ảnh vào trang `/create`.
7. [x] **Thư viện (Gallery)**:
   - Hover chuột qua thẻ video -> Video tự động phát preview (muted).
   - Lọc theo Ảnh / Video / Trạng thái / Yêu thích.
   - Tìm kiếm từ khoá trong ô search.
   - Bấm vào tác phẩm -> Mở modal xem full size với đầy đủ prompt, model, chi phí.
   - Bấm nút "Tải về" để tải file gốc.
8. [x] **Thao tác hàng loạt**:
   - Bấm "Chọn nhiều" -> Tích chọn vài tác phẩm -> Bấm "Tải ZIP" -> Trình duyệt tải về file `.zip` chứa toàn bộ media đã chọn.
9. [x] **Theo dõi chi phí (`/usage`)**:
   - Xem tổng chi phí hôm nay, tuần này, tháng này.
   - Thử nhập hạn mức mới (ví dụ: $5.00) và bấm "Lưu hạn mức chi tiêu" -> Kiểm tra thông báo lưu thành công.
10. [x] **Bảo mật**: Thử mở cửa sổ ẩn danh và truy cập trực tiếp `http://localhost:3000/storage/videos/...` hoặc `http://localhost:3000/api/generations` -> Bị chặn (401 Unauthorized hoặc chuyển hướng về `/login`).
