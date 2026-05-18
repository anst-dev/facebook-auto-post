import json
import os
import requests
from dotenv import load_dotenv

# Path configuration
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
log_path = os.path.join(os.path.dirname(__file__), '..', 'post-log.json')

load_dotenv(dotenv_path)

PAGE_ID = os.getenv("FACEBOOK_PAGE_ID")
ACCESS_TOKEN = os.getenv("FACEBOOK_ACCESS_TOKEN")

if not ACCESS_TOKEN:
    print("Error: ACCESS_TOKEN not found in .env")
    exit(1)

if not os.path.exists(log_path):
    print("Error: post-log.json not found")
    exit(1)

with open(log_path, 'r', encoding='utf-8') as f:
    logs = json.load(f)

scheduled_posts = [log for log in logs if log.get("action") == "schedule" and log.get("status") == "success"]

print(f"Found {len(scheduled_posts)} successfully scheduled posts in logs. Starting deletion...")

deleted_count = 0
failed_count = 0

for post in scheduled_posts:
    post_id = post.get("postId")
    if not post_id:
        continue
    
    url = f"https://graph.facebook.com/v21.0/{post_id}"
    params = {"access_token": ACCESS_TOKEN}
    
    try:
        response = requests.delete(url, params=params)
        res_data = response.json()
        
        if response.status_code == 200 and res_data.get("success"):
            print(f"Successfully deleted post {post_id} (contentId: {post.get('contentId')})")
            deleted_count += 1
        else:
            print(f"Failed to delete post {post_id}: {res_data}")
            failed_count += 1
    except Exception as e:
        print(f"Exception deleting post {post_id}: {e}")
        failed_count += 1

print(f"\nFinished! Deleted: {deleted_count}, Failed: {failed_count}")

# Clear post-log.json to avoid reuse
with open(log_path, 'w', encoding='utf-8') as f:
    json.dump([], f, indent=2)
print("Cleared post-log.json")
