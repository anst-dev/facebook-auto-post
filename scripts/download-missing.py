"""
Download-only script for NotebookLM artifacts.
- Finds all completed posts that are missing media files
- Lists artifacts from notebooks and downloads them
- Matches by type mapping
"""
import subprocess, json, os, sys, time, re
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'content', 'Gen Z Book Reviews')
PROGRESS_FILE = os.path.join(os.path.dirname(__file__), '..', 'content', 'progress.json')

MAX_WORKERS = 3
print_lock = threading.Lock()

def run(cmd, timeout=300):
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, 
                                timeout=timeout, encoding='utf-8', errors='replace')
        return result.stdout.strip(), result.stderr.strip(), result.returncode
    except subprocess.TimeoutExpired:
        return '', 'Timeout', 1
    except Exception as e:
        return '', str(e), 1

def log(msg):
    with print_lock:
        print(msg, flush=True)

DAYS = [
    {"date": "2026-05-17", "theme": "AI-Burst-Pha-Hieu-Suat-Van-Phong", "notebook": "223526eb",
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
     ]},
    {"date": "2026-05-18", "theme": "ChatGPT-Cho-Doanh-Nghiep", "notebook": "399e43bc",
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
     ]},
    {"date": "2026-05-19", "theme": "Claude-Code-Lap-Trinh-Voi-AI", "notebook": "6cf1e4aa",
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
     ]},
    {"date": "2026-05-20", "theme": "Cline-AI-Coding-Agent", "notebook": "74302f18",
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
     ]},
    {"date": "2026-05-21", "theme": "LLM-va-Quan-Ly-Kien-Thuc", "notebook": "6bd18d92",
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
     ]},
    {"date": "2026-05-22", "theme": "Ung-Dung-Thuc-Te-Large-Language-Models", "notebook": "285e5484",
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
     ]},
    {"date": "2026-05-23", "theme": "Agentic-AI-va-Tuong-Lai", "notebook": "01ba7178",
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
     ]},
]

MEDIA_EXTS = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.mp3', '.mp4', '.html', '.md')

def has_media(folder):
    """Check if folder has any media file (not just caption.txt)."""
    if not os.path.exists(folder):
        return False
    for f in os.listdir(folder):
        if any(f.endswith(ext) for ext in MEDIA_EXTS):
            return True
    return False

def get_artifacts_for_notebook(notebook_id):
    """Get all artifacts from a notebook."""
    stdout, stderr, rc = run(f'notebooklm artifact list -n {notebook_id} --json', timeout=60)
    if rc != 0 or not stdout:
        return []
    try:
        # Find JSON in output (may have prefix text)
        json_start = stdout.find('{')
        if json_start >= 0:
            data = json.loads(stdout[json_start:])
            return data.get('artifacts', [])
    except:
        pass
    return []

# Type mappings for matching
TYPE_ID_MAP = {
    "infographic": "infographic",
    "slide-deck": "slide_deck",
    "mind-map": "mind_map",
    "quiz": "quiz",
    "flashcards": "flashcards",
    "data-table": "data_table",
    "report": "report",
}

def download_artifact(artifact_id, ptype, folder, notebook_id):
    """Download an artifact to the folder."""
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
    
    # Syntax: notebooklm download <type> -a <artifact_id> -n <notebook_id> --force <output_path>
    dl_cmds = {
        "infographic": f'notebooklm download infographic -a {artifact_id} -n {notebook_id} --force "{out_file}"',
        "slide-deck": f'notebooklm download slide-deck -a {artifact_id} -n {notebook_id} --force "{out_file}"',
        "mind-map": f'notebooklm download mind-map -a {artifact_id} -n {notebook_id} --force "{out_file}"',
        "quiz": f'notebooklm download quiz -a {artifact_id} -n {notebook_id} --force "{out_file}"',
        "flashcards": f'notebooklm download flashcards -a {artifact_id} -n {notebook_id} --force "{out_file}"',
        "data-table": f'notebooklm download data-table -a {artifact_id} -n {notebook_id} --force "{out_file}"',
        "report": f'notebooklm download report -a {artifact_id} -n {notebook_id} --force "{out_file}"',
    }
    dl_cmd = dl_cmds.get(ptype)
    if not dl_cmd:
        return False, f"Unknown type: {ptype}"
    
    stdout, stderr, rc = run(dl_cmd, timeout=120)
    if rc != 0:
        return False, f"CMD: {dl_cmd}\nSTDERR: {stderr[:300]}\nSTDOUT: {stdout[:300]}"
    return True, stdout[:100]

