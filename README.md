# Facebook Auto Poster

Công cụ tự động đăng bài lên Facebook Page bằng Node.js. Tích hợp tìm kiếm web, đăng ảnh, lên lịch đăng bài và hỗ trợ đăng vào Group.

---

## Tính Năng

- **Tìm kiếm web tự động** — Tìm nội dung qua DuckDuckGo & Brave, tự động tạo bài viết
- **Đăng bài lên Page** — Đăng tin, link, ảnh lên trang Facebook
- **Lên lịch đăng bài** — Hẹn giờ đăng, lặp lại tự động
- **Đăng vào Group** — Hỗ trợ đăng bài vào Facebook Group (cần quyền `publish_to_groups`)
- **Tiếng Việt có dấu** — Toàn bộ nội dung hiển thị tiếng Việt chuẩn
- **Quản lý ảnh** — Tải ảnh từ URL, upload trực tiếp lên Facebook
- **Test API đầy đủ** — 7 bài test kiểm tra toàn bộ chức năng trước khi dùng

---

## Cài Đặt

### 1. Cài đặt Node.js

Yêu cầu Node.js phiên bản 18 trở lên. Tải tại: https://nodejs.org/

### 2. Clone hoặc tải project

```bash
cd facebook-auto-poster
npm install
```

### 3. Lấy Facebook API Credentials

#### Bước 1: Tạo Facebook App

1. Truy cập https://developers.facebook.com/
2. Nhấn **My Apps** → **Create App**
3. Chọn loại **Business** → Đặt tên App → Tạo

#### Bước 2: Thêm sản phẩm

1. Vào App vừa tạo → **Add Products**
2. Thêm **Facebook Login** và **Facebook Pages**

#### Bước 3: Lấy User Access Token

1. Vào **Tools** → **Graph API Explorer**
2. Chọn App bạn vừa tạo
3. Chọn quyền cần thiết:
   - `pages_manage_posts` — Đăng bài lên Page
   - `pages_read_engagement` — Đọc tương tác
   - `pages_read_user_content` — Đọc nội dung
   - `pages_show_list` — Hiển thị danh sách Page
   - `publish_to_groups` — Đăng vào Group (tùy chọn)
4. Nhấn **Generate Access Token**
5. Copy token (bắt đầu bằng `EAA...`)

#### Bước 4: Cấu hình

Mở file `.env` và điền token:

```
FACEBOOK_ACCESS_TOKEN=EAA_your_token_here
```

### 4. Tự động cấu hình Page

Chạy script setup để tự động tìm Page và lấy Page Token:

```bash
npm run setup
```

Script sẽ:
- Liệt kê tất cả Page bạn quản lý
- Tự động chọn Page đầu tiên
- Cập nhật `.env` với Page ID và Page Token đúng

---

## Cấu Trúc Project

```
facebook-auto-poster/
├── .env                    # Cấu hình credentials
├── .env.example            # Mẫu cấu hình
├── package.json            # Dependencies
├── README.md               # Tài liệu này
└── src/
    ├── index.js            # Entry point
    ├── facebook.js         # Facebook Graph API SDK
    ├── search.js           # Tìm kiếm web (DuckDuckGo + Brave)
    ├── auto-post.js        # Tự động tìm kiếm + đăng bài
    ├── scheduler.js        # Lên lịch đăng bài
    ├── setup.js            # Tự động cấu hình Page
    ├── test-api.js         # Test toàn bộ API
    └── search-test.js      # Test tìm kiếm web
```

---

## Hướng Dẫn Sử Dụng

### Kiểm tra kết nối API

```bash
npm test
```

Kết quả mong đợi:

```
=== Facebook API Test Suite ===

[PASS] Token hợp lệ - User: Gen Z Book Reviews
[PASS] Page: Gen Z Book Reviews (ID: 1864460076999002, Fans: 23)
[PASS] Page Token - quyền đã được xác nhận
[PASS] Đăng bài test thành công - Post ID: ...
[PASS] Đọc bài thành công - URL: ...
[PASS] Xóa bài test thành công
[PASS] Lấy feed thành công - 3 bài viết gần nhất

TAT CA TEST PASSED! API hoạt động bình thường.
```

### Đăng bài tự động

```bash
# Tìm kiếm + đăng bài
node src/auto-post.js "công nghệ AI mới nhất"

# Đăng kèm link nguồn
node src/auto-post.js "sách hay nên đọc" --link

# Đăng định dạng đầy đủ
node src/auto-post.js "xu hướng blockchain" --format full
```

### Lên lịch đăng bài

```bash
# Đăng lúc 15:00 hôm nay (nếu qua giờ thì sang ngày mai)
node src/scheduler.js "ứng dụng AI" --at "15:00"

# Đăng vào ngày giờ cụ thể
node src/scheduler.js "tips văn phòng" --at "2025-05-20 09:00"

# Đăng sau 60 phút nữa
node src/scheduler.js "công nghệ mới" --in 60

# Tự động đăng lại mỗi 120 phút (nhấn Ctrl+C để dừng)
node src/scheduler.js "tin tức công nghệ" --repeat 120
```

### Tìm kiếm web (không đăng bài)

```bash
node src/search-test.js "trí tuệ nhân tạo"
node src/search-test.js "cách dùng ChatGPT hiệu quả"
```

---

## Skill Commands (Claude Code)

Nếu bạn dùng Claude Code, có thể dùng các lệnh sau:

| Lệnh | Chức năng |
|------|-----------|
| `/fb-post <chủ đề>` | Tự động tìm kiếm + đăng bài lên Facebook |
| `/fb-test` | Kiểm tra kết nối Facebook API |
| `/fb-search <chủ đề>` | Tìm kiếm web + xem nội dung trước khi đăng |
| `/fb-schedule <chủ đề> --at <giờ>` | Lên lịch đăng bài |

