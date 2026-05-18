"""
NotebookLM Batch Content Generator v2 - PARALLEL execution
- 7 days x 10 posts = 70 posts
- Runs 5 posts in parallel for speed
- Vietnamese language + sans-serif fonts
- Progress tracked in progress.json
"""
import subprocess, json, os, sys, time, re, shutil
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'content', 'Gen Z Book Reviews')
PROGRESS_FILE = os.path.join(os.path.dirname(__file__), '..', 'content', 'progress.json')
DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), '..', 'tmp')

MAX_WORKERS = 5  # 5 parallel threads
progress_lock = threading.Lock()

def run(cmd, timeout=600):
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout, encoding='utf-8', errors='replace')
        return result.stdout.strip(), result.stderr.strip(), result.returncode
    except subprocess.TimeoutExpired:
        return '', 'Timeout', 1
    except Exception as e:
        return '', str(e), 1

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"completed": [], "failed": [], "total": 70}

def save_progress(progress):
    with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
        json.dump(progress, f, indent=2, ensure_ascii=False)

LOG_FILE = os.path.join(os.path.dirname(__file__), '..', 'content', 'generation_log.txt')

def write_log(message):
    with progress_lock:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(message + '\n')

FONT_INSTRUCTION = " IMPORTANT: Use only sans-serif fonts like Roboto, Arial, or Noto Sans. Never use serif fonts. This is critical for Vietnamese diacritical marks to display correctly."

HASHTAGS_MAP = {
    "d1": "#AI #TríTuệNhânTạo #NăngSuất #VănPhòng #CôngNghệ #AITips #ChatGPT #Claude #Gemini #GenZ",
    "d2": "#ChatGPT #DoanhNghiệp #AI #BusinessAI #TựĐộngHóa #PromptEngineering #CôngNghệ #GenZ #ViệtNam",
    "d3": "#ClaudeCode #AI #LậpTrình #Coding #AICoding #CôngNghệ #GenZ #Developer #Programming",
    "d4": "#Cline #AI #LậpTrình #VSCoder #AIAgent #Coding #CôngNghệ #Developer #GenZ",
    "d5": "#LLM #AI #GPT #Claude #KiếnThức #DeepLearning #Karpathy #CôngNghệ #GenZ",
    "d6": "#LLM #AI #ỨngDụngAI #CôngNghệ #ThựcTiễn #GenZ #ViệtNam #TựĐộngHóa",
    "d7": "#AgenticAI #AIAgent #AI #TựĐộngHóa #TươngLai #CôngNghệ #GenZ #Developer",
}

THEME_NAMES = {
    "AI-Burst-Pha-Hieu-Suat-Van-Phong": "AI Bứt Phá Hiệu Suất Văn Phòng",
    "ChatGPT-Cho-Doanh-Nghiep": "ChatGPT Cho Doanh Nghiệp",
    "Claude-Code-Lap-Trinh-Voi-AI": "Claude Code - Lập Trình Với AI",
    "Cline-AI-Coding-Agent": "Cline AI Coding Agent",
    "LLM-va-Quan-Ly-Kien-Thuc": "LLM và Quản Lý Kiến Thức",
    "Ung-Dung-Thuc-Te-Large-Language-Models": "Ứng Dụng Thực Tế Large Language Models",
    "Agentic-AI-va-Tuong-Lai": "Agentic AI và Tương Lai",
}