def process_day(day_data):
    """Process one day: get artifacts and download missing media."""
    notebook = day_data["notebook"]
    date = day_data["date"]
    theme = day_data["theme"]
    
    log(f"\n{'='*50}")
    log(f"Day: {date} | Theme: {theme}")
    log(f"Getting artifacts from notebook: {notebook}...")
    
    artifacts = get_artifacts_for_notebook(notebook)
    log(f"Found {len(artifacts)} artifacts")
    
    if not artifacts:
        log(f"  WARNING: No artifacts found for {notebook}")
        return
    
    # Group artifacts by type_id
    artifacts_by_type = {}
    for art in artifacts:
        type_id = art.get('type_id', '')
        if type_id not in artifacts_by_type:
            artifacts_by_type[type_id] = []
        artifacts_by_type[type_id].append(art)
    
    results = {"downloaded": 0, "skipped": 0, "failed": 0}
    
    for post in day_data["posts"]:
        post_id = post["id"]
        ptype = post["type"]
        folder_type = "kienthuc" if ptype in ("quiz", "flashcards") else "content"
        folder = os.path.join(BASE_DIR, date, theme, folder_type, post_id)
        
        # Check if media already exists
        if has_media(folder):
            log(f"  [{post_id}] SKIP — media already exists")
            results["skipped"] += 1
            continue
        
        # Find matching artifact
        target_type_id = TYPE_ID_MAP.get(ptype)
        available = artifacts_by_type.get(target_type_id, [])
        
        if not available:
            log(f"  [{post_id}] No {target_type_id} artifact available — will regenerate")
            results["failed"] += 1
            continue
        
        # Use most recent completed artifact
        completed = [a for a in available if a.get('status_id', 0) == 3]
        if not completed:
            log(f"  [{post_id}] No completed {target_type_id} artifact")
            results["failed"] += 1
            continue
        
        # Pick the most recent one (sorted by created_at desc)
        completed.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        artifact = completed[0]
        artifact_id = artifact['id']
        artifact_title = artifact.get('title', '?')
        
        log(f"  [{post_id}] Downloading {ptype}: {artifact_title[:50]}...")
        os.makedirs(folder, exist_ok=True)
        
        ok, msg = download_artifact(artifact_id, ptype, folder, notebook)
        if ok:
            # Verify media was saved
            if has_media(folder):
                log(f"  [{post_id}] ✓ Downloaded successfully")
                results["downloaded"] += 1
                # Remove from available to avoid reuse
                artifacts_by_type[target_type_id].remove(artifact)
            else:
                log(f"  [{post_id}] ⚠ Download ran but no media found: {msg}")
                results["failed"] += 1
        else:
            log(f"  [{post_id}] ✗ Download failed: {msg}")
            results["failed"] += 1
        
        time.sleep(1)
    
    log(f"\n  Day {date} result: ✓{results['downloaded']} downloaded, ⊘{results['skipped']} skipped, ✗{results['failed']} failed")
    return results

def main():
    print("=" * 60)
    print("  NOTEBOOKLM DOWNLOAD-ONLY MODE")
    print("  Downloads missing media for all 70 posts")
    print("=" * 60)
    
    # Check which posts need download
    missing = []
    for day_data in DAYS:
        for post in day_data["posts"]:
            ptype = post["type"]
            folder_type = "kienthuc" if ptype in ("quiz", "flashcards") else "content"
            folder = os.path.join(BASE_DIR, day_data["date"], day_data["theme"], folder_type, post["id"])
            if not has_media(folder):
                missing.append((day_data["date"], post["id"], ptype))
    
    print(f"\nPosts missing media: {len(missing)}/70")
    for date, pid, ptype in missing:
        print(f"  - {pid} ({ptype}) [{date}]")
    
    if not missing:
        print("\nAll posts already have media! Nothing to download.")
        return
    
    print(f"\nStarting download for {len(missing)} posts...")
    print("Processing day by day...\n")
    
    total_downloaded = 0
    total_failed = 0
    need_regen = []
    
    for day_data in DAYS:
        results = process_day(day_data)
        if results:
            total_downloaded += results.get("downloaded", 0)
            total_failed += results.get("failed", 0)
    
    print("\n" + "=" * 60)
    print(f"  DOWNLOAD COMPLETE")
    print(f"  Downloaded: {total_downloaded}")
    print(f"  Failed/Need regen: {total_failed}")
    print("=" * 60)
    
    # Show final status
    still_missing = []
    for day_data in DAYS:
        for post in day_data["posts"]:
            ptype = post["type"]
            folder_type = "kienthuc" if ptype in ("quiz", "flashcards") else "content"
            folder = os.path.join(BASE_DIR, day_data["date"], day_data["theme"], folder_type, post["id"])
            if not has_media(folder):
                still_missing.append(post["id"])
    
    if still_missing:
        print(f"\nStill missing ({len(still_missing)}): {', '.join(still_missing)}")
        print("These will need to be regenerated (run notebooklm-batch.py)")
    else:
        print("\n✓ All 70 posts now have media files!")

if __name__ == "__main__":
    main()
