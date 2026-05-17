# Skill: Xác Thực và Tải Tài Liệu NotebookLM Qua CLI

Đây là bộ quy tắc và kinh nghiệm (skill) được đúc kết từ quá trình gỡ lỗi khi sử dụng thư viện `notebooklm` để tải artifacts tự động. Cần tuân thủ tuyệt đối để tránh bị Google chặn hoặc gặp lỗi hệ điều hành.

## 1. Vấn đề Xác thực (Authentication) & Lỗi 403/CookieMismatch
Google áp dụng cơ chế bảo mật rất nghiêm ngặt đối với cookie (SID, OSID, Secure-1PSIDTS, v.v.), gắn chặt với các sub-domain khác nhau (`.google.com`, `notebooklm.google.com`, `accounts.google.com`). 
Việc trích xuất cookie thủ công từ trình duyệt (qua extension hoặc DevTools) rồi nạp vào Playwright thường dẫn đến lỗi **CookieMismatch** hoặc **403 Forbidden** vì không thể khớp cấu trúc đa domain mà Google yêu cầu.

### ✅ Giải pháp Chuẩn (Thực hành tốt nhất)
Bắt buộc phải dùng lệnh login tích hợp sẵn của thư viện để sinh ra file `storage_state.json` chuẩn 100%:
1. Mở Terminal và chạy: `notebooklm login`
2. Một cửa sổ Chromium cục bộ sẽ tự động hiện lên.
3. Người dùng đăng nhập tài khoản Google thủ công vào cửa sổ này.
4. Đợi đến khi load xong trang chủ NotebookLM, quay lại Terminal nhấn **Enter**.
5. (Tuỳ chọn) Kiểm tra lại bằng lệnh: `notebooklm auth check --test`

## 2. Vấn đề Tải File & Lỗi WinError 183 trên Windows
Khi tải một artifact cụ thể (sử dụng cờ `-a <id>`), CLI cho phép chỉ định đường dẫn lưu file (`<output_path>`). 
Trên hệ điều hành Windows, nếu truyền `<output_path>` là một đường dẫn thư mục (đã được tạo sẵn bằng `os.makedirs`), CLI có xu hướng cố gắng mở thư mục đó như một file để ghi dữ liệu, dẫn đến lỗi:
`[WinError 183] Cannot create a file when that file already exists`.

### ✅ Giải pháp Chuẩn (Thực hành tốt nhất)
Luôn luôn truyền `<output_path>` là một **đường dẫn file cụ thể có bao gồm cả tên và phần mở rộng (extension)** tương ứng với định dạng tải về, KHÔNG được truyền đường dẫn thư mục gốc.

**Code Python Mẫu:**
```python
# Xác định đuôi file phù hợp với loại artifact
ext_map = {
    "infographic": ".png",
    "slide-deck": ".pdf",
    "mind-map": ".json",
    "quiz": ".md",
    "flashcards": ".md",
    "data-table": ".csv",
    "report": ".md",
}
ext = ext_map.get(ptype, ".md")

# BẮT BUỘC: Đặt tên file cụ thể (ví dụ: artifact.png)
out_file = os.path.join(folder, f"artifact{ext}")

# Gọi CLI với đường dẫn file
dl_cmd = f'notebooklm download {ptype} -a {artifact_id} -n {notebook_id} --force "{out_file}"'
```

**Các tham số bắt buộc trong CLI:**
- Cần có `-n <notebook_id>` để định tuyến đúng sổ tay nếu không dùng `notebooklm use`.
- Cần có `--force` để tự động ghi đè file cũ (nếu có) thay vì hỏi (Y/N) làm kẹt script tự động.