DAYS = [
    {
        "date": "2026-05-18", "theme": "AI-Burst-Pha-Hieu-Suat-Van-Phong", "notebook": "223526eb",
        "posts": [
            {"id": "d1p01", "type": "infographic", "desc": "5 công cụ AI miễn phí giúp tăng năng suất văn phòng gấp đôi"},
            {"id": "d1p02", "type": "infographic", "desc": "So sánh ChatGPT vs Claude vs Gemini cho công việc văn phòng"},
            {"id": "d1p03", "type": "infographic", "desc": "Quy trình 4 bước áp dụng AI vào công việc hàng ngày"},
            {"id": "d1p04", "type": "report", "format": "blog-post", "desc": "Hướng dẫn chi tiết dùng AI viết email, báo cáo, tóm tắt cuộc họp"},
            {"id": "d1p05", "type": "report", "format": "blog-post", "desc": "10 prompt ChatGPT hiệu quả nhất cho dân văn phòng Việt Nam"},
            {"id": "d1p06", "type": "slide-deck", "desc": "Slide: Bứt phá hiệu suất với AI - Từ mới bắt đầu đến nâng cao"},
            {"id": "d1p07", "type": "mind-map", "desc": "Sơ đồ tư duy: Hệ sinh thái AI cho dân văn phòng"},
            {"id": "d1p08", "type": "quiz", "desc": "Quiz: Bạn đã biết dùng AI trong công việc chưa? 10 câu hỏi trắc nghiệm"},
            {"id": "d1p09", "type": "report", "format": "briefing-doc", "desc": "Tóm tắt nhanh: Xu hướng AI văn phòng 2026"},
            {"id": "d1p10", "type": "flashcards", "desc": "Flashcard: 15 thuật ngữ AI cần biết cho người đi làm"},
        ]
    },
    {
        "date": "2026-05-19", "theme": "ChatGPT-Cho-Doanh-Nghiep", "notebook": "399e43bc",
        "posts": [
            {"id": "d2p01", "type": "infographic", "desc": "10 cách doanh nghiệp Việt Nam dùng ChatGPT tiết kiệm 50% thời gian"},
            {"id": "d2p02", "type": "infographic", "desc": "Ma trận so sánh: ChatGPT dùng cho bộ phận nào trong công ty"},
            {"id": "d2p03", "type": "infographic", "desc": "Lộ trình 30 ngày triển khai ChatGPT cho doanh nghiệp nhỏ"},
            {"id": "d2p04", "type": "report", "format": "blog-post", "desc": "Case study: Doanh nghiệp Việt dùng AI tăng doanh thu 200%"},
            {"id": "d2p05", "type": "report", "format": "blog-post", "desc": "Hướng dẫn tạo Custom GPT cho nghiệp vụ cụ thể của công ty"},
            {"id": "d2p06", "type": "slide-deck", "desc": "Slide: Ứng dụng ChatGPT trong thiết kế và vận hành doanh nghiệp"},
            {"id": "d2p07", "type": "mind-map", "desc": "Sơ đồ tư duy: Chiến lược AI toàn diện cho doanh nghiệp"},
            {"id": "d2p08", "type": "quiz", "desc": "Quiz: Đánh giá mức độ sẵn sàng áp dụng AI của doanh nghiệp bạn"},
            {"id": "d2p09", "type": "report", "format": "study-guide", "desc": "Học sâu: Prompt engineering nâng cao cho business"},
            {"id": "d2p10", "type": "data-table", "desc": "Bảng so sánh chi tiết các gói ChatGPT và mức phù hợp cho doanh nghiệp"},
        ]
    },
    {
        "date": "2026-05-20", "theme": "Claude-Code-Lap-Trinh-Voi-AI", "notebook": "6cf1e4aa",
        "posts": [
            {"id": "d3p01", "type": "infographic", "desc": "Claude Code vs Copilot vs Cursor: So sánh 3 AI coding tool hàng đầu"},
            {"id": "d3p02", "type": "infographic", "desc": "5 dự án bạn có thể build trong 1 ngày với Claude Code"},
            {"id": "d3p03", "type": "infographic", "desc": "Workflow lập trình với AI: Từ ý tưởng đến sản phẩm trong 4 bước"},
            {"id": "d3p04", "type": "report", "format": "blog-post", "desc": "Hướng dẫn từ zero: Dùng Claude Code tạo app đầu tiên và kiếm tiền"},
            {"id": "d3p05", "type": "report", "format": "blog-post", "desc": "10 kỹ thuật prompt hiệu quả nhất cho lập trình với Claude"},
            {"id": "d3p06", "type": "slide-deck", "desc": "Slide: Claude Code Full Course - Build and Sell 2026"},
            {"id": "d3p07", "type": "mind-map", "desc": "Sơ đồ tư duy: Hệ sinh thái Claude Code và các extension"},
            {"id": "d3p08", "type": "quiz", "desc": "Quiz: Kiểm tra kiến thức AI coding của bạn - 10 câu hỏi"},
            {"id": "d3p09", "type": "report", "format": "briefing-doc", "desc": "Tổng quan Claude Code 2026: Tính năng mới và cập nhật"},
            {"id": "d3p10", "type": "report", "format": "study-guide", "desc": "Lộ trình học AI coding từ beginner đến professional"},
        ]
    },
    {
        "date": "2026-05-21", "theme": "Cline-AI-Coding-Agent", "notebook": "74302f18",
        "posts": [
            {"id": "d4p01", "type": "infographic", "desc": "Cline AI: Trợ lý lập trình tự chủ trong VS Code - 7 tính năng standout"},
            {"id": "d4p02", "type": "infographic", "desc": "So sánh Cline vs GitHub Copilot vs Cursor: Đâu là best AI coder?"},
            {"id": "d4p03", "type": "infographic", "desc": "Quy trình debug code với Cline AI trong 3 phút"},
            {"id": "d4p04", "type": "report", "format": "blog-post", "desc": "Cài đặt và cấu hình Cline AI tối ưu cho dự án thực tế"},
            {"id": "d4p05", "type": "report", "format": "blog-post", "desc": "Từ tay trắng đến senior dev với Cline AI - Hành trình 30 ngày"},
            {"id": "d4p06", "type": "slide-deck", "desc": "Slide: Đại lý lập trình tự chủ - Tương lai của software engineering"},
            {"id": "d4p07", "type": "mind-map", "desc": "Sơ đồ tư duy: Kiến trúc Cline AI và cách hoạt động"},
            {"id": "d4p08", "type": "quiz", "desc": "Quiz: Bạn hiểu bao nhiêu về AI coding agents?"},
            {"id": "d4p09", "type": "report", "format": "briefing-doc", "desc": "Cline vs alternatives: Phân tích chi tiết thị trường AI dev tools"},
            {"id": "d4p10", "type": "report", "format": "study-guide", "desc": "Học sâu: Xây dựng plugin và extension cho Cline AI"},
        ]
    },
    {
        "date": "2026-05-22", "theme": "LLM-va-Quan-Ly-Kien-Thuc", "notebook": "6bd18d92",
        "posts": [
            {"id": "d5p01", "type": "infographic", "desc": "LLM hoạt động như thế nào? Giải thích đơn giản cho người mới"},
            {"id": "d5p02", "type": "infographic", "desc": "7 kỹ thuật prompt engineering hiệu quả nhất theo Andrej Karpathy"},
            {"id": "d5p03", "type": "infographic", "desc": "Mô hình ngôn ngữ lớn: Từ GPT-1 đến GPT-5 - Timeline tiến hóa"},
            {"id": "d5p04", "type": "report", "format": "blog-post", "desc": "Cách xây dựng hệ thống quản lý kiến thức cá nhân bằng AI và LLM"},
            {"id": "d5p05", "type": "report", "format": "blog-post", "desc": "RAG, Fine-tuning, Prompt Engineering: Khi nào dùng cái nào?"},
            {"id": "d5p06", "type": "slide-deck", "desc": "Slide: Quản lý kiến thức theo mô hình LLM Wiki của Karpathy"},
            {"id": "d5p07", "type": "mind-map", "desc": "Sơ đồ tư duy: Kiến trúc Transformer và cách LLM xử lý ngôn ngữ"},
            {"id": "d5p08", "type": "quiz", "desc": "Quiz: Bạn có phải chuyên gia LLM không? 10 câu hỏi thử thách"},
            {"id": "d5p09", "type": "report", "format": "briefing-doc", "desc": "Tóm tắt nhanh: Xu hướng LLM 2026 theo góc nhìn Karpathy"},
            {"id": "d5p10", "type": "data-table", "desc": "Bảng so sánh: Top 10 LLM hiện nay - GPT, Claude, Gemini, Llama, Mistral"},
        ]
    },
    {
        "date": "2026-05-23", "theme": "Ung-Dung-Thuc-Te-Large-Language-Models", "notebook": "285e5484",
        "posts": [
            {"id": "d6p01", "type": "infographic", "desc": "15 ứng dụng thực tế của LLM mà bạn chưa biết"},
            {"id": "d6p02", "type": "infographic", "desc": "LLM trong y tế, giáo dục, tài chính - Đâu là lĩnh vực tiềm năng nhất?"},
            {"id": "d6p03", "type": "infographic", "desc": "ROI của AI: Số liệu chứng minh LLM mang lại giá trị kinh doanh"},
            {"id": "d6p04", "type": "report", "format": "blog-post", "desc": "Xây dựng chatbot khách hàng thông minh với LLM - Hướng dẫn A-Z"},
            {"id": "d6p05", "type": "report", "format": "blog-post", "desc": "Tự động hóa xử lý tài liệu với AI: Từ PDF đến database trong phút"},
            {"id": "d6p06", "type": "slide-deck", "desc": "Slide: Ứng dụng thực tế Large Language Models trong đời sống"},
            {"id": "d6p07", "type": "mind-map", "desc": "Sơ đồ tư duy: Bản đồ ứng dụng LLM trên mọi ngành nghề"},
            {"id": "d6p08", "type": "quiz", "desc": "Quiz: Đoán xem AI nào đã làm việc này? Trắc nghiệm thú vị"},
            {"id": "d6p09", "type": "report", "format": "study-guide", "desc": "Học sâu: Tối ưu hóa LLM cho tiếng Việt - Thách thức và giải pháp"},
            {"id": "d6p10", "type": "report", "format": "briefing-doc", "desc": "Báo cáo nhanh: Ứng dụng LLM tại Việt Nam 2026 - Cơ hội và thách thức"},
        ]
    },
    {
        "date": "2026-05-24", "theme": "Agentic-AI-va-Tuong-Lai", "notebook": "01ba7178",
        "posts": [
            {"id": "d7p01", "type": "infographic", "desc": "Agentic AI là gì? Tương lai của tự động hóa thông minh"},
            {"id": "d7p02", "type": "infographic", "desc": "AI Agent vs AI Chatbot: Sự khác biệt và khi nào nên dùng"},
            {"id": "d7p03", "type": "infographic", "desc": "5 AI Agent framework mạnh nhất 2026: LangChain, CrewAI, AutoGen..."},
            {"id": "d7p04", "type": "report", "format": "blog-post", "desc": "Xây dựng AI Agent tự động đăng bài Facebook trong 30 phút"},
            {"id": "d7p05", "type": "report", "format": "blog-post", "desc": "Multi-Agent Systems: Khi nhiều AI hợp tác với nhau - Xu hướng mới"},
            {"id": "d7p06", "type": "slide-deck", "desc": "Slide: Agentic AI Coding Patterns - Kiến trúc và thực hành tốt nhất"},
            {"id": "d7p07", "type": "mind-map", "desc": "Sơ đồ tư duy: Hệ sinh thái Agentic AI và các use case"},
            {"id": "d7p08", "type": "quiz", "desc": "Quiz: Agentic AI - Bạn đang ở mức nào? 10 câu hỏi đánh giá"},
            {"id": "d7p09", "type": "report", "format": "briefing-doc", "desc": "Tổng quan 2026: Autonomous AI agents đang thay đổi ngành phần mềm"},
            {"id": "d7p10", "type": "report", "format": "study-guide", "desc": "Lộ trình trở thành AI Agent Developer - Từ newbie đến expert"},
        ]
    },
]

