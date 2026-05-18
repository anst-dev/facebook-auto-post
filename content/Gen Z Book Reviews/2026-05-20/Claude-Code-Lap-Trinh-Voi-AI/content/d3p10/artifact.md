# Hướng dẫn Học tập Toàn diện về Claude Code

Tài liệu này được biên soạn nhằm cung cấp một cái nhìn tổng quan, chuyên sâu và có cấu trúc về Claude Code dựa trên khóa học hướng dẫn của Nick Saraev. Claude Code là một công cụ lập trình và năng suất mạnh mẽ được phát triển bởi Anthropic, có khả năng vận hành cả trên giao diện dòng lệnh (Terminal) và giao diện người dùng đồ họa (GUI).

---

## I. Tổng quan về Claude Code

Claude Code không chỉ đơn thuần là một công cụ hỗ trợ lập trình; nó được coi là một "bộ não thứ hai" có khả năng tự động hóa các nhiệm vụ kỹ thuật và chuyên môn phức tạp.

*   **Giá trị cốt lõi:** Tăng cường đòn bẩy năng suất trong kỹ thuật phần mềm và các tác vụ quản lý kinh doanh.
*   **Chi phí:** Yêu cầu gói Pro (khoảng 17-28 USD tùy khu vực) hoặc gói Team/Enterprise của Anthropic.
*   **Môi trường hoạt động:** Chạy cục bộ (locally) trên máy tính của người dùng, cho phép nó can thiệp trực tiếp vào tệp tin, viết kịch bản (scripts) và cấu trúc lại hệ thống dữ liệu.

---

## II. Thiết lập và Môi trường Phát triển (IDE)

### 1. Cài đặt cơ bản
*   **Giao diện dòng lệnh (Terminal):** Sử dụng lệnh `curl` cho macOS/Linux hoặc các lệnh tương đương trên Windows PowerShell để cài đặt bản gốc (native install).
*   **Đăng nhập:** Sử dụng lệnh `/login` và chọn phương thức xác thực thông qua gói đăng ký (Pro/Team/Enterprise).

### 2. Các môi trường phát triển tích hợp (IDE)
Tài liệu đề cập đến hai IDE chính để quản lý dự án:
*   **Visual Studio Code (VS Code):** Phổ biến, có khả năng mở rộng cao. Cần cài đặt tiện ích mở rộng (extension) chính thức từ Anthropic.
*   **Anti-Gravity:** Một sản phẩm của Google, được xây dựng dựa trên nền tảng VS Code nhưng có giao diện hiện đại hơn và tập trung mạnh vào AI.

---

## III. Cấu trúc Cốt lõi và Quản lý Dự án

### 1. Tệp Claude.md (Bộ não của dự án)
Tệp `Claude.md` là tệp chỉ dẫn được tiêm vào đầu mỗi cuộc hội thoại để định hướng hành vi của AI.
*   **Các cấp độ phân cấp:**
    *   **Global (Toàn cầu):** Nằm trong thư mục nhà (`~/.claude/Claude.md`), áp dụng cho mọi dự án.
    *   **Local (Cục bộ):** Nằm trong thư mục gốc của dự án, định nghĩa quy tắc riêng cho dự án đó.
    *   **Enterprise (Doanh nghiệp):** Các quy tắc hệ thống do tổ chức quản lý.
*   **Lệnh `/init`:** Tự động phân tích mã nguồn hiện có để tạo ra tệp `Claude.md` tóm tắt kiến trúc, quy trình làm việc và các defaults kỹ thuật.

### 2. Thư mục .claude
Chứa các thiết lập nâng cao bao gồm:
*   `/agents`: Các đặc vụ con chuyên biệt.
*   `/skills`: Các kỹ năng tùy chỉnh dưới dạng Markdown.
*   `/rules`: Các quy tắc phân đoạn (Code style, testing, security).

---

## IV. Các Chế độ Phê duyệt (Permission Modes)

Claude Code cung cấp các mức độ kiểm soát khác nhau đối với quyền can thiệp vào hệ thống:

| Chế độ | Đặc điểm |
| :--- | :--- |
| **Ask before edits** | Mặc định. AI phải hỏi ý kiến trước khi thay đổi bất kỳ tệp nào. |
| **Edit automatically** | Tự động chỉnh sửa tệp hiện có nhưng phải hỏi khi tạo tệp mới. |
| **Bypass permissions** | Chế độ nguy hiểm. AI có toàn quyền tạo, sửa, xóa tệp mà không cần hỏi. |
| **Plan mode** | Chế độ chỉ đọc. AI nghiên cứu và lập kế hoạch (spec) mà không thực thi mã. |

---

## V. Quản lý Ngữ cảnh (Context Management)

Ngữ cảnh (Context) là giới hạn bộ nhớ của mô hình AI (thường khoảng 200,000 đến 1,000,000 tokens).

