"""
NotebookLM Login v7 - Carefully kill Chrome, relaunch with debugging, capture cookies.
"""
import os, sys, time, json, subprocess, urllib.request

sys.stdout.reconfigure(encoding='utf-8')

PROFILE_DIR = os.path.expanduser("~/.notebooklm/profiles/default")
STORAGE_FILE = os.path.join(PROFILE_DIR, "storage_state.json")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA = r"C:\Users\Administrator\AppData\Local\Google\Chrome\User Data"
PORT = 9222

def main():
    os.makedirs(PROFILE_DIR, exist_ok=True)

    # Step 1: Kill ALL Chrome processes thoroughly
    print("Step 1: Closing ALL Chrome processes...")
    for attempt in range(3):
        subprocess.run("taskkill /f /im chrome.exe /t", shell=True, stderr=subprocess.DEVNULL)
        time.sleep(2)
        result = subprocess.run("tasklist /fi \"imagename eq chrome.exe\"", shell=True, capture_output=True, text=True)
        if "chrome.exe" not in result.stdout:
            print("  All Chrome processes killed.")
            break
        print(f"  Attempt {attempt+1}: Chrome still running, retrying...")
    else:
        print("  WARNING: Chrome may still be running!")

    time.sleep(3)

    # Step 2: Launch Chrome with debugging
    print("\nStep 2: Launching Chrome (Profile 3) with debugging port 9222...")
    proc = subprocess.Popen([
        CHROME,
        f"--user-data-dir={USER_DATA}",
        "--profile-directory=Profile 3",
        f"--remote-debugging-port={PORT}",
        "--no-first-run",
        "--no-default-browser-check",
        "https://notebooklm.google.com/"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Step 3: Poll CDP until ready
    print("\nStep 3: Waiting for CDP...")
    cdp_ready = False
    for i in range(40):
        time.sleep(2)
        try:
            resp = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/version", timeout=2)
            info = json.loads(resp.read())
            print(f"  CDP ready! Browser: {info.get('Browser', '?')}")
            cdp_ready = True
            break
        except:
            if (i + 1) % 5 == 0:
                print(f"  [{(i+1)*2}s] still waiting...")
                # Check if chrome is running
                r = subprocess.run("tasklist /fi \"imagename eq chrome.exe\"", shell=True, capture_output=True, text=True)
                if "chrome.exe" in r.stdout:
                    print(f"  Chrome is running but CDP not available")
                else:
                    print(f"  Chrome is NOT running!")

    if not cdp_ready:
        print("\nCDP failed. Chrome might not have started with debugging port.")
        print("Checking if port 9222 is in use...")
        subprocess.run(f"netstat -ano | findstr {PORT}", shell=True)
        return

    # Step 4: Connect via Playwright
    print("\nStep 4: Connecting via CDP...")
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(f"http://127.0.0.1:{PORT}")
        ctx = browser.contexts[0] if browser.contexts else None

        if not ctx:
            print("No context!")
            browser.close()
            return

        print(f"Pages: {len(ctx.pages)}")
        for pg in ctx.pages:
            print(f"  {pg.url[:80]}")

        # Wait for NotebookLM
        print("\nWaiting for NotebookLM...")
        for i in range(30):
            for pg in ctx.pages:
                if "notebooklm.google.com" in pg.url and "accounts" not in pg.url:
                    time.sleep(3)
                    cookies = ctx.cookies()
                    names = [c["name"] for c in cookies]

                    if "SID" in names:
                        ctx.storage_state(path=STORAGE_FILE)
                        print(f"\nSUCCESS!")
                        print(f"  Cookies: {len(cookies)}")
                        print(f"  SID: YES")
                        print(f"  Saved: {STORAGE_FILE}")
                        browser.close()
                        return
                    else:
                        print(f"  On NotebookLM but no SID yet, waiting...")
            time.sleep(2)

        # Last resort save
        try:
            cookies = ctx.cookies()
            ctx.storage_state(path=STORAGE_FILE)
            print(f"\nSaved {len(cookies)} cookies")
        except Exception as e:
            print(f"Error: {e}")
        browser.close()

if __name__ == "__main__":
    main()