def process_single_post(args):
    """Process one post - designed for parallel execution."""
    day_data, post = args
    post_id = post["id"]
    notebook = day_data["notebook"]
    ptype = post["type"]
    desc = post["desc"] + FONT_INSTRUCTION

    folder_type = "kienthuc" if ptype in ("quiz", "flashcards") else "content"
    folder = os.path.join(BASE_DIR, day_data["date"], day_data["theme"], folder_type, post_id)
    os.makedirs(folder, exist_ok=True)

    log_prefix = f"[{post_id}]"

    # --- TẠO CAPTION TRƯỚC TIÊN ĐỂ ĐẢM BẢO LUÔN CÓ CAPTION ---
    day_num = int(post_id[1:2])
    day_key = f"d{day_num}"
    hashtags = HASHTAGS_MAP.get(day_key, "#AI #CôngNghệ #GenZ")

    type_labels = {
        "infographic": "📸 INFOGRAPHIC",
        "report": "📝 BÀI VIẾT",
        "slide-deck": "📑 SLIDE",
        "mind-map": "🗺️ SƠ ĐỒ TƯ DUY",
        "quiz": "🧠 QUIZ",
        "flashcards": "🎴 FLASHCARD",
        "data-table": "📊 BẢNG SỐ LIỆU",
    }
    label = type_labels.get(ptype, "📌 NỘI DUNG")

    # Generate storytelling caption using ask
    print(f"{log_prefix} Generating storytelling caption...")
    # Use post['desc'] without FONT_INSTRUCTION to avoid <div> tags in prompt
    clean_desc = post['desc']
    ask_cmd = f'notebooklm ask "Viết một status Facebook xưng tôi, chia sẻ ngắn gọn 1-2 đoạn kể chuyện mộc mạc không dùng markdown về chủ đề: {clean_desc}" -n {notebook}'
    story_out, _, ask_rc = run(ask_cmd, timeout=120)
    
    if ask_rc == 0 and story_out:
        # Clean footnotes like [1], [1, 2] and matched info
        story_out = re.sub(r'\[[\d,\s]+\]', '', story_out)
        story_out = re.sub(r'(?m)^(Matched:|Continuing conversation|Answer:|Resumed conversation:).*?\n', '', story_out + '\n').strip()
        # Clean rogue div tags
        story_out = re.sub(r'</?div[^>]*>', '', story_out).strip()
    else:
        story_out = ""

    theme_display = THEME_NAMES.get(day_data['theme'], day_data['theme'].replace('-', ' '))

    caption = f"""{label}
{post['desc']}

📌 Chủ đề: {theme_display}
"""
    if story_out:
        caption += f"\n{'─' * 30}\n\n{story_out}\n"
        
    caption += f"\n{hashtags}\n"

    with open(os.path.join(folder, "caption.txt"), 'w', encoding='utf-8') as f:
        f.write(caption)

    # Build generate command
    if ptype == "infographic":
        cmd = f'notebooklm generate infographic "{desc}" -n {notebook} --language vi --wait --retry 3 --json'
    elif ptype == "slide-deck":
        cmd = f'notebooklm generate slide-deck "{desc}" -n {notebook} --language vi --wait --retry 3 --json'
    elif ptype == "mind-map":
        cmd = f'notebooklm generate mind-map -n {notebook} --json'
    elif ptype == "quiz":
        cmd = f'notebooklm generate quiz "{desc}" -n {notebook} --json'
    elif ptype == "flashcards":
        cmd = f'notebooklm generate flashcards "{desc}" -n {notebook} --json'
    elif ptype == "data-table":
        cmd = f'notebooklm generate data-table "{desc}" -n {notebook} --json'
    elif ptype == "report":
        fmt = post.get("format", "blog-post")
        cmd = f'notebooklm generate report --format {fmt} "{desc}" -n {notebook} --language vi --wait --retry 3 --json'
    else:
        cmd = f'notebooklm generate report "{desc}" -n {notebook} --language vi --wait --retry 3 --json'

    print(f"{log_prefix} Generating ({ptype})...")
    stdout, stderr, rc = run(cmd, timeout=600)

    artifact_id = None
    direct_content = None
    if rc == 0 and stdout:
        try:
            # find json array or object in stdout
            match_json = re.search(r'(\{.*\}|\[.*\])', stdout, re.DOTALL)
            if match_json:
                data = json.loads(match_json.group(1))
                artifact_id = data.get("id") or data.get("artifact_id") or data.get("task_id")
                if not artifact_id:
                    direct_content = match_json.group(1)
        except:
            pass
        
        if not artifact_id and not direct_content:
            match = re.search(r'"(?:id|artifact_id|task_id)":\s*"([^"]+)"', stdout)
            if match:
                artifact_id = match.group(1)
    
    if not artifact_id and not direct_content:
        raise Exception(f"Failed to generate artifact. RC={rc}. Stderr: {stderr[:200]} Stdout: {stdout[:200]}")

    # Build output path
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
    out_file = os.path.join(folder, f"artifact{ext}")

    # Download if we got an artifact
    has_media = False
    if direct_content:
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(direct_content)
        print(f"{log_prefix} Saved direct content to {out_file}")
    elif artifact_id:
        # Wait for artifact to be ready
        print(f"{log_prefix} Waiting for artifact to be ready...")
        run(f'notebooklm artifact wait {artifact_id} --timeout 120', timeout=180)

        fmt_opt = "--format markdown" if ext == ".md" else ""
        if ext == ".csv": fmt_opt = "--format csv"

        dl_cmds = {
            "infographic": f'notebooklm download infographic -a {artifact_id} -n {notebook} "{out_file}"',
            "slide-deck": f'notebooklm download slide-deck -a {artifact_id} -n {notebook} "{out_file}"',
            "mind-map": f'notebooklm download mind-map -a {artifact_id} -n {notebook} "{out_file}"',
            "quiz": f'notebooklm download quiz -a {artifact_id} -n {notebook} {fmt_opt} "{out_file}"',
            "flashcards": f'notebooklm download flashcards -a {artifact_id} -n {notebook} {fmt_opt} "{out_file}"',
            "data-table": f'notebooklm download data-table -a {artifact_id} -n {notebook} {fmt_opt} "{out_file}"',
            "report": f'notebooklm download report -a {artifact_id} -n {notebook} {fmt_opt} "{out_file}"',
        }
        dl_cmd = dl_cmds.get(ptype)
        if dl_cmd:
            print(f"{log_prefix} Downloading...")
            dl_out, dl_err, dl_rc = run(dl_cmd, timeout=300)
            if dl_rc != 0:
                print(f"{log_prefix} Download error: {dl_err[:200]}")
            time.sleep(2)

        # Check for media files
        for f in os.listdir(folder):
            if any(f.endswith(ext) for ext in ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.mp3', '.mp4')):
                has_media = True
                print(f"{log_prefix} Media found: {f}")
                break

    status = "DONE" if has_media else ("DONE (text)" if artifact_id else "TEXT_ONLY")
    log_msg = f"{time.strftime('%Y-%m-%d %H:%M:%S')} {log_prefix} {status} - Format: {ptype} - Saved to: {folder}"
    write_log(log_msg)
    print(log_msg)

    return post_id, has_media, artifact_id is not None

def main():
    print("=" * 60)
    print("  NOTEBOOKLM BATCH v2 - PARALLEL")
    print(f"  7 days x 10 posts = 70 posts | {MAX_WORKERS} threads")
    print("=" * 60)

    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    progress = load_progress()
    completed_ids = set(progress["completed"])

    # Collect all posts that need processing
    all_tasks = []
    for day_data in DAYS:
        for post in day_data["posts"]:
            if post["id"] not in completed_ids:
                all_tasks.append((day_data, post))

    print(f"\nRemaining: {len(all_tasks)} posts")
    print(f"Already done: {len(completed_ids)} posts\n")

    if not all_tasks:
        print("All 70 posts already completed!")
        return

    # Process in parallel batches
    done = 0
    failed = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(process_single_post, task): task for task in all_tasks}

        for future in as_completed(futures):
            task = futures[future]
            post_id = task[1]["id"]
            try:
                pid, has_media, had_artifact = future.result()
                with progress_lock:
                    if pid not in progress["completed"]:
                        progress["completed"].append(pid)
                    save_progress(progress)
                done += 1
            except Exception as e:
                fail_msg = f"{time.strftime('%Y-%m-%d %H:%M:%S')} [{post_id}] FAILED: {e}"
                print(fail_msg)
                write_log(fail_msg)
                with progress_lock:
                    if post_id not in progress["failed"]:
                        progress["failed"].append(post_id)
                    save_progress(progress)
                failed += 1

            total_done = done + failed
            print(f"\n  Progress: {total_done}/{len(all_tasks)} ({done} ok, {failed} fail) | Total: {len(completed_ids) + total_done}/70\n")

    # Final
    progress = load_progress()
    print("\n" + "=" * 60)
    print(f"  COMPLETED: {len(progress['completed'])}/70")
    print(f"  FAILED: {len(progress['failed'])}")
    if progress['failed']:
        print(f"  Failed: {', '.join(progress['failed'])}")
    print("=" * 60)

if __name__ == "__main__":
    main()