**Ví dụ:**

```
/fb-post ứng dụng AI cho dân văn phòng
/fb-post xu hướng công nghệ 2025
/fb-schedule tips Excel --at 08:00
/fb-schedule sách hay --in 30
/fb-test
/fb-search machine learning cho người mới
```

---

## Facebook API SDK

Class `FacebookAPI` cung cấp đầy đủ các hàm làm việc với Facebook Graph API:

### Page Functions

| Hàm | Mô tả |
|-----|-------|
| `verifyToken()` | Kiểm tra token hợp lệ |
| `getPageInfo()` | Lấy thông tin Page |
| `getManagedPages()` | Lấy danh sách Page quản lý |
| `postMessage(message)` | Đăng bài viết |
| `postLink(url, message)` | Đăng bài kèm link |
| `postPhoto(imageUrl, message)` | Đăng bài kèm ảnh |
| `postMultiPhotos(urls, message)` | Đăng nhiều ảnh |
| `schedulePost(message, timestamp)` | Lên lịch đăng bài |
| `getPost(postId)` | Đọc bài viết |
| `getFeed(limit)` | Lấy feed Page |
| `deletePost(postId)` | Xóa bài viết |
| `getPostInsights(postId)` | Xem thống kê bài viết |
| `getPermissions()` | Kiểm tra quyền |

### Group Functions

| Hàm | Mô tả |
|-----|-------|
| `getGroups()` | Lấy danh sách Group |
| `postToGroup(groupId, message)` | Đăng bài vào Group |
| `postLinkToGroup(groupId, url, message)` | Đăng link vào Group |
| `postPhotoToGroup(groupId, imageUrl, message)` | Đăng ảnh vào Group |
| `getGroupFeed(groupId, limit)` | Lấy feed Group |

### Ví dụ dùng SDK trong code

```javascript
const FacebookAPI = require('./src/facebook');

const fb = new FacebookAPI('PAGE_ID', 'ACCESS_TOKEN');

// Đăng bài
const result = await fb.postMessage('Xin chào mọi người!');
console.log(result.postId);

// Lên lịch
const timestamp = Math.floor(Date.now() / 1000) + 3600; // 1 giờ sau
await fb.schedulePost('Bài viết đã lên lịch', timestamp);

// Đăng vào Group
await fb.postToGroup('GROUP_ID', 'Nội dung bài viết');
```

---

## Web Search Module

Class `WebSearcher` hỗ trợ tìm kiếm nội dung từ web:

```javascript
const WebSearcher = require('./src/search');
const searcher = new WebSearcher();

// Tìm kiếm
const results = await searcher.search('công nghệ AI', 5);

// Lấy nội dung trang web
const content = await searcher.getPageContent('https://example.com');

// Tạo nội dung bài viết tự động
const postContent = await searcher.summarizeForPost('AI là gì', results);
```

Tìm kiếm sử dụng 2 nguồn dự phòng:
1. **DuckDuckGo** (ưu tiên)
2. **Brave Search** (dự phòng khi DuckDuckGo thất bại)

---

## Tải Tài Liệu Từ NotebookLM

Dự án hỗ trợ tải tự động các tài liệu (ảnh, slide, báo cáo) được sinh ra từ Google NotebookLM.

### 1. Đăng nhập & Xác Thực
Để tránh lỗi **403 Forbidden** hoặc **CookieMismatch**, bạn cần đăng nhập chuẩn bằng trình duyệt qua CLI:
```bash
notebooklm login
```
Lệnh này mở trình duyệt để bạn đăng nhập Google. Sau khi đăng nhập xong, quay lại Terminal nhấn Enter.

### 2. Tự Động Tải Hàng Loạt
Dùng script tải hàng loạt các media bị thiếu:
```bash
python scripts/download-missing.py
```
*Lưu ý:* Script tự động tải các file và lưu dưới dạng `artifact.<ext>` thay vì tên gốc để tránh lỗi `WinError 183` trên hệ điều hành Windows.

---

## Xử Lý Lỗi Thường Gặp

### Token không hợp lệ

```
Lỗi: Token không hợp lệ
```

**Cách khắc phục:**
- Token có thể đã hết hạn. Tạo token mới tại Graph API Explorer
- Kiểm tra lại token trong file `.env`

### Thiếu quyền đăng bài

```
Lỗi: (#200) If posting to a page, requires both pages_read_engagement and pages_manage_posts
```

**Cách khắc phục:**
- Vào Graph API Explorer
- Chọn thêm quyền `pages_manage_posts` và `pages_read_engagement`
- Tạo lại token

### Không đăng được ảnh

```
Lỗi: Missing or invalid image file
```

**Cách khắc phục:**
- Ảnh URL phải là JPEG/PNG hợp lệ
- Facebook không chấp nhận ảnh SVG
- Dùng script `post-ai-upload.js` để tải ảnh về rồi upload trực tiếp

### Không đăng được vào Group

```
Lỗi: Requires publish_to_groups permission
```

**Cách khắc phục:**
- Vào App Review → xin quyền `publish_to_groups`
- Bạn phải là Admin của Group đó
- Tạo lại token với quyền mới

---

## Bảo Mật

- **Không bao giờ** chia sẻ file `.env` hoặc Access Token
- Thêm `.env` vào `.gitignore` (đã có sẵn)
- Token nên được gia hạn định kỳ
- Chỉ xin quyền thực sự cần thiết

---

## Yêu Cầu Hệ Thống

- Node.js >= 18
- Facebook Developer Account
- Facebook Page (để đăng bài)
- Internet connection