*   **Hiện tượng "Context Rot":** Sự tích tụ của các thông tin thừa làm giảm chất lượng phản hồi.
*   **Lệnh `/context`:** Kiểm tra chi tiết các thành phần đang chiếm dụng bộ nhớ (System prompt, tools, MCP, tin nhắn).
*   **Lệnh `/compact`:** Nén lịch sử hội thoại thành một bản tóm tắt mật độ thông tin cao để giải phóng không gian bộ nhớ.
*   **Lệnh `/cost`:** Kiểm tra chi phí sử dụng token hiện tại.

---

## VI. Kỹ năng (Skills) và Giao thức Ngữ cảnh Mô hình (MCP)

### 1. Kỹ năng (Skills)
Skills là các quy trình làm việc (SOP) được đóng gói dưới dạng tệp Markdown (`.md`) đi kèm với các mã kịch bản (scripts).
*   **Cấu trúc:** Gồm tệp định nghĩa `.md` và thư mục `/scripts` chứa mã thực thi (thường là Python).
*   **Lợi ích:** Chỉ tải phần "Front matter" (mô tả) vào ngữ cảnh ban đầu, giúp tiết kiệm token và tăng độ chính xác.

### 2. Model Context Protocol (MCP)
MCP là giao thức cho phép kết nối Claude Code với các ứng dụng bên thứ ba.
*   **Ví dụ:** Chrome DevTools (điều khiển trình duyệt), ClickUp (quản lý tác vụ), Google Search, Slack.
*   **Lưu ý:** MCP thường chiếm dụng nhiều token hơn so với Skills do phải tải toàn bộ định nghĩa công cụ vào ngữ cảnh.

---

## VII. Câu hỏi Luyện tập (Short-Answer Quiz)

1.  **Lệnh nào được sử dụng để khởi tạo một tệp Claude.md dựa trên việc phân tích mã nguồn hiện tại?**
2.  **Sự khác biệt chính giữa chế độ "Plan mode" và "Bypass permissions" là gì?**
3.  **Tại sao việc sử dụng "Skills" lại tiết kiệm token hơn so với việc đưa mọi hướng dẫn vào "Claude.md"?**
4.  **Chức năng của lệnh `/compact` trong quản lý ngữ cảnh là gì?**
5.  **Tệp `memory.md` khác với `Claude.md` như thế nào về mục đích sử dụng?**
6.  **Làm thế nào để truy cập giao diện dòng lệnh của Claude Code nếu bạn đang sử dụng VS Code?**
7.  **Yêu cầu tối thiểu về gói đăng ký để sử dụng Claude Code là gì?**
8.  **Vòng lặp "Task-Do-Verify" có ý nghĩa gì trong việc xây dựng ứng dụng với Claude?**

---

## VIII. Chủ đề Thảo luận và Tiểu luận (Essay Prompts)

1.  **Phân tích chiến lược quản lý ngữ cảnh:** Hãy giải thích tại sao mật độ thông tin (information density) lại quan trọng hơn độ dài của câu lệnh trong Claude Code. Phân tích tác động của "Context Rot" đến chất lượng đầu ra của AI.
2.  **So sánh Skills và MCP:** Trong trường hợp nào bạn nên tự xây dựng một Kỹ năng (Skill) thay vì sử dụng một máy chủ MCP có sẵn? Hãy dựa trên các yếu tố về chi phí token, bảo mật và độ chính xác.
3.  **Tầm quan trọng của Chế độ Lập kế hoạch (Plan Mode):** Tại sao Nick Saraev lại khẳng định "một phút lập kế hoạch tiết kiệm mười phút xây dựng"? Hãy thảo luận về sự khác biệt giữa việc AI "vibe coding" (mã hóa theo cảm hứng) và thực hiện theo một bản đặc tả (spec) có cấu trúc.

---

## IX. Thuật ngữ Quan trọng (Glossary)

*   **IDE (Integrated Development Environment):** Môi trường phát triển tích hợp, kết hợp trình quản lý tệp, trình chỉnh sửa văn bản và công cụ AI.
*   **Token:** Đơn vị đo lường cơ bản của văn bản mà AI xử lý (tương đương nhưng không hoàn toàn giống với một từ).
*   **Context Window (Cửa sổ ngữ cảnh):** Giới hạn tối đa lượng dữ liệu AI có thể xử lý trong một phiên làm việc.
*   **Front Matter:** Phần thông tin mô tả ở đầu tệp Skill dùng để giới thiệu công cụ cho Claude mà không cần tải toàn bộ mã nguồn.
*   **MCP (Model Context Protocol):** Tiêu chuẩn mở để kết nối các mô hình AI với dữ liệu và công cụ bên thứ ba.
*   **Fast Mode:** Chế độ vận hành nhanh hơn của mô hình (như Opus 4.6), thường đi kèm với chi phí token cao hơn.
*   **Information Density (Mật độ thông tin):** Kỹ thuật viết chỉ dẫn súc tích nhưng chứa đựng tối đa ý nghĩa để tiết kiệm không gian ngữ cảnh.
*   **Subagent (Đặc vụ con):** Một phiên bản Claude độc lập được sinh ra để thực hiện một nhiệm vụ cụ thể với ngữ cảnh riêng biệt.